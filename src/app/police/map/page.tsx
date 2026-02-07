'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
    const markerClusterRef = useRef<any>(null);

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [statusFilter, setStatusFilter] = useState<string[]>(['submitted', 'in_review', 'action_taken']);
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [showHighPriorityOnly, setShowHighPriorityOnly] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [showFilters, setShowFilters] = useState(true);

    // Load Leaflet CSS and JS with MarkerCluster
    useEffect(() => {
        const loadLeaflet = async () => {
            // Add Leaflet CSS
            if (!document.querySelector('link[href*="leaflet.css"]')) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
                link.crossOrigin = '';
                document.head.appendChild(link);
            }

            // Add MarkerCluster CSS
            if (!document.querySelector('link[href*="MarkerCluster"]')) {
                const clusterCss = document.createElement('link');
                clusterCss.rel = 'stylesheet';
                clusterCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css';
                document.head.appendChild(clusterCss);

                const clusterDefaultCss = document.createElement('link');
                clusterDefaultCss.rel = 'stylesheet';
                clusterDefaultCss.href = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css';
                document.head.appendChild(clusterDefaultCss);
            }

            // Add Leaflet JS
            if (!window.L) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
                script.crossOrigin = '';
                script.onload = () => {
                    // Load MarkerCluster after Leaflet
                    const clusterScript = document.createElement('script');
                    clusterScript.src = 'https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js';
                    clusterScript.onload = () => setMapLoaded(true);
                    document.head.appendChild(clusterScript);
                };
                document.head.appendChild(script);
            } else {
                setMapLoaded(true);
            }
        };

        loadLeaflet();
    }, []);

    // Initial data load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = useCallback(async () => {
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

            // Apply category filter at query level
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
    }, [supabase, categoryFilter]);

    // Reload data when category filter changes
    useEffect(() => {
        loadData();
    }, [categoryFilter, loadData]);

    // Filter incidents locally for status and priority
    const filteredIncidents = incidents.filter(incident => {
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(incident.status);
        const matchesPriority = !showHighPriorityOnly || ['urgent', 'high'].includes(incident.priority);
        return matchesStatus && matchesPriority;
    });

    // Initialize map when Leaflet is loaded and data is ready
    useEffect(() => {
        if (!mapLoaded || !mapRef.current || !window.L) return;

        // If map already exists, just update markers
        if (mapInstanceRef.current) {
            updateMarkers();
            return;
        }

        // Initialize map centered on India with dark theme
        const map = window.L.map(mapRef.current, {
            zoomControl: false // We'll add custom zoom control
        }).setView([20.5937, 78.9629], 5);

        // Add zoom control to bottom right
        window.L.control.zoom({
            position: 'bottomright'
        }).addTo(map);

        // Add dark tile layer (CartoDB Dark Matter)
        window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20,
        }).addTo(map);

        mapInstanceRef.current = map;

        // Initialize marker cluster group
        if ((window.L as any).markerClusterGroup) {
            markerClusterRef.current = (window.L as any).markerClusterGroup({
                chunkedLoading: true,
                maxClusterRadius: 50,
                spiderfyOnMaxZoom: true,
                showCoverageOnHover: false,
                iconCreateFunction: function (cluster: any) {
                    const count = cluster.getChildCount();
                    let size = 'small';
                    let dimension = 40;
                    if (count > 10) {
                        size = 'medium';
                        dimension = 50;
                    }
                    if (count > 50) {
                        size = 'large';
                        dimension = 60;
                    }
                    return window.L.divIcon({
                        html: `<div class="${styles.clusterIcon} ${styles['cluster' + size.charAt(0).toUpperCase() + size.slice(1)]}"><span>${count}</span></div>`,
                        className: styles.markerCluster,
                        iconSize: window.L.point(dimension, dimension)
                    });
                }
            });
            map.addLayer(markerClusterRef.current);
        }

        updateMarkers();

    }, [mapLoaded, loading]);

    // Update markers when filtered incidents change
    useEffect(() => {
        if (mapInstanceRef.current && mapLoaded) {
            updateMarkers();
        }
    }, [filteredIncidents, mapLoaded]);

    function updateMarkers() {
        const L = window.L;
        const map = mapInstanceRef.current;
        if (!map || !L) return;

        // Clear existing markers
        if (markerClusterRef.current) {
            markerClusterRef.current.clearLayers();
        } else {
            markersRef.current.forEach(marker => map.removeLayer(marker));
            markersRef.current = [];
        }

        // Add new markers
        const bounds: [number, number][] = [];

        filteredIncidents.forEach((incident) => {
            if (incident.latitude && incident.longitude) {
                bounds.push([incident.latitude, incident.longitude]);

                // Create custom icon based on status
                const color = getStatusColor(incident.status);
                const isHighPriority = ['urgent', 'high'].includes(incident.priority);
                const markerSize = isHighPriority ? 44 : 36;

                const icon = L.divIcon({
                    className: styles.customMarker,
                    html: `
                        <div class="${styles.markerPin} ${isHighPriority ? styles.highPriority : ''}" style="--marker-color: ${color}">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="${isHighPriority ? 22 : 18}" height="${isHighPriority ? 22 : 18}">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                            </svg>
                            ${isHighPriority ? '<span class="' + styles.priorityPulse + '"></span>' : ''}
                        </div>
                    `,
                    iconSize: [markerSize, markerSize + 10],
                    iconAnchor: [markerSize / 2, markerSize + 10],
                    popupAnchor: [0, -(markerSize + 10)]
                });

                const marker = L.marker([incident.latitude, incident.longitude], { icon });

                marker.on('click', () => {
                    setSelectedIncident(incident);
                });

                if (markerClusterRef.current) {
                    markerClusterRef.current.addLayer(marker);
                } else {
                    marker.addTo(map);
                    markersRef.current.push(marker);
                }
            }
        });

        // Fit map to markers if there are any
        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return '#dc2626';
            case 'in_review': return '#d97706';
            case 'action_taken': return '#2563eb';
            case 'resolved': return '#059669';
            default: return '#64748b';
        }
    };

    const getStatusBg = (status: string) => {
        switch (status) {
            case 'submitted': return '#fef2f2';
            case 'in_review': return '#fffbeb';
            case 'action_taken': return '#eff6ff';
            case 'resolved': return '#ecfdf5';
            default: return '#f8fafc';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Pending';
            case 'in_review': return 'In Review';
            case 'action_taken': return 'In Progress';
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

    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const centerOnIncidents = () => {
        if (mapInstanceRef.current && filteredIncidents.length > 0) {
            const bounds = filteredIncidents
                .filter(i => i.latitude && i.longitude)
                .map(i => [i.latitude!, i.longitude!] as [number, number]);
            if (bounds.length > 0) {
                mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
            }
        }
    };

    if (loading || !mapLoaded) {
        return (
            <div className={styles.contentLoading}>
                <div className={styles.spinner}></div>
                <p>Loading map...</p>
            </div>
        );
    }

    return (
        <>
            {/* Map Container */}
            <div className={styles.mapWrapper}>
                <div ref={mapRef} className={styles.map}></div>

                {/* Map Header Overlay */}
                <div className={styles.mapHeader}>
                    <div className={styles.mapTitle}>
                        <h1>Incident Map</h1>
                        <span className={styles.incidentCount}>{filteredIncidents.length} incidents</span>
                    </div>
                    <div className={styles.mapActions}>
                        <button
                            className={styles.mapActionBtn}
                            onClick={centerOnIncidents}
                            title="Center on incidents"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                            </svg>
                        </button>
                        <button
                            className={`${styles.mapActionBtn} ${showFilters ? styles.active : ''}`}
                            onClick={() => setShowFilters(!showFilters)}
                            title="Toggle filters"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                    <div className={styles.filterPanel}>
                        <h3>Filters</h3>

                        <div className={styles.filterSection}>
                            <label>Status</label>
                            <div className={styles.statusFilters}>
                                {[
                                    { value: 'submitted', label: 'Pending', color: '#dc2626' },
                                    { value: 'in_review', label: 'In Review', color: '#d97706' },
                                    { value: 'action_taken', label: 'In Progress', color: '#2563eb' },
                                    { value: 'resolved', label: 'Resolved', color: '#059669' },
                                ].map(status => (
                                    <button
                                        key={status.value}
                                        className={`${styles.statusChip} ${statusFilter.includes(status.value) ? styles.active : ''}`}
                                        onClick={() => toggleStatusFilter(status.value)}
                                        style={{ '--chip-color': status.color } as React.CSSProperties}
                                    >
                                        <span className={styles.chipDot}></span>
                                        {status.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.filterSection}>
                            <label>Category</label>
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

                        <div className={styles.filterSection}>
                            <label className={styles.toggleLabel}>
                                <input
                                    type="checkbox"
                                    checked={showHighPriorityOnly}
                                    onChange={(e) => setShowHighPriorityOnly(e.target.checked)}
                                />
                                <span>High priority only</span>
                            </label>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className={styles.legend}>
                    <h4>Legend</h4>
                    <div className={styles.legendItems}>
                        {[
                            { label: 'Pending', color: '#dc2626' },
                            { label: 'In Review', color: '#d97706' },
                            { label: 'In Progress', color: '#2563eb' },
                            { label: 'Resolved', color: '#059669' },
                        ].map(item => (
                            <div key={item.label} className={styles.legendItem}>
                                <span className={styles.legendDot} style={{ background: item.color }}></span>
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* No incidents message */}
                {filteredIncidents.length === 0 && (
                    <div className={styles.noIncidents}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        <p>No incidents match your filters</p>
                        <span>Try adjusting your filter settings</span>
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
                        {['urgent', 'high'].includes(selectedIncident.priority) && (
                            <span className={styles.panelPriority}>
                                {selectedIncident.priority.toUpperCase()}
                            </span>
                        )}
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
                        <div className={styles.panelRow}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M12 2l-5.5 9h11z M12 22l5.5-9H6.5z" />
                            </svg>
                            <span style={{ color: selectedIncident.category?.color }}>
                                {selectedIncident.category?.name}
                            </span>
                        </div>
                        <div className={styles.panelRow}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                            </svg>
                            <span>{formatTimeAgo(selectedIncident.created_at)}</span>
                        </div>
                        <div className={styles.panelRow}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            <span>{selectedIncident.user?.full_name}</span>
                        </div>
                        {selectedIncident.address && (
                            <div className={styles.panelRow}>
                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                </svg>
                                <span className={styles.panelAddress}>{selectedIncident.address}</span>
                            </div>
                        )}
                    </div>
                    <div className={styles.panelActions}>
                        <Link
                            href={`/police/incident/${selectedIncident.id}`}
                            className={styles.panelButton}
                        >
                            View Details
                        </Link>
                        <button className={styles.panelButtonSecondary}>
                            Assign
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
