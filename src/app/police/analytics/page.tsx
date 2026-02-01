'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface DailyStats {
    date: string;
    count: number;
}

interface CategoryStats {
    name: string;
    color: string;
    count: number;
}

interface StatusStats {
    status: string;
    count: number;
}

export default function PoliceAnalyticsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [profile, setProfile] = useState<{ full_name: string; role: string } | null>(null);
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
    const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
    const [totals, setTotals] = useState({ total: 0, thisWeek: 0, thisMonth: 0, resolved: 0 });

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

            // Get date ranges
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

            // Load totals
            const [totalRes, weekRes, monthRes, resolvedRes] = await Promise.all([
                supabase.from('incidents').select('*', { count: 'exact', head: true }),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString()),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
            ]);

            setTotals({
                total: totalRes.count || 0,
                thisWeek: weekRes.count || 0,
                thisMonth: monthRes.count || 0,
                resolved: resolvedRes.count || 0,
            });

            // Load daily stats for last 7 days
            const dailyData: DailyStats[] = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date(now);
                date.setDate(date.getDate() - i);
                date.setHours(0, 0, 0, 0);
                const nextDate = new Date(date);
                nextDate.setDate(nextDate.getDate() + 1);

                const { count } = await supabase
                    .from('incidents')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', date.toISOString())
                    .lt('created_at', nextDate.toISOString());

                dailyData.push({
                    date: date.toLocaleDateString('en-IN', { weekday: 'short' }),
                    count: count || 0,
                });
            }
            setDailyStats(dailyData);

            // Load category stats
            const { data: categories } = await supabase
                .from('categories')
                .select('id, name, color');

            if (categories) {
                const catStats: CategoryStats[] = [];
                for (const cat of categories) {
                    const { count } = await supabase
                        .from('incidents')
                        .select('*', { count: 'exact', head: true })
                        .eq('category_id', cat.id);

                    catStats.push({
                        name: cat.name,
                        color: cat.color,
                        count: count || 0,
                    });
                }
                setCategoryStats(catStats);
            }

            // Load status stats
            const statuses = ['submitted', 'in_review', 'action_taken', 'resolved'];
            const sStats: StatusStats[] = [];
            for (const status of statuses) {
                const { count } = await supabase
                    .from('incidents')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', status);

                sStats.push({ status, count: count || 0 });
            }
            setStatusStats(sStats);

            setLoading(false);
        }

        loadData();
    }, [supabase, router]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'New';
            case 'in_review': return 'In Review';
            case 'action_taken': return 'Action Taken';
            case 'resolved': return 'Resolved';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return '#D32F2F';
            case 'in_review': return '#F57C00';
            case 'action_taken': return '#1976D2';
            case 'resolved': return '#388E3C';
            default: return '#757575';
        }
    };

    const maxDaily = Math.max(...dailyStats.map(d => d.count), 1);

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
                    <Link href="/police" className={styles.navLink}>
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
                    <Link href="/police/analytics" className={`${styles.navLink} ${styles.active}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                        </svg>
                        Analytics
                    </Link>
                </nav>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.pageTitle}>Analytics</h1>
                    <p className={styles.pageSubtitle}>Incident statistics and trends</p>
                </header>

                {/* Summary Cards */}
                <div className={styles.summaryGrid}>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{totals.total}</span>
                        <span className={styles.summaryLabel}>Total Cases</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{totals.thisWeek}</span>
                        <span className={styles.summaryLabel}>This Week</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>{totals.thisMonth}</span>
                        <span className={styles.summaryLabel}>This Month</span>
                    </div>
                    <div className={styles.summaryCard}>
                        <span className={styles.summaryValue}>
                            {totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0}%
                        </span>
                        <span className={styles.summaryLabel}>Resolution Rate</span>
                    </div>
                </div>

                <div className={styles.chartsGrid}>
                    {/* Daily Trend */}
                    <div className={styles.chartCard}>
                        <h2 className={styles.chartTitle}>Daily Incidents (Last 7 Days)</h2>
                        <div className={styles.barChart}>
                            {dailyStats.map((day, i) => (
                                <div key={i} className={styles.barGroup}>
                                    <div className={styles.barWrapper}>
                                        <div
                                            className={styles.bar}
                                            style={{ height: `${(day.count / maxDaily) * 100}%` }}
                                        >
                                            <span className={styles.barValue}>{day.count}</span>
                                        </div>
                                    </div>
                                    <span className={styles.barLabel}>{day.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* By Status */}
                    <div className={styles.chartCard}>
                        <h2 className={styles.chartTitle}>By Status</h2>
                        <div className={styles.statusList}>
                            {statusStats.map((stat) => (
                                <div key={stat.status} className={styles.statusItem}>
                                    <div className={styles.statusInfo}>
                                        <span
                                            className={styles.statusDot}
                                            style={{ backgroundColor: getStatusColor(stat.status) }}
                                        ></span>
                                        <span>{getStatusLabel(stat.status)}</span>
                                    </div>
                                    <div className={styles.statusBar}>
                                        <div
                                            className={styles.statusFill}
                                            style={{
                                                width: `${totals.total > 0 ? (stat.count / totals.total) * 100 : 0}%`,
                                                backgroundColor: getStatusColor(stat.status)
                                            }}
                                        ></div>
                                    </div>
                                    <span className={styles.statusCount}>{stat.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* By Category */}
                    <div className={styles.chartCard}>
                        <h2 className={styles.chartTitle}>By Category</h2>
                        <div className={styles.categoryList}>
                            {categoryStats.map((cat) => (
                                <div key={cat.name} className={styles.categoryItem}>
                                    <div className={styles.categoryInfo}>
                                        <span
                                            className={styles.categoryDot}
                                            style={{ backgroundColor: cat.color }}
                                        ></span>
                                        <span>{cat.name}</span>
                                    </div>
                                    <div className={styles.categoryBar}>
                                        <div
                                            className={styles.categoryFill}
                                            style={{
                                                width: `${totals.total > 0 ? (cat.count / totals.total) * 100 : 0}%`,
                                                backgroundColor: cat.color
                                            }}
                                        ></div>
                                    </div>
                                    <span className={styles.categoryCount}>{cat.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
