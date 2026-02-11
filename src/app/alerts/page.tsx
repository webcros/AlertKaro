"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useNotifications } from "@/lib/NotificationContext";
import BottomNav from "@/components/BottomNav";
import { AlertsSkeleton } from "@/components/Skeleton";
import styles from "./page.module.css";

interface Notification {
  id: string;
  incident_id: string | null;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: {
    old_status?: string;
    new_status?: string;
    tracking_id?: string;
  };
  created_at: string;
}

export default function AlertsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { unreadCount, refreshUnreadCount } = useNotifications();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(data);
      }

      setLoading(false);
    }

    loadNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          // Context handles the count update via realtime
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
    );
    refreshUnreadCount();
  };

  const markAllAsRead = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    refreshUnreadCount();
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.incident_id) {
      router.push(`/incident/${notification.incident_id}`);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return then.toLocaleDateString();
  };

  const getNotificationIcon = (type: string, newStatus?: string) => {
    if (type === "resolved" || newStatus === "resolved") {
      return (
        <div className={`${styles.notificationIcon} ${styles.resolved}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      );
    }

    if (newStatus === "in_review") {
      return (
        <div className={`${styles.notificationIcon} ${styles.inReview}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
          </svg>
        </div>
      );
    }

    if (newStatus === "action_taken") {
      return (
        <div className={`${styles.notificationIcon} ${styles.actionTaken}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
        </div>
      );
    }

    // Default status change icon
    return (
      <div className={`${styles.notificationIcon} ${styles.statusChange}`}>
        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
        </svg>
      </div>
    );
  };

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>
          Alerts
          {unreadCount > 0 && (
            <span className={styles.unreadBadge}>{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className={styles.markAllRead}>
            Mark all as read
          </button>
        )}
      </header>

      <div className={styles.content}>
        {loading ? (
          <AlertsSkeleton />
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.emptyIcon}
            >
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
            </svg>
            <p>No alerts yet</p>
            <span>You'll receive notifications about your reports here</span>
          </div>
        ) : (
          <div className={styles.notificationsList}>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`${styles.notificationCard} ${
                  !notification.is_read ? styles.unread : ""
                }`}
              >
                {getNotificationIcon(
                  notification.type,
                  notification.metadata?.new_status,
                )}
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <h3 className={styles.notificationTitle}>
                      {notification.title}
                    </h3>
                    <span className={styles.notificationTime}>
                      {formatTimeAgo(notification.created_at)}
                    </span>
                  </div>
                  <p className={styles.notificationMessage}>
                    {notification.message}
                  </p>
                  {notification.metadata?.new_status && (
                    <div
                      className={styles.statusBadge}
                      data-status={notification.metadata.new_status}
                    >
                      {notification.metadata.new_status === "in_review" &&
                        "Under Review"}
                      {notification.metadata.new_status === "action_taken" &&
                        "Action Taken"}
                      {notification.metadata.new_status === "resolved" &&
                        "Resolved"}
                      {notification.metadata.new_status === "submitted" &&
                        "Submitted"}
                    </div>
                  )}
                </div>
                {!notification.is_read && (
                  <span className={styles.unreadDot}></span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
