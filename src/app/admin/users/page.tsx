'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface User {
    id: string;
    email: string;
    full_name: string;
    phone: string;
    role: string;
    is_active: boolean;
    avatar_url: string | null;
    created_at: string;
    incident_count?: number;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const supabase = createClient();

    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);

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

            if (!profileData || profileData.role !== 'admin') {
                router.push('/dashboard');
                return;
            }

            await loadUsers();
        }

        loadData();
    }, [supabase, router]);

    async function loadUsers() {
        let query = supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (roleFilter !== 'all') {
            query = query.eq('role', roleFilter);
        }

        const { data } = await query;

        if (data) {
            const usersWithCounts = await Promise.all(
                data.map(async (user) => {
                    const { count } = await supabase
                        .from('incidents')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id);
                    return { ...user, incident_count: count || 0 };
                })
            );
            setUsers(usersWithCounts);
        }
        setLoading(false);
    }

    useEffect(() => {
        if (!loading) {
            setLoading(true);
            loadUsers();
        }
    }, [roleFilter]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ role: newRole })
                .eq('id', userId);

            if (error) {
                console.error('Error updating role:', error);
                alert('Failed to update role: ' + error.message);
            } else {
                // Update local state
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
                setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
                alert(`Role updated to ${newRole} successfully!`);
            }
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusChange = async (userId: string, isActive: boolean) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ is_active: isActive })
                .eq('id', userId);

            if (error) {
                console.error('Error updating status:', error);
            } else {
                setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: isActive } : u));
                setSelectedUser(prev => prev ? { ...prev, is_active: isActive } : null);
            }
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setUpdating(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
        });
    };

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.phone?.includes(searchQuery)
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
            {/* Sidebar */}
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
                    <Link href="/admin/users" className={`${styles.navLink} ${styles.active}`}>Users</Link>
                    <Link href="/admin/police" className={styles.navLink}>Police</Link>
                    <Link href="/admin/incidents" className={styles.navLink}>Incidents</Link>
                    <Link href="/admin/categories" className={styles.navLink}>Categories</Link>
                    <Link href="/admin/areas" className={styles.navLink}>Areas</Link>
                    <Link href="/admin/audit" className={styles.navLink}>Audit Logs</Link>
                </nav>
            </aside>

            {/* Main */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <div>
                        <h1 className={styles.pageTitle}>User Management</h1>
                        <p className={styles.pageSubtitle}>{users.length} registered users</p>
                    </div>
                    <div className={styles.headerActions}>
                        <div className={styles.searchBox}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Roles</option>
                            <option value="citizen">Citizens</option>
                            <option value="police">Police</option>
                            <option value="admin">Admins</option>
                        </select>
                    </div>
                </header>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Contact</th>
                                <th>Role</th>
                                <th>Reports</th>
                                <th>Joined</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className={styles.userCell}>
                                            <div className={styles.avatar}>
                                                {user.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <span>{user.full_name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.contactCell}>
                                            <span>{user.email}</span>
                                            <span className={styles.phone}>{user.phone}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.roleBadge} ${styles[user.role]}`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td>{user.incident_count || 0}</td>
                                    <td>{formatDate(user.created_at)}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${user.is_active !== false ? styles.active : styles.suspended}`}>
                                            {user.is_active !== false ? 'Active' : 'Suspended'}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            onClick={() => { setSelectedUser(user); setShowModal(true); }}
                                            className={styles.editBtn}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* Edit Modal */}
            {showModal && selectedUser && (
                <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Edit User</h2>

                        <div className={styles.userDetails}>
                            <div className={styles.modalAvatar}>
                                {selectedUser.full_name?.charAt(0)}
                            </div>
                            <div>
                                <h3>{selectedUser.full_name}</h3>
                                <p>{selectedUser.email}</p>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Role</label>
                            <div className={styles.roleButtons}>
                                {['citizen', 'police', 'admin'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => handleRoleChange(selectedUser.id, role)}
                                        className={`${styles.roleBtn} ${selectedUser.role === role ? styles[`${role}Active`] : ''}`}
                                        disabled={updating}
                                    >
                                        {role.charAt(0).toUpperCase() + role.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Status</label>
                            <div className={styles.statusButtons}>
                                <button
                                    onClick={() => handleStatusChange(selectedUser.id, true)}
                                    className={`${styles.statusBtn} ${selectedUser.is_active !== false ? styles.activeBtn : ''}`}
                                    disabled={updating}
                                >
                                    Active
                                </button>
                                <button
                                    onClick={() => handleStatusChange(selectedUser.id, false)}
                                    className={`${styles.statusBtn} ${selectedUser.is_active === false ? styles.suspendedBtn : ''}`}
                                    disabled={updating}
                                >
                                    Suspended
                                </button>
                            </div>
                        </div>

                        <div className={styles.modalActions}>
                            <button onClick={() => setShowModal(false)} className={styles.cancelButton}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
