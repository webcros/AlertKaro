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
    status: string;
    priority: string;
    created_at: string;
    user: { full_name: string };
    category: { name: string; color: string };
    area: { name: string } | null;
}

export default function AdminIncidentsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profileData || profileData.role !== 'admin') { router.push('/dashboard'); return; }

            await loadIncidents();
        }
        loadData();
    }, [supabase, router]);

    async function loadIncidents() {
        let query = supabase.from('incidents')
            .select(`id, tracking_id, title, status, priority, created_at,
        user:profiles!incidents_user_id_fkey(full_name),
        category:categories(name, color),
        area:areas(name)`)
            .order('created_at', { ascending: false });

        if (statusFilter !== 'all') query = query.eq('status', statusFilter);

        const { data } = await query;
        if (data) setIncidents(data as unknown as Incident[]);
        setLoading(false);
    }

    useEffect(() => {
        if (!loading) loadIncidents();
    }, [statusFilter]);

    const handleExportCSV = () => {
        const headers = ['Tracking ID', 'Title', 'Category', 'Reporter', 'Area', 'Status', 'Priority', 'Date'];
        const rows = incidents.map(i => [
            i.tracking_id, i.title, i.category?.name || '', i.user?.full_name || '',
            i.area?.name || '', i.status, i.priority, new Date(i.created_at).toLocaleDateString()
        ]);
        const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incidents_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted': return { label: 'New', color: '#D32F2F', bg: '#FFEBEE' };
            case 'in_review': return { label: 'In Review', color: '#F57C00', bg: '#FFF3E0' };
            case 'action_taken': return { label: 'Action Taken', color: '#1976D2', bg: '#E3F2FD' };
            case 'resolved': return { label: 'Resolved', color: '#388E3C', bg: '#E8F5E9' };
            default: return { label: status, color: '#757575', bg: '#F5F5F5' };
        }
    };

    const filteredIncidents = incidents.filter(i =>
        i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.tracking_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                    <Link href="/admin/incidents" className={`${styles.navLink} ${styles.active}`}>Incidents</Link>
                    <Link href="/admin/categories" className={styles.navLink}>Categories</Link>
                    <Link href="/admin/areas" className={styles.navLink}>Areas</Link>
                    <Link href="/admin/audit" className={styles.navLink}>Audit Logs</Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Incident Management</h1>
                        <p className={styles.pageSubtitle}>{incidents.length} total incidents</p>
                    </div>
                    <div className={styles.headerActions}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={styles.filterSelect}>
                            <option value="all">All Status</option>
                            <option value="submitted">New</option>
                            <option value="in_review">In Review</option>
                            <option value="action_taken">Action Taken</option>
                            <option value="resolved">Resolved</option>
                        </select>
                        <button onClick={handleExportCSV} className={styles.exportBtn}>
                            Export CSV
                        </button>
                    </div>
                </header>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Tracking ID</th>
                                <th>Title</th>
                                <th>Category</th>
                                <th>Reporter</th>
                                <th>Area</th>
                                <th>Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredIncidents.map((incident) => {
                                const statusInfo = getStatusInfo(incident.status);
                                return (
                                    <tr key={incident.id} onClick={() => router.push(`/police/incident/${incident.id}`)}>
                                        <td className={styles.trackingId}>#{incident.tracking_id}</td>
                                        <td className={styles.title}>{incident.title}</td>
                                        <td><span style={{ color: incident.category?.color }}>{incident.category?.name}</span></td>
                                        <td>{incident.user?.full_name}</td>
                                        <td>{incident.area?.name || '-'}</td>
                                        <td>{new Date(incident.created_at).toLocaleDateString('en-IN')}</td>
                                        <td>
                                            <span className={styles.statusBadge} style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}>
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
}
