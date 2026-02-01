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
    address: string;
    created_at: string;
    user: {
        full_name: string;
    };
    category: {
        name: string;
        color: string;
    };
    area: {
        name: string;
    } | null;
}

export default function PoliceAllIncidentsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
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

            const { data } = await supabase
                .from('incidents')
                .select(`
          id, tracking_id, title, status, priority, address, created_at,
          user:profiles!incidents_user_id_fkey(full_name),
          category:categories(name, color),
          area:areas(name)
        `)
                .order('created_at', { ascending: false });

            if (data) setIncidents(data as unknown as Incident[]);
            setLoading(false);
        }

        loadData();
    }, [supabase, router]);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted': return { label: 'New', color: '#D32F2F', bg: '#FFEBEE' };
            case 'in_review': return { label: 'In Review', color: '#F57C00', bg: '#FFF3E0' };
            case 'action_taken': return { label: 'Action Taken', color: '#1976D2', bg: '#E3F2FD' };
            case 'resolved': return { label: 'Resolved', color: '#388E3C', bg: '#E8F5E9' };
            default: return { label: status, color: '#757575', bg: '#F5F5F5' };
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const filteredIncidents = incidents.filter(inc =>
        inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inc.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
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
                    <Link href="/police/incidents" className={`${styles.navLink} ${styles.active}`}>
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
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>All Incidents</h1>
                        <p className={styles.pageSubtitle}>{incidents.length} total reports</p>
                    </div>
                    <div className={styles.searchBox}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search by title, ID, or reporter..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
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
                                    <tr
                                        key={incident.id}
                                        onClick={() => router.push(`/police/incident/${incident.id}`)}
                                    >
                                        <td className={styles.trackingId}>#{incident.tracking_id}</td>
                                        <td className={styles.title}>{incident.title}</td>
                                        <td>
                                            <span style={{ color: incident.category?.color }}>
                                                {incident.category?.name}
                                            </span>
                                        </td>
                                        <td>{incident.user?.full_name}</td>
                                        <td>{incident.area?.name || '-'}</td>
                                        <td>{formatDate(incident.created_at)}</td>
                                        <td>
                                            <span
                                                className={styles.statusBadge}
                                                style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                            >
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
