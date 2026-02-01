'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface PoliceUser {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    is_active: boolean;
    created_at: string;
    assigned_count?: number;
}

export default function AdminPolicePage() {
    const router = useRouter();
    const supabase = createClient();

    const [policeUsers, setPoliceUsers] = useState<PoliceUser[]>([]);
    const [allCitizens, setAllCitizens] = useState<PoliceUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPromoteModal, setShowPromoteModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [creating, setCreating] = useState(false);
    const [newPolice, setNewPolice] = useState({ email: '', full_name: '', phone: '' });

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (!profileData || profileData.role !== 'admin') { router.push('/dashboard'); return; }

            await loadPoliceUsers();
        }
        loadData();
    }, [supabase, router]);

    async function loadPoliceUsers() {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'police').order('full_name');
        if (data) {
            const withCounts = await Promise.all(
                data.map(async (user) => {
                    const { count } = await supabase.from('incidents').select('*', { count: 'exact', head: true }).eq('assigned_to', user.id);
                    return { ...user, assigned_count: count || 0 };
                })
            );
            setPoliceUsers(withCounts);
        }
        setLoading(false);
    }

    async function loadCitizens() {
        const { data } = await supabase.from('profiles').select('*').eq('role', 'citizen').order('full_name');
        if (data) setAllCitizens(data);
    }

    const handlePromoteToPolice = async (userId: string) => {
        const { error } = await supabase.from('profiles').update({ role: 'police' }).eq('id', userId);
        if (error) {
            alert('Error promoting user: ' + error.message);
        } else {
            alert('User promoted to Police successfully!');
            await loadPoliceUsers();
            setShowPromoteModal(false);
        }
    };

    const handleStatusChange = async (userId: string, isActive: boolean) => {
        await supabase.from('profiles').update({ is_active: isActive }).eq('id', userId);
        setPoliceUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
    };

    const handleRemovePoliceRole = async (userId: string) => {
        if (confirm('Remove police role from this user? They will become a citizen.')) {
            await supabase.from('profiles').update({ role: 'citizen' }).eq('id', userId);
            setPoliceUsers(prev => prev.filter(u => u.id !== userId));
        }
    };

    const handleCreatePolice = async () => {
        if (!newPolice.email || !newPolice.full_name || !newPolice.phone) {
            alert('Please fill all fields');
            return;
        }

        setCreating(true);
        try {
            // Create a new profile entry directly
            // Note: This creates a pre-registered police account
            // The user will need to sign up with this email to activate
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    id: crypto.randomUUID(),
                    email: newPolice.email,
                    full_name: newPolice.full_name,
                    phone: newPolice.phone,
                    role: 'police',
                    is_active: true,
                })
                .select()
                .single();

            if (error) {
                alert('Error creating police account: ' + error.message);
            } else {
                alert(`Police account created for ${newPolice.email}. They can now sign in with Google using this email.`);
                setNewPolice({ email: '', full_name: '', phone: '' });
                setShowCreateModal(false);
                await loadPoliceUsers();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create police account');
        } finally {
            setCreating(false);
        }
    };

    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const filteredCitizens = allCitizens.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <Link href="/admin/police" className={`${styles.navLink} ${styles.active}`}>Police</Link>
                    <Link href="/admin/incidents" className={styles.navLink}>Incidents</Link>
                    <Link href="/admin/categories" className={styles.navLink}>Categories</Link>
                    <Link href="/admin/areas" className={styles.navLink}>Areas</Link>
                    <Link href="/admin/audit" className={styles.navLink}>Audit Logs</Link>
                </nav>
            </aside>

            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>Police Management</h1>
                        <p className={styles.pageSubtitle}>{policeUsers.length} police officers</p>
                    </div>
                    <div className={styles.headerActions}>
                        <button onClick={() => { loadCitizens(); setShowPromoteModal(true); }} className={styles.promoteBtn}>
                            Promote Citizen
                        </button>
                        <button onClick={() => setShowCreateModal(true)} className={styles.createBtn}>
                            + Create Police Account
                        </button>
                    </div>
                </header>

                {policeUsers.length === 0 ? (
                    <div className={styles.emptyState}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="48" height="48">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                        <p>No police users yet</p>
                        <span>Create a police account or promote a citizen</span>
                    </div>
                ) : (
                    <div className={styles.grid}>
                        {policeUsers.map((user) => (
                            <div key={user.id} className={styles.card}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.avatar}>{user.full_name?.charAt(0) || 'P'}</div>
                                    <span className={`${styles.statusDot} ${user.is_active === false ? styles.suspended : styles.active}`}></span>
                                </div>
                                <h3 className={styles.userName}>{user.full_name}</h3>
                                <p className={styles.userEmail}>{user.email}</p>
                                <p className={styles.userPhone}>{user.phone}</p>
                                <div className={styles.stats}>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{user.assigned_count}</span>
                                        <span className={styles.statLabel}>Assigned</span>
                                    </div>
                                    <div className={styles.stat}>
                                        <span className={styles.statValue}>{formatDate(user.created_at)}</span>
                                        <span className={styles.statLabel}>Joined</span>
                                    </div>
                                </div>
                                <div className={styles.cardActions}>
                                    <button
                                        onClick={() => handleStatusChange(user.id, user.is_active === false ? true : false)}
                                        className={user.is_active === false ? styles.activateBtn : styles.suspendBtn}
                                    >
                                        {user.is_active === false ? 'Activate' : 'Suspend'}
                                    </button>
                                    <button onClick={() => handleRemovePoliceRole(user.id)} className={styles.removeBtn}>
                                        Remove
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Promote Modal */}
            {showPromoteModal && (
                <div className={styles.modalOverlay} onClick={() => setShowPromoteModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Promote Citizen to Police</h2>
                        <input
                            type="text"
                            placeholder="Search citizens..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        <div className={styles.citizenList}>
                            {filteredCitizens.length === 0 ? (
                                <p className={styles.noResults}>No citizens found</p>
                            ) : (
                                filteredCitizens.map((citizen) => (
                                    <div key={citizen.id} className={styles.citizenItem}>
                                        <div>
                                            <strong>{citizen.full_name}</strong>
                                            <span>{citizen.email}</span>
                                        </div>
                                        <button onClick={() => handlePromoteToPolice(citizen.id)} className={styles.promoteItemBtn}>
                                            Promote
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <button onClick={() => setShowPromoteModal(false)} className={styles.cancelBtn}>Cancel</button>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Create Police Account</h2>
                        <p className={styles.modalDesc}>Create a pre-registered police account. The officer will sign in with Google using this email.</p>
                        <div className={styles.formGroup}>
                            <label>Full Name *</label>
                            <input
                                type="text"
                                value={newPolice.full_name}
                                onChange={(e) => setNewPolice({ ...newPolice, full_name: e.target.value })}
                                placeholder="Officer Name"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Email *</label>
                            <input
                                type="email"
                                value={newPolice.email}
                                onChange={(e) => setNewPolice({ ...newPolice, email: e.target.value })}
                                placeholder="officer@gmail.com"
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Phone *</label>
                            <input
                                type="tel"
                                value={newPolice.phone}
                                onChange={(e) => setNewPolice({ ...newPolice, phone: e.target.value })}
                                placeholder="9876543210"
                            />
                        </div>
                        <div className={styles.modalActions}>
                            <button onClick={() => setShowCreateModal(false)} className={styles.cancelBtn}>Cancel</button>
                            <button onClick={handleCreatePolice} disabled={creating} className={styles.createAccountBtn}>
                                {creating ? 'Creating...' : 'Create Account'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
