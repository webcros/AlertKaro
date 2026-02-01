'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface AuditLog {
    id: string;
    event_type: string;
    event_description: string;
    user_id: string;
    metadata: Record<string, unknown>;
    created_at: string;
    user?: { full_name: string; email: string };
}

export default function AdminAuditPage() {
    const router = useRouter();
    const supabase = createClient();

    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState('all');

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profileData || profileData.role !== 'admin') { router.push('/dashboard'); return; }

            await loadLogs();
        }
        loadData();
    }, [supabase, router]);

    async function loadLogs() {
        let query = supabase.from('audit_logs')
            .select(`*, user:profiles(full_name, email)`)
            .order('created_at', { ascending: false })
            .limit(100);

        if (eventFilter !== 'all') query = query.eq('event_type', eventFilter);

        const { data } = await query;
        if (data) setLogs(data as unknown as AuditLog[]);
        setLoading(false);
    }

    useEffect(() => {
        if (!loading) loadLogs();
    }, [eventFilter]);

    const getEventColor = (type: string) => {
        if (type.includes('create') || type.includes('new')) return '#22c55e';
        if (type.includes('update') || type.includes('edit')) return '#3b82f6';
        if (type.includes('delete') || type.includes('remove')) return '#ef4444';
        if (type.includes('login') || type.includes('auth')) return '#a855f7';
        return '#64748b';
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) {
        return <div className={styles.loading}><div className={styles.spinner}></div></div>;
    }

    return (
        <div className={styles.page}>
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>AlertKaro</span>
                    <span className={styles.adminBadge}>Admin</span>
                </div>
                <nav className={styles.nav}>
                    <Link href="/admin" className={styles.navLink}>Dashboard</Link>
                    <Link href="/admin/users" className={styles.navLink}>Users</Link>
                    <Link href="/admin/police" className={styles.navLink}>Police</Link>
                    <Link href="/admin/incidents" className={styles.navLink}>Incidents</Link>
                    <Link href="/admin/categories" className={styles.navLink}>Categories</Link>
                    <Link href="/admin/areas" className={styles.navLink}>Areas</Link>
                    <Link href="/admin/audit" className={`${styles.navLink} ${styles.active}`}>Audit Logs</Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Audit Logs</h1>
                        <p className={styles.pageSubtitle}>System activity and security logs</p>
                    </div>
                    <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)} className={styles.filterSelect}>
                        <option value="all">All Events</option>
                        <option value="login">Login</option>
                        <option value="incident_created">Incident Created</option>
                        <option value="status_update">Status Update</option>
                        <option value="role_change">Role Change</option>
                    </select>
                </header>

                {logs.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
                        </svg>
                        <p>No audit logs found</p>
                        <span>System events will appear here</span>
                    </div>
                ) : (
                    <div className={styles.logsList}>
                        {logs.map((log) => (
                            <div key={log.id} className={styles.logItem}>
                                <div className={styles.logIcon} style={{ backgroundColor: getEventColor(log.event_type) + '20', color: getEventColor(log.event_type) }}>
                                    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                </div>
                                <div className={styles.logContent}>
                                    <div className={styles.logHeader}>
                                        <span className={styles.eventType}>{log.event_type.replace(/_/g, ' ')}</span>
                                        <span className={styles.logTime}>{formatDate(log.created_at)}</span>
                                    </div>
                                    <p className={styles.logDescription}>{log.event_description}</p>
                                    {log.user && (
                                        <span className={styles.logUser}>
                                            By: {log.user.full_name} ({log.user.email})
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
