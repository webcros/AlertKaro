'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

// Leaflet types
declare global {
    interface Window {
        L: typeof import('leaflet');
    }
}

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    status: string;
    priority: string;
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    created_at: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
    user: {
        full_name: string;
    };
}

interface Category {
    id: string;
    name: string;
    color: string;
}

export default function PoliceMapPage() {
    const router = useRouter();
    const supabase = createClient();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string>('unresolved');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

    // Load Leaflet CSS and JS
    useEffect(() => {
        const loadLeaflet = async () => {
            // Add Leaflet CSS
            if (!document.querySelector('link[href*="leaflet"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
                link.crossOrigin = '';
                document.head.appendChild(link);
            }

            // Add Leaflet JS
            if (!window.L) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
                script.crossOrigin = '';
                script.onload = () => setMapLoaded(true);
                document.head.appendChild(script);
            } else {
                setMapLoaded(true);
            }
        };

        loadLeaflet();
    }, []);

    useEffect(() => {
        async function checkAccess() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('full_name, role')
                .eq('id', user.id)
                .single();

            if (!profileData || !['police', 'admin'].includes(profileData.role)) {
                router.push('/dashboard');
                return;
            }

            setProfile(profileData);
            loadData();
        }

        checkAccess();
    }, [supabase, router]);

    async function loadData() {
        try {
            // Load categories
            const { data: catData } = await supabase
                .from('categories')
                .select('id, name, color')
                .eq('is_active', true);

            if (catData) setCategories(catData);

            // Build query for incidents with location data
            let query = supabase
                .from('incidents')
                .select(`
                    id,
                    tracking_id,
                    title,
                    status,
                    priority,
                    latitude,
                    longitude,
                    address,
                    created_at,
                    user:profiles!incidents_user_id_fkey(full_name),
                    category:categories(name, icon, color)
                `)
                .not('latitude', 'is', null)
                .not('longitude', 'is', null)
                .order('created_at', { ascending: false });

            // Apply status filter
            if (statusFilter === 'unresolved') {
                query = query.neq('status', 'resolved');
            } else if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            // Apply category filter
            if (categoryFilter !== 'all') {
                query = query.eq('category_id', categoryFilter);
            }

            const { data: incidentData } = await query;

            if (incidentData) {
                setIncidents(incidentData as unknown as Incident[]);
            }

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Reload data when filters change
    useEffect(() => {
        if (profile) {
            loadData();
        }
    }, [statusFilter, categoryFilter]);

    // Initialize map when Leaflet is loaded and data is ready
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !window.L) return;

        // If map already exists, just update markers
        if (mapInstanceRef.current) {
            updateMarkers();
            return;
        }

        // Initialize map centered on India
        const map = window.L.map(mapRef.current).setView([20.5937, 78.9629], 5);

        // Add tile layer (OpenStreetMap)
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(map);

        mapInstanceRef.current = map;
        updateMarkers();

    }, [mapLoaded, loading]);

    // Update markers when incidents change
    useEffect(() => {
        if (mapInstanceRef.current && mapLoaded) {
            updateMarkers();
        }
    }, [incidents]);

    function updateMarkers() {
        const L = window.L;
        const map = mapInstanceRef.current;
        if (!map || !L) return;

        // Clear existing markers
        markersRef.current.forEach(marker => map.removeLayer(marker));
        markersRef.current = [];

        // Add new markers
        const bounds: [number, number][] = [];

        incidents.forEach((incident) => {
            if (incident.latitude && incident.longitude) {
                bounds.push([incident.latitude, incident.longitude]);

                // Create custom icon based on status
                const color = getStatusColor(incident.status);
                const icon = L.divIcon({
                    className: styles.customMarker,
                    html: `
                        <div class="${styles.markerPin}" style="--marker-color: ${color}">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                        </div>
                    `,
                    iconSize: [40, 50],
                    iconAnchor: [20, 50],
                    popupAnchor: [0, -50]
                });

                const marker = L.marker([incident.latitude, incident.longitude], { icon })
                    .addTo(map);

                // Create popup content
                const popupContent = `
                    <div class="${styles.popupContent}">
                        <div class="${styles.popupHeader}">
                            <span class="${styles.popupTrackingId}">#${incident.tracking_id}</span>
                            <span class="${styles.popupStatus}" style="background: ${getStatusBg(incident.status)}; color: ${color}">
                                ${getStatusLabel(incident.status)}
                            </span>
                        </div>
                        <h3 class="${styles.popupTitle}">${incident.title}</h3>
                        <p class="${styles.popupMeta}">
                            <span style="color: ${incident.category?.color}">${incident.category?.name || 'Unknown'}</span>
                            <span>• ${formatTimeAgo(incident.created_at)}</span>
                        </p>
                        ${incident.address ? `<p class="${styles.popupAddress}">${incident.address.slice(0, 80)}${incident.address.length > 80 ? '...' : ''}</p>` : ''}
                        <a href="/police/incident/${incident.id}" class="${styles.popupLink}">View Details →</a>
                    </div>
                `;

                marker.bindPopup(popupContent, {
                    maxWidth: 300,
                    className: styles.customPopup
                });

                marker.on('click', () => {
                    setSelectedIncident(incident);
                });

                markersRef.current.push(marker);
            }
        });

        // Fit map to markers if there are any
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return '#D32F2F';
            case 'in_review': return '#F57C00';
            case 'action_taken': return '#1976D2';
            case 'resolved': return '#388E3C';
            default: return '#757575';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'submitted': return '#FFEBEE';
            case 'in_review': return '#FFF3E0';
            case 'action_taken': return '#E3F2FD';
            case 'resolved': return '#E8F5E9';
            default: return '#F5F5F5';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'New';
            case 'in_review': return 'In Review';
            case 'action_taken': return 'Action Taken';
            case 'resolved': return 'Resolved';
            default: return status;
        }
    };

    const formatTimeAgo = (date: string) => {
        const now = new Date();
        const then = new Date(date);
        const diffMs = now.getTime() - then.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return then.toLocaleDateString();
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading || !mapLoaded) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading map...</p>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>AlertKaro</span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/police" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/police/incidents" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        All Incidents
                    </Link>
                    <Link href="/police/map" className={`${styles.navLink} ${styles.active}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        Map View
                    </Link>
                    <Link href="/police/analytics" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                        </svg>
                        Analytics
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {profile?.full_name?.charAt(0)}
                        </div>
                        <div>
                            <p className={styles.userName}>{profile?.full_name}</p>
                            <p className={styles.userRole}>{profile?.role}</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className={styles.signOutBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Incident Map</h1>
                        <p className={styles.pageSubtitle}>
                            View all incident locations •
                            <span className={styles.incidentCount}> {incidents.length} incidents on map</span>
                        </p>
                    </div>
                    <div className={styles.headerFilters}>
                        <div className={styles.filterGroup}>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="unresolved">Unresolved Only</option>
                                <option value="all">All Status</option>
                                <option value="submitted">New</option>
                                <option value="in_review">In Review</option>
                                <option value="action_taken">Action Taken</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>
                        <div className={styles.filterGroup}>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className={styles.filterSelect}
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                {/* Map Container */}
                <div className={styles.mapWrapper}>
                    <div ref={mapRef} className={styles.map}></div>

                    {/* Legend */}
                    <div className={styles.legend}>
                        <h4>Status Legend</h4>
                        <div className={styles.legendItems}>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: '#D32F2F' }}></span>
                                <span>New</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: '#F57C00' }}></span>
                                <span>In Review</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: '#1976D2' }}></span>
                                <span>Action Taken</span>
                            </div>
                            <div className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: '#388E3C' }}></span>
                                <span>Resolved</span>
                            </div>
                        </div>
                    </div>

                    {/* No incidents message */}
                    {incidents.length === 0 && (
                        <div className={styles.noIncidents}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            <p>No incidents with location data</p>
                            <span>Incidents will appear here when users report with location enabled</span>
                        </div>
                    )}
                </div>

                {/* Selected Incident Panel */}
                {selectedIncident && (
                    <div className={styles.incidentPanel}>
                        <button
                            className={styles.closePanel}
                            onClick={() => setSelectedIncident(null)}
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            </svg>
                        </button>
                        <div className={styles.panelHeader}>
                            <span className={styles.panelTrackingId}>#{selectedIncident.tracking_id}</span>
                            <span
                                className={styles.panelStatus}
                                style={{
                                    background: getStatusBg(selectedIncident.status),
                                    color: getStatusColor(selectedIncident.status)
                                }}
                            >
                                {getStatusLabel(selectedIncident.status)}
                            </span>
                        </div>
                        <h3 className={styles.panelTitle}>{selectedIncident.title}</h3>
                        <div className={styles.panelDetails}>
                            <p>
                                <strong>Category:</strong>
                                <span style={{ color: selectedIncident.category?.color }}>
                                    {selectedIncident.category?.name}
                                </span>
                            </p>
                            <p>
                                <strong>Reported:</strong> {formatTimeAgo(selectedIncident.created_at)}
                            </p>
                            <p>
                                <strong>Reporter:</strong> {selectedIncident.user?.full_name}
                            </p>
                            {selectedIncident.address && (
                                <p>
                                    <strong>Location:</strong> {selectedIncident.address}
                                </p>
                            )}
                            <p>
                                <strong>Coordinates:</strong> {selectedIncident.latitude?.toFixed(6)}, {selectedIncident.longitude?.toFixed(6)}
                            </p>
                        </div>
                        <Link
                            href={`/police/incident/${selectedIncident.id}`}
                            className={styles.panelButton}
                        >
                            View Full Details
                        </Link>
                    </div>
                )}
            </main>
        </div>
    );
}
