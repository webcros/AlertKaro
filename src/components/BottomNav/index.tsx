"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNotifications } from "@/lib/NotificationContext";
import styles from "./BottomNav.module.css";

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useNotifications();

  const isActive = (path: string) => {
    if (path === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(path);
  };

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.brandArea}>
        <span className={styles.brandName}>AlertKaro</span>
      </div>
      <Link
        href="/dashboard"
        className={`${styles.navItem} ${isActive("/dashboard") ? styles.active : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
        <span>Home</span>
      </Link>
      <Link
        href="/history"
        className={`${styles.navItem} ${isActive("/history") ? styles.active : ""}`}
      >
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
        <span className={styles.cameraLabel}>Report</span>
      </Link>
      <Link
        href="/alerts"
        className={`${styles.navItem} ${isActive("/alerts") ? styles.active : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span className={styles.navBadge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      <Link
        href="/profile"
        className={`${styles.navItem} ${isActive("/profile") ? styles.active : ""}`}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
        <span>Profile</span>
      </Link>
    </nav>
  );
}
