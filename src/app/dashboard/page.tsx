'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useNotifications } from '@/lib/NotificationContext';
import styles from './page.module.css';

interface Profile {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    status: string;
    address: string;
    created_at: string;
    updated_at: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
}

interface Stats {
    active: number;
    resolved: number;
    pending: number;
}

export default function DashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const { unreadCount } = useNotifications();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [stats, setStats] = useState<Stats>({ active: 0, resolved: 0, pending: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    router.push('/login');
                    return;
                }

                // Load profile
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('id, full_name, avatar_url')
                    .eq('id', user.id)
                    .single();

                if (!profileData?.full_name) {
                    router.push('/complete-profile');
                    return;
                }

                setProfile(profileData);

                // Load incidents with category
                const { data: incidentData } = await supabase
                    .from('incidents')
                    .select(`
            id,
            tracking_id,
            title,
            status,
            address,
            created_at,
            updated_at,
            category:categories(name, icon, color)
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (incidentData) {
                    setIncidents(incidentData as unknown as Incident[]);

                    // Calculate stats
                    const active = incidentData.filter(i =>
                        ['submitted', 'in_review', 'action_taken'].includes(i.status)
                    ).length;
                    const resolved = incidentData.filter(i => i.status === 'resolved').length;
                    const pending = incidentData.filter(i => i.status === 'submitted').length;

                    // Get total counts
                    const { count: totalActive } = await supabase
                        .from('incidents')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .in('status', ['submitted', 'in_review', 'action_taken']);

                    const { count: totalResolved } = await supabase
                        .from('incidents')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('status', 'resolved');

                    const { count: totalPending } = await supabase
                        .from('incidents')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .eq('status', 'submitted');

                    setStats({
                        active: totalActive || 0,
                        resolved: totalResolved || 0,
                        pending: totalPending || 0,
                    });
                }
            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [supabase, router]);

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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'submitted': return styles.badgeReceived;
            case 'in_review': return styles.badgeInProgress;
            case 'action_taken': return styles.badgeActionTaken;
            case 'resolved': return styles.badgeResolved;
            default: return styles.badgeReceived;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Received';
            case 'in_review': return 'In Progress';
            case 'action_taken': return 'Action Taken';
            case 'resolved': return 'Resolved';
            default: return status;
        }
    };

    const getCategoryIcon = (icon: string) => {
        switch (icon) {
            case 'traffic':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.categoryIcon}>
                        <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
                    </svg>
                );
            case 'shield':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.categoryIcon}>
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                );
            case 'city':
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.categoryIcon}>
                        <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
                    </svg>
                );
            default:
                return (
                    <svg viewBox="0 0 24 24" fill="currentColor" className={styles.categoryIcon}>
                        <circle cx="12" cy="12" r="10" />
                    </svg>
                );
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <main className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.headerTop}>
                        <div>
                            <p className={styles.greeting}>Welcome back,</p>
                            <h1 className={styles.userName}>{profile?.full_name}</h1>
                        </div>
                        <Link href="/profile" className={styles.avatarLink}>
                            {profile?.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name}
                                    className={styles.avatar}
                                />
                            ) : (
                                <div className={styles.avatarPlaceholder}>
                                    {profile?.full_name?.charAt(0)}
                                </div>
                            )}
                        </Link>
                    </div>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Active</span>
                            <span className={styles.statValue}>{stats.active}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Resolved</span>
                            <span className={styles.statValue}>{stats.resolved}</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statLabel}>Pending</span>
                            <span className={styles.statValue}>{stats.pending}</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className={styles.content}>
                {/* Report CTA */}
                <Link href="/report" className={styles.reportCta}>
                    <div>
                        <h2 className={styles.ctaTitle}>Report Incident</h2>
                        <p className={styles.ctaSubtitle}>Spot an issue? Let us know.</p>
                    </div>
                    <div className={styles.ctaIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
                        </svg>
                    </div>
                </Link>

                {/* Public Feed CTA */}
                <Link href="/feed" className={styles.feedCta}>
                    <div className={styles.feedCtaIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className={styles.feedCtaTitle}>Public Feed</h3>
                        <p className={styles.feedCtaSubtitle}>See how incidents are being resolved</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className={styles.feedCtaArrow}>
                        <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                    </svg>
                </Link>

                {/* Active Reports Section */}
                <section className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>My Active Reports</h2>
                        <Link href="/history" className={styles.viewAllLink}>View All</Link>
                    </div>

                    {incidents.length === 0 ? (
                        <div className={styles.emptyState}>
                            <svg viewBox="0 0 24 24" fill="none" className={styles.emptyIcon}>
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor" />
                            </svg>
                            <p>No reports yet</p>
                            <span>Start by reporting an incident in your area</span>
                        </div>
                    ) : (
                        <div className={styles.reportsList}>
                            {incidents.map((incident) => (
                                <Link
                                    href={`/incident/${incident.id}`}
                                    key={incident.id}
                                    className={styles.reportCard}
                                >
                                    <div className={styles.reportCardHeader}>
                                        <div className={styles.reportInfo}>
                                            <div
                                                className={styles.reportIconWrapper}
                                                style={{ backgroundColor: `${incident.category?.color}20` }}
                                            >
                                                <span style={{ color: incident.category?.color }}>
                                                    {getCategoryIcon(incident.category?.icon)}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className={styles.reportTitle}>{incident.title}</h3>
                                                <p className={styles.reportId}>ID: #{incident.tracking_id}</p>
                                            </div>
                                        </div>
                                        <span className={`${styles.badge} ${getStatusBadgeClass(incident.status)}`}>
                                            {getStatusLabel(incident.status)}
                                        </span>
                                    </div>

                                    {incident.address && (
                                        <div className={styles.reportLocation}>
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                            </svg>
                                            <span>{incident.address}</span>
                                        </div>
                                    )}

                                    <div className={styles.progressBar}>
                                        <div
                                            className={`${styles.progressFill} ${styles[incident.status.replace('_', '-')]}`}
                                        />
                                    </div>

                                    <div className={styles.reportFooter}>
                                        <span className={styles.reportTime}>
                                            Updated {formatTimeAgo(incident.updated_at)}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Bottom Navigation */}
            <nav className={styles.bottomNav}>
                <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
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
