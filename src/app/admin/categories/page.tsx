'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Category {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    is_active: boolean;
    incident_count?: number;
}

export default function AdminCategoriesPage() {
    const router = useRouter();
    const supabase = createClient();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [formData, setFormData] = useState({ name: '', description: '', icon: '', color: '#D32F2F' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            if (!profileData || profileData.role !== 'admin') {
                router.push('/dashboard');
                return;
            }

            await loadCategories();
        }

        loadData();
    }, [supabase, router]);

    async function loadCategories() {
        const { data } = await supabase.from('categories').select('*').order('name');

        if (data) {
            const withCounts = await Promise.all(
                data.map(async (cat) => {
                    const { count } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('category_id', cat.id);
                    return { ...cat, incident_count: count || 0 };
                })
            );
            setCategories(withCounts);
        }
        setLoading(false);
    }

    const handleSave = async () => {
        setSaving(true);
        try {
            if (editingCategory) {
                await supabase.from('categories').update(formData).eq('id', editingCategory.id);
            } else {
                await supabase.from('categories').insert({ ...formData, is_active: true });
            }
            await loadCategories();
            setShowModal(false);
            resetForm();
        } catch (error) {
            console.error('Error saving category:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        await supabase.from('categories').update({ is_active: !isActive }).eq('id', id);
        setCategories(prev => prev.map(c => c.id === id ? { ...c, is_active: !isActive } : c));
    };

    const openEditModal = (cat: Category) => {
        setEditingCategory(cat);
        setFormData({ name: cat.name, description: cat.description || '', icon: cat.icon || '', color: cat.color });
        setShowModal(true);
    };

    const resetForm = () => {
        setEditingCategory(null);
        setFormData({ name: '', description: '', icon: '', color: '#D32F2F' });
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
                    <Link href="/admin/categories" className={`${styles.navLink} ${styles.active}`}>Categories</Link>
                    <Link href="/admin/areas" className={styles.navLink}>Areas</Link>
                    <Link href="/admin/audit" className={styles.navLink}>Audit Logs</Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Category Management</h1>
                        <p className={styles.pageSubtitle}>{categories.length} categories</p>
                    </div>
                    <button onClick={() => { resetForm(); setShowModal(true); }} className={styles.addBtn}>
                        + Add Category
                    </button>
                </header>

                <div className={styles.grid}>
                    {categories.map((cat) => (
                        <div key={cat.id} className={`${styles.card} ${!cat.is_active ? styles.inactive : ''}`}>
                            <div className={styles.cardHeader}>
                                <div className={styles.iconCircle} style={{ background: cat.color + '20', color: cat.color }}>
                                    {cat.icon || '📁'}
                                </div>
                                <label className={styles.toggle}>
                                    <input
                                        type="checkbox"
                                        checked={cat.is_active}
                                        onChange={() => handleToggleActive(cat.id, cat.is_active)}
                                    />
                                    <span className={styles.toggleSlider}></span>
                                </label>
                            </div>
                            <h3 className={styles.cardTitle}>{cat.name}</h3>
                            <p className={styles.cardDesc}>{cat.description || 'No description'}</p>
                            <div className={styles.cardFooter}>
                                <span className={styles.count}>{cat.incident_count} incidents</span>
                                <button onClick={() => openEditModal(cat)} className={styles.editBtn}>Edit</button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {showModal && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                        <div className={styles.formGroup}>
                            <label>Name *</label>
                            <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label>Icon (emoji)</label>
                                <input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="🚗" />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Color</label>
                                <input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.cancelBtn}>Cancel</button>
                            <button onClick={handleSave} disabled={saving || !formData.name} className={styles.saveBtn}>
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
