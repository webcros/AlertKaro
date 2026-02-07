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

interface Category {
    id: string;
    name: string;
    color: string;
}

type SortField = 'created_at' | 'status' | 'category' | 'priority';
type SortOrder = 'asc' | 'desc';

export default function PoliceAllIncidentsPage() {
    const router = useRouter();
    const supabase = createClient();

    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [showFilters, setShowFilters] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function loadData() {
            // Load categories
            const { data: catData } = await supabase
                .from('categories')
                .select('id, name, color')
                .eq('is_active', true);

            if (catData) setCategories(catData);

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
            case 'submitted': return { label: 'Pending', color: 'var(--status-pending)', bg: 'var(--status-pending-bg)' };
            case 'in_review': return { label: 'In Review', color: 'var(--status-in-review)', bg: 'var(--status-in-review-bg)' };
            case 'action_taken': return { label: 'In Progress', color: 'var(--status-in-progress)', bg: 'var(--status-in-progress-bg)' };
            case 'resolved': return { label: 'Resolved', color: 'var(--status-resolved)', bg: 'var(--status-resolved-bg)' };
            default: return { label: status, color: 'var(--police-text-muted)', bg: 'var(--police-surface)' };
        }
    };

    const getPriorityInfo = (priority: string) => {
        switch (priority) {
            case 'urgent': return { label: 'URGENT', color: 'var(--priority-urgent)', bg: 'var(--priority-urgent-bg)' };
            case 'high': return { label: 'HIGH', color: 'var(--priority-high)', bg: 'var(--priority-high-bg)' };
            default: return null;
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const formatTime = (date: string) => {
        return new Date(date).toLocaleTimeString('en-IN', {
            hour: '2-digit', minute: '2-digit',
        });
    };

    // Filter and sort incidents
    const filteredIncidents = incidents
        .filter(inc => {
            // Search filter
            const matchesSearch =
                inc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inc.tracking_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inc.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

            // Status filter
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(inc.status);

            // Category filter
            const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(inc.category?.name);

            // Date filter
            let matchesDate = true;
            if (dateFilter !== 'all') {
                const incidentDate = new Date(inc.created_at);
                const now = new Date();
                if (dateFilter === 'today') {
                    const today = new Date(now.setHours(0, 0, 0, 0));
                    matchesDate = incidentDate >= today;
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(now.setDate(now.getDate() - 7));
                    matchesDate = incidentDate >= weekAgo;
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
                    matchesDate = incidentDate >= monthAgo;
                }
            }

            return matchesSearch && matchesStatus && matchesCategory && matchesDate;
        })
        .sort((a, b) => {
            let comparison = 0;
            if (sortField === 'created_at') {
                comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            } else if (sortField === 'status') {
                comparison = a.status.localeCompare(b.status);
            } else if (sortField === 'category') {
                comparison = (a.category?.name || '').localeCompare(b.category?.name || '');
            } else if (sortField === 'priority') {
                const priorityOrder = { urgent: 0, high: 1, normal: 2 };
                comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
                    (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
            }
            return sortOrder === 'asc' ? comparison : -comparison;
        });

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const toggleStatusFilter = (status: string) => {
        setStatusFilter(prev =>
            prev.includes(status)
                ? prev.filter(s => s !== status)
                : [...prev, status]
        );
    };

    const toggleCategoryFilter = (category: string) => {
        setCategoryFilter(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredIncidents.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredIncidents.map(inc => inc.id)));
        }
    };

    const toggleSelectRow = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const clearAllFilters = () => {
        setStatusFilter([]);
        setCategoryFilter([]);
        setDateFilter('all');
        setSearchQuery('');
    };

    const hasActiveFilters = statusFilter.length > 0 || categoryFilter.length > 0 || dateFilter !== 'all' || searchQuery !== '';

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
                <div className={styles.headerLeft}>
                    <h1 className={styles.pageTitle}>All Incidents</h1>
                    <p className={styles.pageSubtitle}>
                        {filteredIncidents.length} of {incidents.length} incidents
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.searchBox}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Search incidents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                        </svg>
                        Filters
                        {hasActiveFilters && <span className={styles.filterBadge}></span>}
                    </button>
                    <button className={styles.exportBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2v9.67z" />
                        </svg>
                        Export
                    </button>
                </div>
            </header>

            {/* Filters Panel */}
            {showFilters && (
                <div className={styles.filtersPanel}>
                    <div className={styles.filterSection}>
                        <h3 className={styles.filterTitle}>Status</h3>
                        <div className={styles.filterChips}>
                            {[
                                { value: 'submitted', label: 'Pending' },
                                { value: 'in_review', label: 'In Review' },
                                { value: 'action_taken', label: 'In Progress' },
                                { value: 'resolved', label: 'Resolved' },
                            ].map(status => (
                                <button
                                    key={status.value}
                                    className={`${styles.filterChip} ${statusFilter.includes(status.value) ? styles.active : ''}`}
                                    onClick={() => toggleStatusFilter(status.value)}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <h3 className={styles.filterTitle}>Category</h3>
                        <div className={styles.filterChips}>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`${styles.filterChip} ${categoryFilter.includes(cat.name) ? styles.active : ''}`}
                                    onClick={() => toggleCategoryFilter(cat.name)}
                                    style={{ '--chip-color': cat.color } as React.CSSProperties}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={styles.filterSection}>
                        <h3 className={styles.filterTitle}>Date Range</h3>
                        <div className={styles.filterChips}>
                            {[
                                { value: 'all', label: 'All Time' },
                                { value: 'today', label: 'Today' },
                                { value: 'week', label: 'This Week' },
                                { value: 'month', label: 'This Month' },
                            ].map(date => (
                                <button
                                    key={date.value}
                                    className={`${styles.filterChip} ${dateFilter === date.value ? styles.active : ''}`}
                                    onClick={() => setDateFilter(date.value)}
                                >
                                    {date.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {hasActiveFilters && (
                        <button onClick={clearAllFilters} className={styles.clearFilters}>
                            Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Bulk Actions Bar */}
            {selectedIds.size > 0 && (
                <div className={styles.bulkActions}>
                    <span className={styles.bulkCount}>{selectedIds.size} selected</span>
                    <button className={styles.bulkBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                        Assign
                    </button>
                    <button className={styles.bulkBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                        </svg>
                        Change Status
                    </button>
                    <button className={styles.bulkBtn} onClick={() => setSelectedIds(new Set())}>
                        Cancel
                    </button>
                </div>
            )}

            {/* Table */}
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.checkboxCell}>
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === filteredIncidents.length && filteredIncidents.length > 0}
                                    onChange={toggleSelectAll}
                                    className={styles.checkbox}
                                />
                            </th>
                            <th>ID</th>
                            <th>Incident</th>
                            <th>Category</th>
                            <th>Reporter</th>
                            <th
                                className={styles.sortable}
                                onClick={() => handleSort('created_at')}
                            >
                                Date
                                {sortField === 'created_at' && (
                                    <span className={styles.sortIcon}>
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                            <th
                                className={styles.sortable}
                                onClick={() => handleSort('priority')}
                            >
                                Priority
                                {sortField === 'priority' && (
                                    <span className={styles.sortIcon}>
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                            <th
                                className={styles.sortable}
                                onClick={() => handleSort('status')}
                            >
                                Status
                                {sortField === 'status' && (
                                    <span className={styles.sortIcon}>
                                        {sortOrder === 'asc' ? '↑' : '↓'}
                                    </span>
                                )}
                            </th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredIncidents.length === 0 ? (
                            <tr>
                                <td colSpan={9} className={styles.emptyRow}>
                                    <div className={styles.emptyState}>
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                        </svg>
                                        <p>No incidents found</p>
                                        <span>Try adjusting your search or filters</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredIncidents.map((incident) => {
                                const statusInfo = getStatusInfo(incident.status);
                                const priorityInfo = getPriorityInfo(incident.priority);
                                return (
                                    <tr
                                        key={incident.id}
                                        className={selectedIds.has(incident.id) ? styles.selectedRow : ''}
                                    >
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(incident.id)}
                                                onChange={() => toggleSelectRow(incident.id)}
                                                className={styles.checkbox}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </td>
                                        <td className={styles.trackingId}>#{incident.tracking_id}</td>
                                        <td className={styles.titleCell}>
                                            <span className={styles.title}>{incident.title}</span>
                                            {incident.area && (
                                                <span className={styles.location}>
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                                    </svg>
                                                    {incident.area.name}
                                                </span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={styles.categoryChip}
                                                style={{
                                                    borderColor: incident.category?.color,
                                                    color: incident.category?.color
                                                }}
                                            >
                                                {incident.category?.name}
                                            </span>
                                        </td>
                                        <td className={styles.reporter}>
                                            <div className={styles.reporterAvatar}>
                                                {incident.user?.full_name?.charAt(0)}
                                            </div>
                                            {incident.user?.full_name}
                                        </td>
                                        <td className={styles.dateCell}>
                                            <span className={styles.date}>{formatDate(incident.created_at)}</span>
                                            <span className={styles.time}>{formatTime(incident.created_at)}</span>
                                        </td>
                                        <td>
                                            {priorityInfo ? (
                                                <span
                                                    className={styles.priorityBadge}
                                                    style={{
                                                        backgroundColor: priorityInfo.bg,
                                                        color: priorityInfo.color
                                                    }}
                                                >
                                                    {priorityInfo.label}
                                                </span>
                                            ) : (
                                                <span className={styles.normalPriority}>Normal</span>
                                            )}
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusBadge}
                                                style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                            >
                                                {statusInfo.label}
                                            </span>
                                        </td>
                                        <td className={styles.actionsCell}>
                                            <div className={styles.rowActions}>
                                                <button
                                                    className={styles.actionBtn}
                                                    onClick={() => router.push(`/police/incident/${incident.id}`)}
                                                    title="View details"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className={styles.actionBtn}
                                                    title="Assign officer"
                                                >
                                                    <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                                        <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </>
    );
}
