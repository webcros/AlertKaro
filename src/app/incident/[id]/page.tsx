"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { IncidentDetailSkeleton } from "@/components/Skeleton";
import styles from "./page.module.css";

interface Incident {
  id: string;
  tracking_id: string;
  title: string;
  description: string;
  status: string;
  address: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
  category: {
    name: string;
    icon: string;
    color: string;
  };
}

interface Media {
  id: string;
  file_url: string;
  file_type: string;
}

interface Update {
  id: string;
  status: string;
  notes: string;
  created_at: string;
  updated_by: {
    full_name: string;
  };
}

interface Resolution {
  id: string;
  resolution_media_url: string;
  resolution_media_type: string;
  notes: string | null;
  created_at: string;
}

export default function IncidentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const isNew = searchParams.get("new") === "true";
  const incidentId = params.id as string;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(isNew);

  useEffect(() => {
    async function loadIncident() {
      try {
        // Load incident
        const { data: incidentData, error } = await supabase
          .from("incidents")
          .select(
            `
            *,
            category:categories(name, icon, color)
          `,
          )
          .eq("id", incidentId)
          .single();

        if (error || !incidentData) {
          router.push("/dashboard");
          return;
        }

        setIncident(incidentData as unknown as Incident);

        // Load media
        const { data: mediaData } = await supabase
          .from("incident_media")
          .select("*")
          .eq("incident_id", incidentId);

        if (mediaData) {
          setMedia(mediaData);
        }

        // Load updates
        const { data: updatesData } = await supabase
          .from("incident_updates")
          .select(
            `
            *,
            updated_by:profiles(full_name)
          `,
          )
          .eq("incident_id", incidentId)
          .order("created_at", { ascending: false });

        if (updatesData) {
          setUpdates(updatesData as unknown as Update[]);
        }

        // Load resolution (police action)
        const { data: resolutionData } = await supabase
          .from("incident_resolutions")
          .select("*")
          .eq("incident_id", incidentId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (resolutionData) {
          setResolution(resolutionData as Resolution);
        }
      } catch (error) {
        console.error("Error loading incident:", error);
      } finally {
        setLoading(false);
      }
    }

    loadIncident();

    // Hide success message after 3 seconds
    if (isNew) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [incidentId, supabase, router, isNew]);

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
        return { label: "Received", color: "#757575", progress: 25 };
      case "in_review":
        return { label: "In Progress", color: "#F57C00", progress: 50 };
      case "action_taken":
        return { label: "Action Taken", color: "#1976D2", progress: 75 };
      case "resolved":
        return { label: "Resolved", color: "#388E3C", progress: 100 };
      default:
        return { label: status, color: "#757575", progress: 0 };
    }
  };

  if (loading) {
    return (
      <main className={styles.page}>
        <IncidentDetailSkeleton />
        <BottomNav />
      </main>
    );
  }

  if (!incident) {
    return null;
  }

  const statusInfo = getStatusInfo(incident.status);

  return (
    <main className={styles.page}>
      {/* Success Toast */}
      {showSuccess && (
        <div className={styles.successToast}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <span>Report submitted successfully!</span>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Incident Details</h1>
        <div className={styles.headerSpacer}></div>
      </header>

      <div className={styles.content}>
        {/* Tracking ID Card */}
        <div className={styles.trackingCard}>
          <div className={styles.trackingInfo}>
            <span className={styles.trackingLabel}>Tracking ID</span>
            <span className={styles.trackingId}>#{incident.tracking_id}</span>
          </div>
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

        {/* Progress Bar */}
        <div className={styles.progressSection}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{
                width: `${statusInfo.progress}%`,
                backgroundColor: statusInfo.color,
              }}
            />
          </div>
          <div className={styles.progressSteps}>
            <span
              className={statusInfo.progress >= 25 ? styles.activeStep : ""}
            >
              Received
            </span>
            <span
              className={statusInfo.progress >= 50 ? styles.activeStep : ""}
            >
              Reviewing
            </span>
            <span
              className={statusInfo.progress >= 75 ? styles.activeStep : ""}
            >
              Action
            </span>
            <span
              className={statusInfo.progress >= 100 ? styles.activeStep : ""}
            >
              Resolved
            </span>
          </div>
        </div>

        {/* Incident Summary */}
        <div className={styles.incidentSummary}>
          <h2 className={styles.incidentTitle}>{incident.title}</h2>
          <div className={styles.incidentMeta}>
            <span
              className={styles.incidentCategory}
              style={{ color: incident.category?.color }}
            >
              {incident.category?.name}
            </span>
            {incident.address && (
              <span className={styles.incidentLocation}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="14"
                  height="14"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                {incident.address}
              </span>
            )}
          </div>
          <div className={styles.incidentDateRow}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
            </svg>
            <span>{formatDate(incident.created_at)}</span>
          </div>
          <div className={styles.reportedByRow}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span>REPORTED BY CITIZEN</span>
          </div>
        </div>

        {/* Media Gallery */}
        {media.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Evidence</h2>
            <div className={styles.mediaGrid}>
              {media.map((item) => (
                <div key={item.id} className={styles.mediaItem}>
                  {item.file_type === "video" ? (
                    <video
                      src={item.file_url}
                      controls
                      className={styles.mediaContent}
                    />
                  ) : (
                    <img
                      src={item.file_url}
                      alt=""
                      className={styles.mediaContent}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Details & Location - Two column on desktop */}
        <div className={styles.twoColumnLayout}>
          {/* Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Details</h2>
            <div className={styles.detailCard}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Title</span>
                <span className={styles.detailValue}>{incident.title}</span>
              </div>
              {incident.description && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Description</span>
                  <span className={styles.detailValue}>
                    {incident.description}
                  </span>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Category</span>
                <span
                  className={styles.categoryTag}
                  style={{ color: incident.category?.color }}
                >
                  {incident.category?.name}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Reported On</span>
                <span className={styles.detailValue}>
                  {formatDate(incident.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Location */}
          {incident.address && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Location</h2>
              <div className={styles.locationCard}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                  className={styles.locationIcon}
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>{incident.address}</span>
              </div>
            </div>
          )}
        </div>

        {/* Police Action / Resolution */}
        {resolution && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="20"
                height="20"
                style={{ verticalAlign: "middle", marginRight: 8 }}
              >
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              Police Action
            </h2>
            <div className={styles.policeActionCard}>
              {resolution.resolution_media_url && (
                <div className={styles.resolutionMedia}>
                  {resolution.resolution_media_type === "video" ? (
                    <video
                      src={resolution.resolution_media_url}
                      controls
                      className={styles.resolutionMediaContent}
                    />
                  ) : (
                    <img
                      src={resolution.resolution_media_url}
                      alt="Resolution evidence"
                      className={styles.resolutionMediaContent}
                    />
                  )}
                  <span className={styles.resolutionMediaLabel}>
                    After — Resolved
                  </span>
                </div>
              )}
              {resolution.notes && (
                <div className={styles.resolutionNotes}>
                  <span className={styles.resolutionNotesLabel}>
                    Resolution Notes
                  </span>
                  <p className={styles.resolutionNotesText}>
                    {resolution.notes}
                  </p>
                </div>
              )}
              <div className={styles.resolutionFooter}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="16"
                  height="16"
                >
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                <span>
                  Resolved on{" "}
                  {new Date(resolution.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Updates Timeline */}
        {updates.length > 0 && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Updates</h2>
            <div className={styles.timeline}>
              {updates.map((update, index) => (
                <div key={update.id} className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  {index < updates.length - 1 && (
                    <div className={styles.timelineLine}></div>
                  )}
                  <div className={styles.timelineContent}>
                    <div className={styles.updateHeader}>
                      <span className={styles.updateStatus}>
                        {getStatusInfo(update.status).label}
                      </span>
                      <span className={styles.updateTime}>
                        {formatDate(update.created_at)}
                      </span>
                    </div>
                    {update.notes && (
                      <p className={styles.updateNotes}>{update.notes}</p>
                    )}
                    <span className={styles.updateBy}>
                      by {update.updated_by?.full_name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </main>
  );
}
