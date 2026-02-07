'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Profile {
    full_name: string;
    role: string;
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function checkAccess() {
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

            setProfile(profileData);
            setLoading(false);
        }

        checkAccess();
    }, [supabase, router]);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    const isActive = (path: string) => {
        if (path === '/admin') {
            return pathname === '/admin';
        }
        return pathname.startsWith(path);
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            {/* Sidebar - Persistent across navigation */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>AlertKaro</span>
                    <span className={styles.adminBadge}>Admin</span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/admin" className={`${styles.navLink} ${isActive('/admin') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/admin/users" className={`${styles.navLink} ${isActive('/admin/users') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                        Users
                    </Link>
                    <Link href="/admin/police" className={`${styles.navLink} ${isActive('/admin/police') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                        </svg>
                        Police
                    </Link>
                    <Link href="/admin/incidents" className={`${styles.navLink} ${isActive('/admin/incidents') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        Incidents
                    </Link>
                    <Link href="/admin/categories" className={`${styles.navLink} ${isActive('/admin/categories') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 2l-5.5 9h11z M17.5 13h-11l5.5 9z" />
                        </svg>
                        Categories
                    </Link>
                    <Link href="/admin/areas" className={`${styles.navLink} ${isActive('/admin/areas') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        Areas
                    </Link>
                    <Link href="/admin/audit" className={`${styles.navLink} ${isActive('/admin/audit') ? styles.active : ''}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" />
                        </svg>
                        Audit Logs
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <div className={styles.userAvatar}>
                            {profile?.full_name?.charAt(0)}
                        </div>
                        <div>
                            <p className={styles.userName}>{profile?.full_name}</p>
                            <p className={styles.userRole}>Administrator</p>
                        </div>
                    </div>
                    <button onClick={handleSignOut} className={styles.signOutBtn}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main Content - Changes on navigation */}
            <main className={styles.main}>
                {children}
            </main>
        </div>
    );
}
