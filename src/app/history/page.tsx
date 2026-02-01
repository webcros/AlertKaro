'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useNotifications } from '@/lib/NotificationContext';
import styles from './page.module.css';

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    status: string;
    address: string;
    created_at: string;
    category: {
        name: string;
        icon: string;
        color: string;
    };
}

export default function HistoryPage() {
    const router = useRouter();
    const supabase = createClient();
    const { unreadCount } = useNotifications();

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

    useEffect(() => {
        async function loadIncidents() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                let query = supabase
                    .from('incidents')
                    .select(`
            id,
            tracking_id,
            title,
            status,
            address,
            created_at,
            category:categories(name, icon, color)
          `)
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false });

                if (filter === 'active') {
                    query = query.in('status', ['submitted', 'in_review', 'action_taken']);
                } else if (filter === 'resolved') {
                    query = query.eq('status', 'resolved');
                }

                const { data } = await query;
                setIncidents((data as unknown as Incident[]) || []);
            } catch (error) {
                console.error('Error loading incidents:', error);
            } finally {
                setLoading(false);
            }
        }

        loadIncidents();
    }, [supabase, router, filter]);

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted':
                return { label: 'Received', color: '#757575' };
            case 'in_review':
                return { label: 'In Progress', color: '#F57C00' };
            case 'action_taken':
                return { label: 'Action Taken', color: '#1976D2' };
            case 'resolved':
                return { label: 'Resolved', color: '#388E3C' };
            default:
                return { label: status, color: '#757575' };
        }
    };

    return (
        <main className={styles.page}>
            {/* Header */}
            <header className={styles.header}>
                <h1 className={styles.headerTitle}>My Reports</h1>
            </header>

            {/* Filter Tabs */}
            <div className={styles.filterTabs}>
                <button
                    onClick={() => setFilter('all')}
                    className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
                >
                    All
                </button>
                <button
                    onClick={() => setFilter('active')}
                    className={`${styles.filterTab} ${filter === 'active' ? styles.active : ''}`}
                >
                    Active
                </button>
                <button
                    onClick={() => setFilter('resolved')}
                    className={`${styles.filterTab} ${filter === 'resolved' ? styles.active : ''}`}
                >
                    Resolved
                </button>
            </div>

            <div className={styles.content}>
                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                    </div>
                ) : incidents.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg viewBox="0 0 24 24" fill="currentColor" className={styles.emptyIcon}>
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        <p>No reports found</p>
                        <span>
                            {filter === 'all'
                                ? 'Start by reporting an incident'
                                : `No ${filter} reports`}
                        </span>
                    </div>
                ) : (
                    <div className={styles.list}>
                        {incidents.map((incident) => {
                            const statusInfo = getStatusInfo(incident.status);
                            return (
                                <Link
                                    href={`/incident/${incident.id}`}
                                    key={incident.id}
                                    className={styles.card}
                                >
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardInfo}>
                                            <h3 className={styles.cardTitle}>{incident.title}</h3>
                                            <p className={styles.cardId}>#{incident.tracking_id}</p>
                                        </div>
                                        <span
                                            className={styles.badge}
                                            style={{
                                                backgroundColor: `${statusInfo.color}15`,
                                                color: statusInfo.color,
                                                borderColor: `${statusInfo.color}30`,
                                            }}
                                        >
                                            {statusInfo.label}
                                        </span>
                                    </div>
                                    <div className={styles.cardMeta}>
                                        <span className={styles.category} style={{ color: incident.category?.color }}>
                                            {incident.category?.name}
                                        </span>
                                        <span className={styles.date}>{formatDate(incident.created_at)}</span>
                                    </div>
                                </Link>
                            );
                        })}
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
                <Link href="/history" className={`${styles.navItem} ${styles.active}`}>
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
