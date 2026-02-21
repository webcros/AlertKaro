"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { DashboardSkeleton } from "@/components/Skeleton";
import styles from "./page.module.css";

interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface FeedIncident {
  id: string;
  title: string;
  status: string;
  address: string | null;
  created_at: string;
  category: {
    name: string;
    icon: string;
    color: string;
  } | null;
}

interface Stats {
  active: number;
  resolved: number;
  pending: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [feedIncidents, setFeedIncidents] = useState<FeedIncident[]>([]);
  const [stats, setStats] = useState<Stats>({
    active: 0,
    resolved: 0,
    pending: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        // Load profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", user.id)
          .single();

        if (!profileData?.full_name) {
          router.push("/complete-profile");
          return;
        }

        setProfile(profileData);

        // Get user stats
        const { count: totalActive } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .in("status", ["submitted", "in_review", "action_taken"]);

        const { count: totalResolved } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "resolved");

        const { count: totalPending } = await supabase
          .from("incidents")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "submitted");

        setStats({
          active: totalActive || 0,
          resolved: totalResolved || 0,
          pending: totalPending || 0,
        });

        // Load public feed: last 48 hours, fallback to latest 10
        const fortyEightHoursAgo = new Date(
          Date.now() - 48 * 60 * 60 * 1000,
        ).toISOString();

        const feedSelect = `
            id,
            title,
            status,
            address,
            created_at,
            category:categories(name, icon, color)
          `;

        const { data: recentData } = await supabase
          .from("incidents")
          .select(feedSelect)
          .gte("created_at", fortyEightHoursAgo)
          .order("created_at", { ascending: false })
          .limit(50);

        if (recentData && recentData.length >= 10) {
          setFeedIncidents(recentData as unknown as FeedIncident[]);
        } else {
          const { data: latestData } = await supabase
            .from("incidents")
            .select(feedSelect)
            .order("created_at", { ascending: false })
            .limit(10);

          setFeedIncidents((latestData as unknown as FeedIncident[]) || []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [supabase, router]);

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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "submitted":
        return styles.badgeReceived;
      case "in_review":
        return styles.badgeInProgress;
      case "action_taken":
        return styles.badgeActionTaken;
      case "resolved":
        return styles.badgeResolved;
      default:
        return styles.badgeReceived;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "submitted":
        return "Received";
      case "in_review":
        return "In Progress";
      case "action_taken":
        return "Action Taken";
      case "resolved":
        return "Resolved";
      default:
        return status;
    }
  };

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case "traffic":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={styles.categoryIcon}
          >
            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
          </svg>
        );
      case "shield":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={styles.categoryIcon}
          >
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
        );
      case "city":
        return (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={styles.categoryIcon}
          >
            <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
          </svg>
        );
      default:
        return (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className={styles.categoryIcon}
          >
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <DashboardSkeleton />
        <BottomNav />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerTop}>
            <div>
              <p className={styles.greeting}>Welcome back,</p>
              <h1 className={styles.userName}>{profile?.full_name}</h1>
            </div>
            <Link href="/profile" className={styles.avatarLink}>
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {profile?.full_name?.charAt(0)}
                </div>
              )}
            </Link>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Active</span>
              <span className={styles.statValue}>{stats.active}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Resolved</span>
              <span className={styles.statValue}>{stats.resolved}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Pending</span>
              <span className={styles.statValue}>{stats.pending}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={styles.content}>
        {/* Quick Actions */}
        <div className={styles.quickActions}>
          {/* Report CTA */}
          <Link href="/report" className={styles.reportCta}>
            <div>
              <h2 className={styles.ctaTitle}>Report Incident</h2>
              <p className={styles.ctaSubtitle}>Spot an issue? Let us know.</p>
            </div>
            <div className={styles.ctaIcon}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="24"
                height="24"
              >
                <path d="M12 3c-4.97 0-9 4.03-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1c0-3.87 3.13-7 7-7s7 3.13 7 7v1h-4v8h4c1.1 0 2-.9 2-2v-7c0-4.97-4.03-9-9-9z" />
              </svg>
            </div>
          </Link>
        </div>
        {/* end quickActions */}

        {/* Public Feed Section */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Public Feed</h2>
            <Link href="/feed" className={styles.viewAllLink}>
              View All
            </Link>
          </div>

          {feedIncidents.length === 0 ? (
            <div className={styles.emptyState}>
              <svg viewBox="0 0 24 24" fill="none" className={styles.emptyIcon}>
                <path
                  d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z"
                  fill="currentColor"
                />
              </svg>
              <p>No incidents yet</p>
              <span>Community reports will appear here</span>
            </div>
          ) : (
            <div className={styles.reportsList}>
              {feedIncidents.map((incident) => (
                <Link
                  href={`/incident/${incident.id}`}
                  key={incident.id}
                  className={styles.reportCard}
                >
                  <div className={styles.reportCardHeader}>
                    <div className={styles.reportInfo}>
                      <div
                        className={styles.reportIconWrapper}
                        style={{
                          backgroundColor: `${incident.category?.color}20`,
                        }}
                      >
                        <span style={{ color: incident.category?.color }}>
                          {getCategoryIcon(incident.category?.icon ?? "")}
                        </span>
                      </div>
                      <div>
                        <h3 className={styles.reportTitle}>{incident.title}</h3>
                        <p className={styles.reportId}>
                          {incident.category?.name}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`${styles.badge} ${getStatusBadgeClass(incident.status)}`}
                    >
                      {getStatusLabel(incident.status)}
                    </span>
                  </div>

                  {incident.address && (
                    <div className={styles.reportLocation}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="14"
                        height="14"
                      >
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                      </svg>
                      <span>{incident.address}</span>
                    </div>
                  )}

                  <div className={styles.reportFooter}>
                    <span className={styles.reportTime}>
                      {formatTimeAgo(incident.created_at)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
