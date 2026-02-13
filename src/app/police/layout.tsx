"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

interface Profile {
  full_name: string;
  role: string;
}

export default function PoliceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (!profileData || !["police", "admin"].includes(profileData.role)) {
        router.push("/dashboard");
        return;
      }

      setProfile(profileData);
      setLoading(false);
    }

    checkAccess();
  }, [supabase, router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isActive = (path: string) => {
    if (path === "/police") {
      return pathname === "/police";
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
      {/* Mobile Header */}
      <div className={styles.mobileHeader}>
        <button
          className={styles.hamburgerBtn}
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
          </svg>
        </button>
        <span className={styles.mobileTitle}>AlertKaro</span>
        <div style={{ width: 40 }} />
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className={styles.mobileOverlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Persistent across navigation */}
      <aside
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ""}`}
      >
        <div className={styles.logo}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          <span>AlertKaro</span>
        </div>

        <nav className={styles.nav}>
          <Link
            href="/police"
            className={`${styles.navLink} ${isActive("/police") ? styles.active : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
            </svg>
            Dashboard
          </Link>
          <Link
            href="/police/incidents"
            className={`${styles.navLink} ${isActive("/police/incidents") ? styles.active : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            All Incidents
          </Link>
          <Link
            href="/police/map"
            className={`${styles.navLink} ${isActive("/police/map") ? styles.active : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            Map View
          </Link>
          <Link
            href="/police/analytics"
            className={`${styles.navLink} ${isActive("/police/analytics") ? styles.active : ""}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
            </svg>
            Analytics
          </Link>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.userAvatar}>
              {profile?.full_name?.charAt(0)}
            </div>
            <div>
              <p className={styles.userName}>{profile?.full_name}</p>
              <p className={styles.userRole}>{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className={styles.signOutBtn}
            title="Sign out"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Main Content - Changes on navigation */}
      <main className={styles.main}>{children}</main>
    </div>
  );
}
