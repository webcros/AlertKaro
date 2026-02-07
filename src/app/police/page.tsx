'use client';

import { useEffect, useState, useCallback } from 'react';
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

type DateFilter = 'all' | 'today' | 'week' | 'month';

export default function PoliceDashboardPage() {
    const router = useRouter();
    const supabase = createClient();

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, inProgress: 0, resolved: 0, today: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

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

            // Calculate date filter
            const now = new Date();
            let dateFrom: Date | null = null;

            if (dateFilter === 'today') {
                dateFrom = new Date(now);
                dateFrom.setHours(0, 0, 0, 0);
            } else if (dateFilter === 'week') {
                dateFrom = new Date(now);
                dateFrom.setDate(dateFrom.getDate() - 7);
            } else if (dateFilter === 'month') {
                dateFrom = new Date(now);
                dateFrom.setMonth(dateFrom.getMonth() - 1);
            }

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

            if (dateFrom) {
                query = query.gte('created_at', dateFrom.toISOString());
            }

            const { data: incidentData } = await query.limit(20);

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

            setLastUpdated(new Date());

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    }, [supabase, statusFilter, categoryFilter, dateFilter]);

    // Reload data when filters change
    useEffect(() => {
        setLoading(true);
        loadData();
    }, [statusFilter, categoryFilter, dateFilter, loadData]);

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

    const formatLastUpdated = () => {
        const diffMs = new Date().getTime() - lastUpdated.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted':
                return { label: 'Pending', color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' };
            case 'in_review':
                return { label: 'In Review', color: 'var(--status-in-review)', bg: 'var(--status-in-review-bg)' };
            case 'action_taken':
                return { label: 'In Progress', color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' };
            case 'resolved':
                return { label: 'Resolved', color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' };
            default:
                return { label: status, color: 'var(--police-text-muted)', bg: 'var(--police-surface)' };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent':
                return { label: 'URGENT', className: styles.urgent };
            case 'high':
                return { label: 'HIGH', className: styles.high };
            default:
                return null;
        }
    };

    const handleStatClick = (filterValue: string) => {
        if (filterValue === statusFilter) {
            setStatusFilter('all');
        } else {
            setStatusFilter(filterValue);
        }
    };

    const clearAllFilters = () => {
        setStatusFilter('all');
        setCategoryFilter('all');
        setDateFilter('all');
    };

    const hasActiveFilters = statusFilter !== 'all' || categoryFilter !== 'all' || dateFilter !== 'all';

    return (
        <>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Police Dashboard</h1>
                    <p className={styles.pageSubtitle}>Monitor and manage incident reports</p>
                </div>
                <div className={styles.headerActions}>
                    <span className={styles.lastUpdated}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                        </svg>
                        Updated {formatLastUpdated()}
                    </span>
                    <span className={styles.liveIndicator}>
                        <span className={styles.liveDot}></span>
                        Live
                    </span>
                </div>
            </header>

            {/* Stats Cards */}
            <div className={styles.statsGrid}>
                <div
                    className={`${styles.statCard} ${statusFilter === 'all' ? styles.active : ''}`}
                    onClick={() => handleStatClick('all')}
                    style={{ '--stat-color': 'var(--police-accent)' } as React.CSSProperties}
                >
                    <div className={styles.statIcon} style={{ background: 'var(--police-accent-bg)' }}>
                        <svg viewBox="0 0 24 24" fill="var(--police-accent)" width="24" height="24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats.total}</span>
                        <span className={styles.statLabel}>Total Active Incidents</span>
                    </div>
                </div>

                <div
                    className={`${styles.statCard} ${statusFilter === 'submitted' ? styles.active : ''}`}
                    onClick={() => handleStatClick('submitted')}
                    style={{ '--stat-color': 'var(--status-pending)' } as React.CSSProperties}
                >
                    <div className={styles.statIcon} style={{ background: 'var(--status-pending-bg)' }}>
                        <svg viewBox="0 0 24 24" fill="var(--status-pending)" width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats.pending}</span>
                        <span className={styles.statLabel}>Pending Review</span>
                    </div>
                </div>

                <div
                    className={`${styles.statCard} ${statusFilter === 'in_review' || statusFilter === 'action_taken' ? styles.active : ''}`}
                    onClick={() => handleStatClick('in_review')}
                    style={{ '--stat-color': 'var(--status-in-progress)' } as React.CSSProperties}
                >
                    <div className={styles.statIcon} style={{ background: 'var(--status-in-progress-bg)' }}>
                        <svg viewBox="0 0 24 24" fill="var(--status-in-progress)" width="24" height="24">
                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats.inProgress}</span>
                        <span className={styles.statLabel}>In Progress</span>
                    </div>
                </div>

                <div
                    className={`${styles.statCard} ${statusFilter === 'resolved' ? styles.active : ''}`}
                    onClick={() => handleStatClick('resolved')}
                    style={{ '--stat-color': 'var(--status-resolved)' } as React.CSSProperties}
                >
                    <div className={styles.statIcon} style={{ background: 'var(--status-resolved-bg)' }}>
                        <svg viewBox="0 0 24 24" fill="var(--status-resolved)" width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats.resolved}</span>
                        <span className={styles.statLabel}>Resolved</span>
                    </div>
                </div>

                <div
                    className={`${styles.statCard} ${dateFilter === 'today' ? styles.active : ''}`}
                    onClick={() => setDateFilter(dateFilter === 'today' ? 'all' : 'today')}
                    style={{ '--stat-color': '#7c3aed' } as React.CSSProperties}
                >
                    <div className={styles.statIcon} style={{ background: '#f3e8ff' }}>
                        <svg viewBox="0 0 24 24" fill="#7c3aed" width="24" height="24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                    </div>
                    <div className={styles.statContent}>
                        <span className={styles.statValue}>{stats.today}</span>
                        <span className={styles.statLabel}>Reported Today</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.filterPills}>
                    <button
                        className={`${styles.filterPill} ${dateFilter === 'all' ? styles.active : ''}`}
                        onClick={() => setDateFilter('all')}
                    >
                        All Time
                    </button>
                    <button
                        className={`${styles.filterPill} ${dateFilter === 'today' ? styles.active : ''}`}
                        onClick={() => setDateFilter('today')}
                    >
                        Today
                    </button>
                    <button
                        className={`${styles.filterPill} ${dateFilter === 'week' ? styles.active : ''}`}
                        onClick={() => setDateFilter('week')}
                    >
                        This Week
                    </button>
                    <button
                        className={`${styles.filterPill} ${dateFilter === 'month' ? styles.active : ''}`}
                        onClick={() => setDateFilter('month')}
                    >
                        This Month
                    </button>
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

                {hasActiveFilters && (
                    <button onClick={clearAllFilters} className={styles.clearFilters}>
                        Clear all filters
                    </button>
                )}
            </div>

            {/* Incidents List */}
            <section className={styles.incidentsSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        Recent Incidents
                        <span className={styles.incidentCount}>{incidents.length}</span>
                    </h2>
                    <Link href="/police/incidents" className={styles.viewAllLink}>
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : incidents.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <p className={styles.emptyStateText}>No incidents found</p>
                        <p className={styles.emptyStateHint}>
                            {hasActiveFilters
                                ? 'Try adjusting your filters to see more results'
                                : 'New incidents will appear here when reported'}
                        </p>
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
                                                <span className={`${styles.priorityBadge} ${priorityBadge.className}`}>
                                                    {priorityBadge.label}
                                                </span>
                                            )}
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
                                        <div className={styles.quickActions}>
                                            <button
                                                className={styles.quickActionBtn}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    router.push(`/police/incident/${incident.id}`);
                                                }}
                                                title="View details"
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                </svg>
                                            </button>
                                            <button
                                                className={styles.quickActionBtn}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    // TODO: Implement assign functionality
                                                }}
                                                title="Assign officer"
                                            >
                                                <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className={styles.incidentTitle}>{incident.title}</h3>

                                    {incident.description && (
                                        <p className={styles.incidentDesc}>
                                            {incident.description}
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
                                                <svg viewBox="0 0 24 24" fill="currentColor">
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
        </>
    );
}
