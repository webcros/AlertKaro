'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useNotifications } from '@/lib/NotificationContext';
import styles from './page.module.css';

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    description: string;
    status: string;
    address: string;
    latitude: number;
    longitude: number;
    created_at: string;
    updated_at: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
}

interface Media {
    id: string;
    file_url: string;
    file_type: string;
}

interface Update {
    id: string;
    status: string;
    notes: string;
    created_at: string;
    updated_by: {
        full_name: string;
    };
}

export default function IncidentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const supabase = createClient();
    const { unreadCount } = useNotifications();

    const isNew = searchParams.get('new') === 'true';
    const incidentId = params.id as string;

    const [incident, setIncident] = useState<Incident | null>(null);
    const [media, setMedia] = useState<Media[]>([]);
    const [updates, setUpdates] = useState<Update[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(isNew);

    useEffect(() => {
        async function loadIncident() {
            try {
                // Load incident
                const { data: incidentData, error } = await supabase
                    .from('incidents')
                    .select(`
            *,
            category:categories(name, icon, color)
          `)
                    .eq('id', incidentId)
                    .single();

                if (error || !incidentData) {
                    router.push('/dashboard');
                    return;
                }

                setIncident(incidentData as unknown as Incident);

                // Load media
                const { data: mediaData } = await supabase
                    .from('incident_media')
                    .select('*')
                    .eq('incident_id', incidentId);

                if (mediaData) {
                    setMedia(mediaData);
                }

                // Load updates
                const { data: updatesData } = await supabase
                    .from('incident_updates')
                    .select(`
            *,
            updated_by:profiles(full_name)
          `)
                    .eq('incident_id', incidentId)
                    .order('created_at', { ascending: false });

                if (updatesData) {
                    setUpdates(updatesData as unknown as Update[]);
                }
            } catch (error) {
                console.error('Error loading incident:', error);
            } finally {
                setLoading(false);
            }
        }

        loadIncident();

        // Hide success message after 3 seconds
        if (isNew) {
            const timer = setTimeout(() => setShowSuccess(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [incidentId, supabase, router, isNew]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted':
                return { label: 'Received', color: '#757575', progress: 25 };
            case 'in_review':
                return { label: 'In Progress', color: '#F57C00', progress: 50 };
            case 'action_taken':
                return { label: 'Action Taken', color: '#1976D2', progress: 75 };
            case 'resolved':
                return { label: 'Resolved', color: '#388E3C', progress: 100 };
            default:
                return { label: status, color: '#757575', progress: 0 };
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    if (!incident) {
        return null;
    }

    const statusInfo = getStatusInfo(incident.status);

    return (
        <main className={styles.page}>
            {/* Success Toast */}
            {showSuccess && (
                <div className={styles.successToast}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                    <span>Report submitted successfully!</span>
                </div>
            )}

            {/* Header */}
            <header className={styles.header}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                    </svg>
                </button>
                <h1 className={styles.headerTitle}>Incident Details</h1>
                <div className={styles.headerSpacer}></div>
            </header>

            <div className={styles.content}>
                {/* Tracking ID Card */}
                <div className={styles.trackingCard}>
                    <div className={styles.trackingInfo}>
                        <span className={styles.trackingLabel}>Tracking ID</span>
                        <span className={styles.trackingId}>#{incident.tracking_id}</span>
                    </div>
                    <span
                        className={styles.statusBadge}
                        style={{
                            backgroundColor: `${statusInfo.color}15`,
                            color: statusInfo.color,
                            borderColor: `${statusInfo.color}30`
                        }}
                    >
                        {statusInfo.label}
                    </span>
                </div>

                {/* Progress Bar */}
                <div className={styles.progressSection}>
                    <div className={styles.progressBar}>
                        <div
                            className={styles.progressFill}
                            style={{
                                width: `${statusInfo.progress}%`,
                                backgroundColor: statusInfo.color
                            }}
                        />
                    </div>
                    <div className={styles.progressSteps}>
                        <span className={statusInfo.progress >= 25 ? styles.activeStep : ''}>Received</span>
                        <span className={statusInfo.progress >= 50 ? styles.activeStep : ''}>Reviewing</span>
                        <span className={statusInfo.progress >= 75 ? styles.activeStep : ''}>Action</span>
                        <span className={statusInfo.progress >= 100 ? styles.activeStep : ''}>Resolved</span>
                    </div>
                </div>

                {/* Media Gallery */}
                {media.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Evidence</h2>
                        <div className={styles.mediaGrid}>
                            {media.map((item) => (
                                <div key={item.id} className={styles.mediaItem}>
                                    {item.file_type === 'video' ? (
                                        <video src={item.file_url} controls className={styles.mediaContent} />
                                    ) : (
                                        <img src={item.file_url} alt="" className={styles.mediaContent} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Details */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Details</h2>
                    <div className={styles.detailCard}>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Title</span>
                            <span className={styles.detailValue}>{incident.title}</span>
                        </div>
                        {incident.description && (
                            <div className={styles.detailRow}>
                                <span className={styles.detailLabel}>Description</span>
                                <span className={styles.detailValue}>{incident.description}</span>
                            </div>
                        )}
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Category</span>
                            <span
                                className={styles.categoryTag}
                                style={{ color: incident.category?.color }}
                            >
                                {incident.category?.name}
                            </span>
                        </div>
                        <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Reported On</span>
                            <span className={styles.detailValue}>{formatDate(incident.created_at)}</span>
                        </div>
                    </div>
                </div>

                {/* Location */}
                {incident.address && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Location</h2>
                        <div className={styles.locationCard}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className={styles.locationIcon}>
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            <span>{incident.address}</span>
                        </div>
                    </div>
                )}

                {/* Updates Timeline */}
                {updates.length > 0 && (
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>Updates</h2>
                        <div className={styles.timeline}>
                            {updates.map((update, index) => (
                                <div key={update.id} className={styles.timelineItem}>
                                    <div className={styles.timelineDot}></div>
                                    {index < updates.length - 1 && <div className={styles.timelineLine}></div>}
                                    <div className={styles.timelineContent}>
                                        <div className={styles.updateHeader}>
                                            <span className={styles.updateStatus}>
                                                {getStatusInfo(update.status).label}
                                            </span>
                                            <span className={styles.updateTime}>{formatDate(update.created_at)}</span>
                                        </div>
                                        {update.notes && (
                                            <p className={styles.updateNotes}>{update.notes}</p>
                                        )}
                                        <span className={styles.updateBy}>by {update.updated_by?.full_name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Navigation */}
            <nav className={styles.bottomNav}>
                <Link href="/dashboard" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                    </svg>
                    <span>Home</span>
                </Link>
                <Link href="/history" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                    <span>History</span>
                </Link>
                <Link href="/report" className={styles.cameraButton}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    </svg>
                </Link>
                <Link href="/alerts" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                    <span>Alerts</span>
                    {unreadCount > 0 && (
                        <span className={styles.navBadge}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
                <Link href="/profile" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>Profile</span>
                </Link>
            </nav>
        </main>
    );
}
