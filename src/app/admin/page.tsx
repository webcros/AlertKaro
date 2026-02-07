'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';


interface Stats {
    totalUsers: number;
    totalPolice: number;
    totalIncidents: number;
    pendingIncidents: number;
    resolvedIncidents: number;
    todayIncidents: number;
    categories: number;
    areas: number;
}

interface RecentActivity {
    id: string;
    type: 'incident' | 'user';
    title: string;
    timestamp: string;
}

export default function AdminDashboardPage() {
    const supabase = createClient();

    const [stats, setStats] = useState<Stats | null>(null);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            // Load stats
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const [
                usersRes,
                policeRes,
                incidentsRes,
                pendingRes,
                resolvedRes,
                todayRes,
                categoriesRes,
                areasRes,
            ] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'citizen'),
                supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'police'),
                supabase.from('incidents').select('*', { count: 'exact', head: true }),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
                supabase.from('categories').select('*', { count: 'exact', head: true }),
                supabase.from('areas').select('*', { count: 'exact', head: true }),
            ]);

            setStats({
                totalUsers: usersRes.count || 0,
                totalPolice: policeRes.count || 0,
                totalIncidents: incidentsRes.count || 0,
                pendingIncidents: pendingRes.count || 0,
                resolvedIncidents: resolvedRes.count || 0,
                todayIncidents: todayRes.count || 0,
                categories: categoriesRes.count || 0,
                areas: areasRes.count || 0,
            });

            // Recent incidents
            const { data: recentIncidents } = await supabase
                .from('incidents')
                .select('id, title, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            // Recent users
            const { data: recentUsers } = await supabase
                .from('profiles')
                .select('id, full_name, created_at')
                .order('created_at', { ascending: false })
                .limit(5);

            const activities: RecentActivity[] = [
                ...(recentIncidents || []).map(i => ({
                    id: i.id,
                    type: 'incident' as const,
                    title: `New incident: ${i.title}`,
                    timestamp: i.created_at,
                })),
                ...(recentUsers || []).map(u => ({
                    id: u.id,
                    type: 'user' as const,
                    title: `New user: ${u.full_name}`,
                    timestamp: u.created_at,
                })),
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8);

            setRecentActivity(activities);
            setLoading(false);
        }

        loadData();
    }, [supabase]);

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
        return `${diffDays}d ago`;
    };

    if (loading || !stats) {
        return (
            <div className={styles.contentLoading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.pageTitle}>Admin Dashboard</h1>
                    <p className={styles.pageSubtitle}>System overview and management</p>
                </div>
            </header>

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <Link href="/admin/users" className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#E3F2FD' }}>
                        <svg viewBox="0 0 24 24" fill="#1976D2" width="24" height="24">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                    </div>
                    <div>
                        <span className={styles.statValue}>{stats.totalUsers}</span>
                        <span className={styles.statLabel}>Citizens</span>
                    </div>
                </Link>
                <Link href="/admin/police" className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#E8F5E9' }}>
                        <svg viewBox="0 0 24 24" fill="#388E3C" width="24" height="24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                    </div>
                    <div>
                        <span className={styles.statValue}>{stats.totalPolice}</span>
                        <span className={styles.statLabel}>Police Officers</span>
                    </div>
                </Link>
                <Link href="/admin/incidents" className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#FFF3E0' }}>
                        <svg viewBox="0 0 24 24" fill="#F57C00" width="24" height="24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div>
                        <span className={styles.statValue}>{stats.totalIncidents}</span>
                        <span className={styles.statLabel}>Total Incidents</span>
                    </div>
                </Link>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#FFEBEE' }}>
                        <svg viewBox="0 0 24 24" fill="#D32F2F" width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div>
                        <span className={styles.statValue}>{stats.pendingIncidents}</span>
                        <span className={styles.statLabel}>Pending</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#E8F5E9' }}>
                        <svg viewBox="0 0 24 24" fill="#388E3C" width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </div>
                    <div>
                        <span className={styles.statValue}>{stats.resolvedIncidents}</span>
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
                        <span className={styles.statValue}>{stats.todayIncidents}</span>
                        <span className={styles.statLabel}>Today</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Recent Activity */}
            <div className={styles.contentGrid}>
                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Quick Actions</h2>
                    <div className={styles.quickActions}>
                        <Link href="/admin/users?action=add" className={styles.actionButton}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                            Add Police User
                        </Link>
                        <Link href="/admin/categories?action=add" className={styles.actionButton}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                            </svg>
                            Add Category
                        </Link>
                        <Link href="/admin/areas?action=add" className={styles.actionButton}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                            </svg>
                            Add Area
                        </Link>
                        <Link href="/admin/incidents?export=csv" className={styles.actionButton}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                            </svg>
                            Export Reports
                        </Link>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2 className={styles.cardTitle}>Recent Activity</h2>
                    {recentActivity.length === 0 ? (
                        <p className={styles.noActivity}>No recent activity</p>
                    ) : (
                        <div className={styles.activityList}>
                            {recentActivity.map((activity) => (
                                <div key={`${activity.type}-${activity.id}`} className={styles.activityItem}>
                                    <div
                                        className={styles.activityIcon}
                                        style={{
                                            background: activity.type === 'incident' ? '#FFF3E0' : '#E3F2FD'
                                        }}
                                    >
                                        {activity.type === 'incident' ? (
                                            <svg viewBox="0 0 24 24" fill="#F57C00" width="16" height="16">
                                                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                            </svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="#1976D2" width="16" height="16">
                                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className={styles.activityContent}>
                                        <p className={styles.activityTitle}>{activity.title}</p>
                                        <span className={styles.activityTime}>{formatTimeAgo(activity.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* System Info */}
            <div className={styles.systemInfo}>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Categories</span>
                    <span className={styles.infoValue}>{stats.categories}</span>
                </div>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Areas</span>
                    <span className={styles.infoValue}>{stats.areas}</span>
                </div>
                <div className={styles.infoItem}>
                    <span className={styles.infoLabel}>Resolution Rate</span>
                    <span className={styles.infoValue}>
                        {stats.totalIncidents > 0
                            ? Math.round((stats.resolvedIncidents / stats.totalIncidents) * 100)
                            : 0}%
                    </span>
                </div>
            </div>
        </>
    );
}

