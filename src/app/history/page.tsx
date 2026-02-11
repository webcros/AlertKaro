"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { HistorySkeleton } from "@/components/Skeleton";
import styles from "./page.module.css";

interface Incident {
  id: string;
  tracking_id: string;
  title: string;
  status: string;
  address: string;
  created_at: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

export default function HistoryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "resolved">("all");

  useEffect(() => {
    async function loadIncidents() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        let query = supabase
          .from("incidents")
          .select(
            `
            id,
            tracking_id,
            title,
            status,
            address,
            created_at,
            category:categories(name, icon, color)
          `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (filter === "active") {
          query = query.in("status", [
            "submitted",
            "in_review",
            "action_taken",
          ]);
        } else if (filter === "resolved") {
          query = query.eq("status", "resolved");
        }

        const { data } = await query;
        setIncidents((data as unknown as Incident[]) || []);
      } catch (error) {
        console.error("Error loading incidents:", error);
      } finally {
        setLoading(false);
      }
    }

    loadIncidents();
  }, [supabase, router, filter]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "submitted":
        return { label: "Received", color: "#757575" };
      case "in_review":
        return { label: "In Progress", color: "#F57C00" };
      case "action_taken":
        return { label: "Action Taken", color: "#1976D2" };
      case "resolved":
        return { label: "Resolved", color: "#388E3C" };
      default:
        return { label: status, color: "#757575" };
    }
  };

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>My Reports</h1>
      </header>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => setFilter("all")}
          className={`${styles.filterTab} ${filter === "all" ? styles.active : ""}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("active")}
          className={`${styles.filterTab} ${filter === "active" ? styles.active : ""}`}
        >
          Active
        </button>
        <button
          onClick={() => setFilter("resolved")}
          className={`${styles.filterTab} ${filter === "resolved" ? styles.active : ""}`}
        >
          Resolved
        </button>
      </div>

      <div className={styles.content}>
        {loading ? (
          <HistorySkeleton />
        ) : incidents.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.emptyIcon}
            >
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            <p>No reports found</p>
            <span>
              {filter === "all"
                ? "Start by reporting an incident"
                : `No ${filter} reports`}
            </span>
          </div>
        ) : (
          <div className={styles.list}>
            {incidents.map((incident) => {
              const statusInfo = getStatusInfo(incident.status);
              return (
                <Link
                  href={`/incident/${incident.id}`}
                  key={incident.id}
                  className={styles.card}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardInfo}>
                      <h3 className={styles.cardTitle}>{incident.title}</h3>
                      <p className={styles.cardId}>#{incident.tracking_id}</p>
                    </div>
                    <span
                      className={styles.badge}
                      style={{
                        backgroundColor: `${statusInfo.color}15`,
                        color: statusInfo.color,
                        borderColor: `${statusInfo.color}30`,
                      }}
                    >
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span
                      className={styles.category}
                      style={{ color: incident.category?.color }}
                    >
                      {incident.category?.name}
                    </span>
                    <span className={styles.date}>
                      {formatDate(incident.created_at)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
