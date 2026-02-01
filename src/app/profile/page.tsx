'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useNotifications } from '@/lib/NotificationContext';
import styles from './page.module.css';

interface Profile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
}

interface Stats {
    total: number;
    resolved: number;
}

export default function ProfilePage() {
    const router = useRouter();
    const supabase = createClient();
    const { unreadCount } = useNotifications();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [stats, setStats] = useState<Stats>({ total: 0, resolved: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    router.push('/login');
                    return;
                }

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                }

                // Get stats
                const { count: total } = await supabase
                    .from('incidents')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                const { count: resolved } = await supabase
                    .from('incidents')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('status', 'resolved');

                setStats({ total: total || 0, resolved: resolved || 0 });
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        }

        loadProfile();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('en-IN', {
            month: 'long',
            year: 'numeric',
        });
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <main className={styles.page}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.avatarSection}>
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className={styles.avatar} />
                    ) : (
                        <div className={styles.avatarPlaceholder}>
                            {profile?.full_name?.charAt(0)}
                        </div>
                    )}
                    <h1 className={styles.name}>{profile?.full_name}</h1>
                    <p className={styles.email}>{profile?.email}</p>
                </div>

                <div className={styles.statsRow}>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.total}</span>
                        <span className={styles.statLabel}>Reports</span>
                    </div>
                    <div className={styles.statDivider}></div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>{stats.resolved}</span>
                        <span className={styles.statLabel}>Resolved</span>
                    </div>
                    <div className={styles.statDivider}></div>
                    <div className={styles.stat}>
                        <span className={styles.statValue}>
                            {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
                        </span>
                        <span className={styles.statLabel}>Success</span>
                    </div>
                </div>
            </div>

            <div className={styles.content}>
                {/* Info Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Account Info</h2>
                    <div className={styles.infoCard}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Phone</span>
                            <span className={styles.infoValue}>{profile?.phone || 'Not set'}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Member Since</span>
                            <span className={styles.infoValue}>
                                {profile?.created_at ? formatDate(profile.created_at) : '-'}
                            </span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Account Type</span>
                            <span className={styles.roleBadge}>{profile?.role || 'Citizen'}</span>
                        </div>
                    </div>
                </section>

                {/* Settings Section */}
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Settings</h2>
                    <div className={styles.menuCard}>
                        <button className={styles.menuItem}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                            </svg>
                            <span>Notifications</span>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className={styles.chevron}>
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                        </button>
                        <button className={styles.menuItem}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                            </svg>
                            <span>Privacy</span>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className={styles.chevron}>
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                        </button>
                        <button className={styles.menuItem}>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                            </svg>
                            <span>Help & Support</span>
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" className={styles.chevron}>
                                <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                        </button>
                    </div>
                </section>

                {/* Sign Out */}
                <button onClick={handleSignOut} className={styles.signOutButton}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                        <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                    </svg>
                    Sign Out
                </button>
            </div>

            {/* Bottom Navigation */}
            <nav className={styles.bottomNav}>
                <Link href="/dashboard" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                    </svg>
                    <span>Home</span>
                </Link>
                <Link href="/history" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                    </svg>
                    <span>History</span>
                </Link>
                <Link href="/report" className={styles.cameraButton}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
                        <circle cx="12" cy="12" r="3.2" />
                        <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                    </svg>
                </Link>
                <Link href="/alerts" className={styles.navItem}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                    </svg>
                    <span>Alerts</span>
                    {unreadCount > 0 && (
                        <span className={styles.navBadge}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </Link>
                <Link href="/profile" className={`${styles.navItem} ${styles.active}`}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span>Profile</span>
                </Link>
            </nav>
        </main>
    );
}
