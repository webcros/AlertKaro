'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Area {
    id: string;
    name: string;
    city: string;
    state: string;
    pincode: string;
    is_active: boolean;
    incident_count?: number;
}

export default function AdminAreasPage() {
    const router = useRouter();
    const supabase = createClient();

    const [areas, setAreas] = useState<Area[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingArea, setEditingArea] = useState<Area | null>(null);
    const [formData, setFormData] = useState({ name: '', city: '', state: '', pincode: '' });
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profileData || profileData.role !== 'admin') { router.push('/dashboard'); return; }

            await loadAreas();
        }
        loadData();
    }, [supabase, router]);

    async function loadAreas() {
        const { data } = await supabase.from('areas').select('*').order('name');
        if (data) {
            const withCounts = await Promise.all(
                data.map(async (area) => {
                    const { count } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('area_id', area.id);
                    return { ...area, incident_count: count || 0 };
                })
            );
            setAreas(withCounts);
        }
        setLoading(false);
    }

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingArea) {
                await supabase.from('areas').update(formData).eq('id', editingArea.id);
            } else {
                await supabase.from('areas').insert({ ...formData, is_active: true });
            }
            await loadAreas();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving area:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        await supabase.from('areas').update({ is_active: !isActive }).eq('id', id);
        setAreas(prev => prev.map(a => a.id === id ? { ...a, is_active: !isActive } : a));
    };

    const openEditModal = (area: Area) => {
        setEditingArea(area);
        setFormData({ name: area.name, city: area.city, state: area.state, pincode: area.pincode || '' });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingArea(null);
        setFormData({ name: '', city: '', state: '', pincode: '' });
    };

    const filteredAreas = areas.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.pincode?.includes(searchQuery)
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
                    <Link href="/admin/incidents" className={styles.navLink}>Incidents</Link>
                    <Link href="/admin/categories" className={styles.navLink}>Categories</Link>
                    <Link href="/admin/areas" className={`${styles.navLink} ${styles.active}`}>Areas</Link>
                    <Link href="/admin/audit" className={styles.navLink}>Audit Logs</Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Area Management</h1>
                        <p className={styles.pageSubtitle}>{areas.length} areas</p>
                    </div>
                    <div className={styles.headerActions}>
                        <input
                            type="text"
                            placeholder="Search areas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <button onClick={() => { resetForm(); setShowModal(true); }} className={styles.addBtn}>
                            + Add Area
                        </button>
                    </div>
                </header>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Area Name</th>
                                <th>City</th>
                                <th>State</th>
                                <th>Pincode</th>
                                <th>Incidents</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAreas.map((area) => (
                                <tr key={area.id} className={!area.is_active ? styles.inactive : ''}>
                                    <td className={styles.areaName}>{area.name}</td>
                                    <td>{area.city}</td>
                                    <td>{area.state}</td>
                                    <td>{area.pincode || '-'}</td>
                                    <td>{area.incident_count}</td>
                                    <td>
                                        <label className={styles.toggle}>
                                            <input type="checkbox" checked={area.is_active} onChange={() => handleToggleActive(area.id, area.is_active)} />
                                            <span className={styles.toggleSlider}></span>
                                        </label>
                                    </td>
                                    <td>
                                        <button onClick={() => openEditModal(area)} className={styles.editBtn}>Edit</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>{editingArea ? 'Edit Area' : 'Add Area'}</h2>
                        <div className={styles.formGroup}>
                            <label>Area Name *</label>
                            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>City *</label>
                                <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>State *</label>
                                <input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.formGroup}>
                            <label>Pincode</label>
                            <input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} />
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>Cancel</button>
                            <button onClick={handleSave} disabled={saving || !formData.name || !formData.city || !formData.state} className={styles.saveBtn}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
