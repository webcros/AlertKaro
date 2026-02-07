'use client';

import { useEffect, useState } from 'react';
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

interface Insight {
    icon: string;
    text: string;
    type: 'info' | 'success' | 'warning';
}

export default function PoliceAnalyticsPage() {
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
    const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
    const [statusStats, setStatusStats] = useState<StatusStats[]>([]);
    const [totals, setTotals] = useState({ total: 0, thisWeek: 0, thisMonth: 0, resolved: 0, lastWeek: 0, lastMonth: 0 });
    const [insights, setInsights] = useState<Insight[]>([]);

    useEffect(() => {
        async function loadData() {
            // Get date ranges
            const now = new Date();
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

            // Load totals with comparison periods
            const [totalRes, weekRes, monthRes, resolvedRes, lastWeekRes, lastMonthRes] = await Promise.all([
                supabase.from('incidents').select('*', { count: 'exact', head: true }),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).gte('created_at', monthAgo.toISOString()),
                supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('status', 'resolved'),
                supabase.from('incidents').select('*', { count: 'exact', head: true })
                    .gte('created_at', twoWeeksAgo.toISOString())
                    .lt('created_at', weekAgo.toISOString()),
                supabase.from('incidents').select('*', { count: 'exact', head: true })
                    .gte('created_at', twoMonthsAgo.toISOString())
                    .lt('created_at', monthAgo.toISOString()),
            ]);

            const totalsData = {
                total: totalRes.count || 0,
                thisWeek: weekRes.count || 0,
                thisMonth: monthRes.count || 0,
                resolved: resolvedRes.count || 0,
                lastWeek: lastWeekRes.count || 0,
                lastMonth: lastMonthRes.count || 0,
            };
            setTotals(totalsData);

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

            let catStats: CategoryStats[] = [];
            if (categories) {
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
                // Sort by count descending
                catStats = catStats.sort((a, b) => b.count - a.count);
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

            // Generate insights
            const generatedInsights: Insight[] = [];

            // Week over week comparison
            if (totalsData.lastWeek > 0) {
                const weekChange = ((totalsData.thisWeek - totalsData.lastWeek) / totalsData.lastWeek) * 100;
                if (weekChange > 15) {
                    generatedInsights.push({
                        icon: '📈',
                        text: `Incidents increased by ${Math.round(weekChange)}% this week compared to last week`,
                        type: 'warning'
                    });
                } else if (weekChange < -15) {
                    generatedInsights.push({
                        icon: '📉',
                        text: `Incidents decreased by ${Math.abs(Math.round(weekChange))}% this week`,
                        type: 'success'
                    });
                }
            }

            // Resolution rate insight
            const resolutionRate = totalsData.total > 0 ? (totalsData.resolved / totalsData.total) * 100 : 0;
            if (resolutionRate >= 80) {
                generatedInsights.push({
                    icon: '✅',
                    text: `Excellent resolution rate of ${Math.round(resolutionRate)}%`,
                    type: 'success'
                });
            } else if (resolutionRate < 50) {
                generatedInsights.push({
                    icon: '⚠️',
                    text: `Resolution rate is ${Math.round(resolutionRate)}% — consider prioritizing pending cases`,
                    type: 'warning'
                });
            }

            // Busiest day insight
            if (dailyData.length > 0) {
                const maxDay = dailyData.reduce((max, day) => day.count > max.count ? day : max, dailyData[0]);
                if (maxDay.count > 0) {
                    generatedInsights.push({
                        icon: '📅',
                        text: `${maxDay.date} was the busiest day with ${maxDay.count} incidents`,
                        type: 'info'
                    });
                }
            }

            // Top category insight
            if (catStats.length > 0 && catStats[0].count > 0) {
                generatedInsights.push({
                    icon: '🏷️',
                    text: `"${catStats[0].name}" is the most reported category with ${catStats[0].count} incidents`,
                    type: 'info'
                });
            }

            // Pending cases insight
            const pendingCount = sStats.find(s => s.status === 'submitted')?.count || 0;
            if (pendingCount > 10) {
                generatedInsights.push({
                    icon: '🚨',
                    text: `${pendingCount} incidents are still pending review`,
                    type: 'warning'
                });
            }

            setInsights(generatedInsights);
            setLoading(false);
        }

        loadData();
    }, [supabase]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'submitted': return 'Pending';
            case 'in_review': return 'In Review';
            case 'action_taken': return 'In Progress';
            case 'resolved': return 'Resolved';
            default: return status;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'submitted': return '#dc2626';
            case 'in_review': return '#d97706';
            case 'action_taken': return '#2563eb';
            case 'resolved': return '#059669';
            default: return '#64748b';
        }
    };

    const calculateTrend = (current: number, previous: number) => {
        if (previous === 0) return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'neutral' };
        const change = ((current - previous) / previous) * 100;
        return {
            value: Math.abs(Math.round(change)),
            direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
        };
    };

    const maxDaily = Math.max(...dailyStats.map(d => d.count), 1);
    const resolutionRate = totals.total > 0 ? Math.round((totals.resolved / totals.total) * 100) : 0;
    const weekTrend = calculateTrend(totals.thisWeek, totals.lastWeek);
    const monthTrend = calculateTrend(totals.thisMonth, totals.lastMonth);
    const totalStatusCount = statusStats.reduce((sum, s) => sum + s.count, 0);

    if (loading) {
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
                    <h1 className={styles.pageTitle}>Analytics</h1>
                    <p className={styles.pageSubtitle}>Incident statistics and insights</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.exportBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" />
                        </svg>
                        Export Report
                    </button>
                </div>
            </header>

            {/* Summary Cards */}
            <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: 'var(--police-accent-bg)' }}>
                        <svg viewBox="0 0 24 24" fill="var(--police-accent)" width="24" height="24">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                    </div>
                    <div className={styles.summaryContent}>
                        <span className={styles.summaryValue}>{totals.total}</span>
                        <span className={styles.summaryLabel}>Total Incidents</span>
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: '#fef3c7' }}>
                        <svg viewBox="0 0 24 24" fill="#d97706" width="24" height="24">
                            <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                    </div>
                    <div className={styles.summaryContent}>
                        <span className={styles.summaryValue}>{totals.thisWeek}</span>
                        <span className={styles.summaryLabel}>New This Week</span>
                        {weekTrend.value > 0 && (
                            <span className={`${styles.trend} ${styles[weekTrend.direction]}`}>
                                {weekTrend.direction === 'up' ? '↑' : '↓'} {weekTrend.value}%
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: '#dbeafe' }}>
                        <svg viewBox="0 0 24 24" fill="#2563eb" width="24" height="24">
                            <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zM5 8V6h14v2H5zm2 4h10v2H7zm0 4h7v2H7z" />
                        </svg>
                    </div>
                    <div className={styles.summaryContent}>
                        <span className={styles.summaryValue}>{totals.thisMonth}</span>
                        <span className={styles.summaryLabel}>New This Month</span>
                        {monthTrend.value > 0 && (
                            <span className={`${styles.trend} ${styles[monthTrend.direction]}`}>
                                {monthTrend.direction === 'up' ? '↑' : '↓'} {monthTrend.value}%
                            </span>
                        )}
                    </div>
                </div>
                <div className={styles.summaryCard}>
                    <div className={styles.summaryIcon} style={{ background: resolutionRate >= 70 ? '#dcfce7' : '#fef2f2' }}>
                        <svg viewBox="0 0 24 24" fill={resolutionRate >= 70 ? '#059669' : '#dc2626'} width="24" height="24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </div>
                    <div className={styles.summaryContent}>
                        <span className={styles.summaryValue}>{resolutionRate}%</span>
                        <span className={styles.summaryLabel}>Resolution Rate</span>
                        <span className={`${styles.trend} ${resolutionRate >= 70 ? styles.up : styles.down}`}>
                            {totals.resolved} of {totals.total} resolved
                        </span>
                    </div>
                </div>
            </div>

            {/* Insights Section */}
            {insights.length > 0 && (
                <div className={styles.insightsSection}>
                    <h2 className={styles.sectionTitle}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6C7.8 12.16 7 10.63 7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" />
                        </svg>
                        Key Insights
                    </h2>
                    <div className={styles.insightsList}>
                        {insights.map((insight, i) => (
                            <div key={i} className={`${styles.insightCard} ${styles[insight.type]}`}>
                                <span className={styles.insightIcon}>{insight.icon}</span>
                                <span className={styles.insightText}>{insight.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.chartsGrid}>
                {/* Daily Trend - Line Chart Style */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>Daily Trend</h2>
                        <span className={styles.chartSubtitle}>Last 7 days</span>
                    </div>
                    <div className={styles.lineChart}>
                        <div className={styles.lineChartGrid}>
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className={styles.gridLine}></div>
                            ))}
                        </div>
                        <svg className={styles.lineChartSvg} viewBox={`0 0 ${dailyStats.length * 50} 120`} preserveAspectRatio="none">
                            {/* Area under line */}
                            <path
                                d={`
                                        M 0 ${120 - (dailyStats[0]?.count / maxDaily) * 100}
                                        ${dailyStats.map((d, i) => `L ${i * 50 + 25} ${120 - (d.count / maxDaily) * 100}`).join(' ')}
                                        L ${(dailyStats.length - 1) * 50 + 25} 120
                                        L 0 120
                                        Z
                                    `}
                                fill="url(#areaGradient)"
                            />
                            {/* Line */}
                            <path
                                d={`M ${dailyStats.map((d, i) => `${i * 50 + 25} ${120 - (d.count / maxDaily) * 100}`).join(' L ')}`}
                                fill="none"
                                stroke="var(--police-accent)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Points */}
                            {dailyStats.map((d, i) => (
                                <circle
                                    key={i}
                                    cx={i * 50 + 25}
                                    cy={120 - (d.count / maxDaily) * 100}
                                    r="5"
                                    fill="white"
                                    stroke="var(--police-accent)"
                                    strokeWidth="3"
                                />
                            ))}
                            <defs>
                                <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--police-accent)" stopOpacity="0.3" />
                                    <stop offset="100%" stopColor="var(--police-accent)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className={styles.lineChartLabels}>
                            {dailyStats.map((d, i) => (
                                <div key={i} className={styles.chartLabel}>
                                    <span className={styles.labelDay}>{d.date}</span>
                                    <span className={styles.labelValue}>{d.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status Distribution - Donut Chart */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>By Status</h2>
                        <span className={styles.chartSubtitle}>Current distribution</span>
                    </div>
                    <div className={styles.donutChart}>
                        <div className={styles.donutWrapper}>
                            <svg viewBox="0 0 100 100" className={styles.donutSvg}>
                                {(() => {
                                    let offset = 0;
                                    return statusStats.map((stat, i) => {
                                        const percentage = totalStatusCount > 0 ? (stat.count / totalStatusCount) * 100 : 0;
                                        const strokeDasharray = `${percentage * 2.51} ${251.2 - percentage * 2.51}`;
                                        const strokeDashoffset = -offset * 2.51;
                                        offset += percentage;
                                        return (
                                            <circle
                                                key={i}
                                                cx="50"
                                                cy="50"
                                                r="40"
                                                fill="none"
                                                stroke={getStatusColor(stat.status)}
                                                strokeWidth="12"
                                                strokeDasharray={strokeDasharray}
                                                strokeDashoffset={strokeDashoffset}
                                                className={styles.donutSegment}
                                            />
                                        );
                                    });
                                })()}
                            </svg>
                            <div className={styles.donutCenter}>
                                <span className={styles.donutValue}>{totals.total}</span>
                                <span className={styles.donutLabel}>Total</span>
                            </div>
                        </div>
                        <div className={styles.donutLegend}>
                            {statusStats.map((stat) => (
                                <div key={stat.status} className={styles.legendItem}>
                                    <span className={styles.legendDot} style={{ background: getStatusColor(stat.status) }}></span>
                                    <span className={styles.legendLabel}>{getStatusLabel(stat.status)}</span>
                                    <span className={styles.legendValue}>{stat.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* By Category - Horizontal Bars */}
                <div className={styles.chartCard}>
                    <div className={styles.chartHeader}>
                        <h2 className={styles.chartTitle}>By Category</h2>
                        <span className={styles.chartSubtitle}>All time</span>
                    </div>
                    <div className={styles.categoryList}>
                        {categoryStats.map((cat) => {
                            const percentage = totals.total > 0 ? (cat.count / totals.total) * 100 : 0;
                            return (
                                <div key={cat.name} className={styles.categoryItem}>
                                    <div className={styles.categoryHeader}>
                                        <span className={styles.categoryName}>{cat.name}</span>
                                        <span className={styles.categoryCount}>{cat.count}</span>
                                    </div>
                                    <div className={styles.categoryBar}>
                                        <div
                                            className={styles.categoryFill}
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: cat.color
                                            }}
                                        ></div>
                                    </div>
                                    <span className={styles.categoryPercent}>{Math.round(percentage)}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

