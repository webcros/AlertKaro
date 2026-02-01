'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    address: string;
    created_at: string;
    updated_at: string;
    user: {
        full_name: string;
        phone: string;
        avatar_url: string;
    };
    category: {
        name: string;
        icon: string;
        color: string;
    };
    area: {
        name: string;
    } | null;
}

interface Category {
    id: string;
    name: string;
    color: string;
}

interface Stats {
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    today: number;
}

export default function PoliceDashboardPage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, resolved: 0, today: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');

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

            // Build query with filters
            let query = supabase
                .from('incidents')
                .select(`
          id,
          tracking_id,
          title,
          description,
          status,
          priority,
          address,
          created_at,
          updated_at,
          user:profiles!incidents_user_id_fkey(full_name, phone, avatar_url),
          category:categories(name, icon, color),
          area:areas(name)
        `)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'all') {
                query = query.eq('status', statusFilter);
            }

            if (categoryFilter !== 'all') {
                query = query.eq('category_id', categoryFilter);
            }

            const { data: incidentData } = await query.limit(50);

            if (incidentData) {
                setIncidents(incidentData as unknown as Incident[]);
            }

            // Get stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [totalRes, pendingRes, inProgressRes, resolvedRes, todayRes] = await Promise.all([
                supabase.from('incidents').select('*', { count: 'exact', head: true }),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).in('status', ['in_review', 'action_taken']),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
            ]);

            setStats({
                total: totalRes.count || 0,
                pending: pendingRes.count || 0,
                inProgress: inProgressRes.count || 0,
                resolved: resolvedRes.count || 0,
                today: todayRes.count || 0,
            });

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (profile) {
            setLoading(true);
            loadData();
        }
    }, [statusFilter, categoryFilter]);

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

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted':
                return { label: 'New', color: '#D32F2F', bg: '#FFEBEE' };
            case 'in_review':
                return { label: 'In Review', color: '#F57C00', bg: '#FFF3E0' };
            case 'action_taken':
                return { label: 'Action Taken', color: '#1976D2', bg: '#E3F2FD' };
            case 'resolved':
                return { label: 'Resolved', color: '#388E3C', bg: '#E8F5E9' };
            default:
                return { label: status, color: '#757575', bg: '#F5F5F5' };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return { label: 'URGENT', color: '#D32F2F' };
            case 'high':
                return { label: 'HIGH', color: '#F57C00' };
            default:
                return null;
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
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
                    <Link href="/police" className={`${styles.navLink} ${styles.active}`}>
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
                    <Link href="/police/map" className={styles.navLink}>
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
                        <h1 className={styles.pageTitle}>Police Dashboard</h1>
                        <p className={styles.pageSubtitle}>Monitor and manage incident reports</p>
                    </div>
                    <div className={styles.headerActions}>
                        <span className={styles.liveIndicator}>
                            <span className={styles.liveDot}></span>
                            Live
                        </span>
                    </div>
                </header>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: '#E3F2FD' }}>
                            <svg viewBox="0 0 24 24" fill="#1976D2" width="24" height="24">
                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                            </svg>
                        </div>
                        <div>
                            <span className={styles.statValue}>{stats.total}</span>
                            <span className={styles.statLabel}>Total Cases</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: '#FFEBEE' }}>
                            <svg viewBox="0 0 24 24" fill="#D32F2F" width="24" height="24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                        <div>
                            <span className={styles.statValue}>{stats.pending}</span>
                            <span className={styles.statLabel}>Pending</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: '#FFF3E0' }}>
                            <svg viewBox="0 0 24 24" fill="#F57C00" width="24" height="24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                        <div>
                            <span className={styles.statValue}>{stats.inProgress}</span>
                            <span className={styles.statLabel}>In Progress</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: '#E8F5E9' }}>
                            <svg viewBox="0 0 24 24" fill="#388E3C" width="24" height="24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                        </div>
                        <div>
                            <span className={styles.statValue}>{stats.resolved}</span>
                            <span className={styles.statLabel}>Resolved</span>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon} style={{ background: '#F3E5F5' }}>
                            <svg viewBox="0 0 24 24" fill="#7B1FA2" width="24" height="24">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                            </svg>
                        </div>
                        <div>
                            <span className={styles.statValue}>{stats.today}</span>
                            <span className={styles.statLabel}>Today</span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    <div className={styles.filterGroup}>
                        <label>Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Status</option>
                            <option value="submitted">New</option>
                            <option value="in_review">In Review</option>
                            <option value="action_taken">Action Taken</option>
                            <option value="resolved">Resolved</option>
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
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
                </div>

                {/* Incidents List */}
                <section className={styles.incidentsSection}>
                    <h2 className={styles.sectionTitle}>
                        Recent Incidents
                        <span className={styles.incidentCount}>{incidents.length}</span>
                    </h2>

                    {incidents.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>No incidents found</p>
                        </div>
                    ) : (
                        <div className={styles.incidentsList}>
                            {incidents.map((incident) => {
                                const statusInfo = getStatusInfo(incident.status);
                                const priorityBadge = getPriorityBadge(incident.priority);

                                return (
                                    <Link
                                        href={`/police/incident/${incident.id}`}
                                        key={incident.id}
                                        className={styles.incidentCard}
                                    >
                                        <div className={styles.incidentHeader}>
                                            <div className={styles.incidentMeta}>
                                                <span className={styles.trackingId}>#{incident.tracking_id}</span>
                                                {priorityBadge && (
                                                    <span
                                                        className={styles.priorityBadge}
                                                        style={{ color: priorityBadge.color }}
                                                    >
                                                        {priorityBadge.label}
                                                    </span>
                                                )}
                                            </div>
                                            <span
                                                className={styles.statusBadge}
                                                style={{
                                                    backgroundColor: statusInfo.bg,
                                                    color: statusInfo.color
                                                }}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        </div>

                                        <h3 className={styles.incidentTitle}>{incident.title}</h3>

                                        {incident.description && (
                                            <p className={styles.incidentDesc}>
                                                {incident.description.slice(0, 100)}
                                                {incident.description.length > 100 ? '...' : ''}
                                            </p>
                                        )}

                                        <div className={styles.incidentDetails}>
                                            <span
                                                className={styles.categoryTag}
                                                style={{ color: incident.category?.color }}
                                            >
                                                {incident.category?.name}
                                            </span>
                                            {incident.area && (
                                                <span className={styles.areaTag}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                    </svg>
                                                    {incident.area.name}
                                                </span>
                                            )}
                                        </div>

                                        <div className={styles.incidentFooter}>
                                            <div className={styles.reporter}>
                                                <div className={styles.reporterAvatar}>
                                                    {incident.user?.full_name?.charAt(0)}
                                                </div>
                                                <span>{incident.user?.full_name}</span>
                                            </div>
                                            <span className={styles.timeAgo}>{formatTimeAgo(incident.created_at)}</span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
