"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

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
  incident_media: {
    id: string;
    file_url: string;
    file_type: string;
  }[];
  incident_resolutions: {
    id: string;
    resolution_media_url: string;
    resolution_media_type: string;
  }[];
}

export default function FeedPage() {
  const supabase = createClient();

  const [incidents, setIncidents] = useState<FeedIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "resolved">("all");

  useEffect(() => {
    async function loadFeed() {
      setLoading(true);
      try {
        let query = supabase
          .from("incidents")
          .select(
            `
                        id,
                        title,
                        status,
                        address,
                        created_at,
                        category:categories(name, icon, color),
                        incident_media(id, file_url, file_type),
                        incident_resolutions(id, resolution_media_url, resolution_media_type)
                    `,
          )
          .order("created_at", { ascending: false })
          .limit(30);

        if (filter === "resolved") {
          query = query.eq("status", "resolved");
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading feed:", error);
          return;
        }

        setIncidents((data as unknown as FeedIncident[]) || []);
      } catch (error) {
        console.error("Error loading feed:", error);
      } finally {
        setLoading(false);
      }
    }

    loadFeed();
  }, [supabase, filter]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "submitted":
        return { label: "Reported", color: "#757575" };
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

  const parseLocation = (address: string | null): string => {
    if (!address) return "Location not available";
    const parts = address.split(",").map((p) => p.trim());
    // Address format: "Street, Area, District, State, Pincode, Country"
    if (parts.length >= 3) {
      return `${parts[1]}, ${parts[2]}`;
    }
    if (parts.length >= 2) {
      return `${parts[0]}, ${parts[1]}`;
    }
    return parts[0] || "Location not available";
  };

  const renderSkeleton = () => (
    <div className={styles.skeletonList}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonCard}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonLine} style={{ width: "60%" }}></div>
            <div className={styles.skeletonBadge}></div>
          </div>
          <div className={styles.skeletonLineShort}></div>
          <div className={styles.skeletonMedia}></div>
        </div>
      ))}
    </div>
  );

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link href="/dashboard" className={styles.backButton}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="24"
                height="24"
              >
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </Link>
            <div>
              <h1 className={styles.headerTitle}>Public Feed</h1>
              <p className={styles.headerSubtitle}>Transparency in action</p>
            </div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          onClick={() => setFilter("all")}
          className={`${styles.filterTab} ${filter === "all" ? styles.active : ""}`}
        >
          All Incidents
        </button>
        <button
          onClick={() => setFilter("resolved")}
          className={`${styles.filterTab} ${filter === "resolved" ? styles.active : ""}`}
        >
          Resolved
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {loading ? (
          renderSkeleton()
        ) : incidents.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className={styles.emptyIcon}
            >
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
            </svg>
            <p>No incidents to display</p>
            <span>
              {filter === "resolved"
                ? "No resolved incidents yet"
                : "Reported incidents will appear here"}
            </span>
          </div>
        ) : (
          <div className={styles.feedList}>
            {incidents.map((incident) => {
              const statusInfo = getStatusInfo(incident.status);
              const citizenMedia = incident.incident_media?.[0] || null;
              const resolution = incident.incident_resolutions?.[0] || null;
              const isResolved = incident.status === "resolved" && resolution;

              return (
                <Link
                  href={`/incident/${incident.id}`}
                  key={incident.id}
                  className={styles.feedCard}
                >
                  {/* Card Header */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTopRow}>
                      <h3 className={styles.cardTitle}>{incident.title}</h3>
                      <span
                        className={styles.statusBadge}
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
                      {incident.category && (
                        <span
                          className={`${styles.metaItem} ${styles.categoryBadge}`}
                          style={{ color: incident.category.color }}
                        >
                          {incident.category.name}
                        </span>
                      )}
                      <span className={styles.metaItem}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="14"
                          height="14"
                        >
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        {parseLocation(incident.address)}
                      </span>
                      <span className={styles.metaItem}>
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          width="14"
                          height="14"
                        >
                          <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                        </svg>
                        {formatDate(incident.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Media Section */}
                  {(citizenMedia || resolution) && (
                    <div className={styles.mediaSection}>
                      <div
                        className={
                          isResolved
                            ? styles.mediaComparison
                            : styles.mediaSingle
                        }
                      >
                        {/* Citizen Media */}
                        {citizenMedia && (
                          <div className={styles.mediaBlock}>
                            <span
                              className={`${styles.mediaLabel} ${styles.citizenLabel}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                width="12"
                                height="12"
                              >
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                              Reported by Citizen
                            </span>
                            <div className={styles.mediaWrapper}>
                              {citizenMedia.file_type === "video" ? (
                                <video
                                  src={citizenMedia.file_url}
                                  controls
                                  className={styles.mediaVideo}
                                />
                              ) : (
                                <img
                                  src={citizenMedia.file_url}
                                  alt="Citizen report"
                                  className={styles.mediaImage}
                                  loading="lazy"
                                />
                              )}
                            </div>
                          </div>
                        )}

                        {/* Resolution Media */}
                        {isResolved && resolution && (
                          <div className={styles.mediaBlock}>
                            <span
                              className={`${styles.mediaLabel} ${styles.policeLabel}`}
                            >
                              <svg
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                width="12"
                                height="12"
                              >
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                              </svg>
                              Resolved by Police
                            </span>
                            <div className={styles.mediaWrapper}>
                              {resolution.resolution_media_type === "video" ? (
                                <video
                                  src={resolution.resolution_media_url}
                                  controls
                                  className={styles.mediaVideo}
                                />
                              ) : (
                                <img
                                  src={resolution.resolution_media_url}
                                  alt="Police resolution"
                                  className={styles.mediaImage}
                                  loading="lazy"
                                />
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
