"use client";

import styles from "./Skeleton.module.css";

/* ─── Primitive Skeleton Shapes ─── */

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  light?: boolean;
}

export function SkeletonBox({
  width,
  height,
  borderRadius,
  className = "",
  light = false,
}: SkeletonBoxProps) {
  return (
    <div
      className={`${light ? styles.skeletonLight : styles.skeleton} ${className}`}
      style={{ width, height, borderRadius }}
    />
  );
}

export function SkeletonCircle({
  size = 40,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <div
      className={`${light ? styles.skeletonLight : styles.skeleton} ${styles.circle}`}
      style={{ width: size, height: size }}
    />
  );
}

export function SkeletonText({
  width = "100%",
  height = 14,
  light = false,
}: {
  width?: string | number;
  height?: number;
  light?: boolean;
}) {
  return (
    <div
      className={`${light ? styles.skeletonLight : styles.skeleton} ${styles.pill}`}
      style={{ width, height }}
    />
  );
}

/* ─── Dashboard Skeleton ─── */
export function DashboardSkeleton() {
  return (
    <>
      {/* Header */}
      <header className={styles.dashboardHeader}>
        <div className={styles.dashboardHeaderContent}>
          <div className={styles.dashboardHeaderTop}>
            <div className={styles.dashboardGreeting}>
              <SkeletonText width={100} height={14} light />
              <SkeletonText width={180} height={24} light />
            </div>
            <SkeletonCircle size={48} light />
          </div>
          <div className={styles.dashboardStatsGrid}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.dashboardStatCard}>
                <SkeletonText width={60} height={12} light />
                <SkeletonText width={30} height={24} light />
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className={styles.dashboardContent}>
        {/* Report CTA Skeleton */}
        <SkeletonBox
          width="100%"
          height={80}
          className={styles.dashboardCtaSkeleton}
        />

        {/* Feed CTA Skeleton */}
        <div className={styles.dashboardFeedSkeleton}>
          <SkeletonBox width={40} height={40} borderRadius="var(--radius-sm)" />
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <SkeletonText width={100} height={14} />
            <SkeletonText width={200} height={12} />
          </div>
        </div>

        {/* Section Header */}
        <div className={styles.dashboardSectionHeader}>
          <SkeletonText width={140} height={18} />
          <SkeletonText width={50} height={14} />
        </div>

        {/* Report Cards */}
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.dashboardReportCard}>
            <div className={styles.dashboardReportCardHeader}>
              <div className={styles.dashboardReportInfo}>
                <SkeletonBox
                  width={40}
                  height={40}
                  borderRadius="var(--radius-sm)"
                />
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <SkeletonText width={140} height={14} />
                  <SkeletonText width={80} height={12} />
                </div>
              </div>
              <SkeletonBox
                width={70}
                height={24}
                borderRadius="var(--radius-full)"
              />
            </div>
            <div style={{ paddingLeft: 48, marginTop: 8 }}>
              <SkeletonText width="80%" height={12} />
            </div>
            <div style={{ paddingLeft: 48, marginTop: 8 }}>
              <SkeletonBox
                width="100%"
                height={4}
                borderRadius="var(--radius-full)"
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 8,
              }}
            >
              <SkeletonText width={100} height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── History Skeleton ─── */
export function HistorySkeleton() {
  return (
    <>
      {/* Header renders immediately - not a skeleton */}
      {/* Content skeleton */}
      <div className={styles.historyContent}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.historyCard}>
            <div className={styles.historyCardHeader}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <SkeletonText width={160} height={16} />
                <SkeletonText width={80} height={12} />
              </div>
              <SkeletonBox
                width={70}
                height={24}
                borderRadius="var(--radius-full)"
              />
            </div>
            <div className={styles.historyCardMeta}>
              <SkeletonText width={90} height={12} />
              <SkeletonText width={80} height={12} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Alerts Skeleton ─── */
export function AlertsSkeleton() {
  return (
    <div className={styles.alertsContent}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={styles.alertCard}>
          <SkeletonCircle size={40} />
          <div className={styles.alertCardContent}>
            <div className={styles.alertCardHeader}>
              <SkeletonText width={180} height={16} />
              <SkeletonText width={50} height={12} />
            </div>
            <SkeletonText width="90%" height={12} />
            <SkeletonBox
              width={80}
              height={22}
              borderRadius="var(--radius-sm)"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Profile Skeleton ─── */
export function ProfileSkeleton() {
  return (
    <>
      {/* Header */}
      <div className={styles.profileHeader}>
        <SkeletonCircle size={80} light />
        <div style={{ marginTop: 12 }}>
          <SkeletonText width={160} height={20} light />
        </div>
        <div style={{ marginTop: 8 }}>
          <SkeletonText width={200} height={14} light />
        </div>
        <div className={styles.profileStatsRow}>
          <div className={styles.profileStat}>
            <SkeletonText width={30} height={20} light />
            <SkeletonText width={50} height={12} light />
          </div>
          <div className={styles.profileStatDivider} />
          <div className={styles.profileStat}>
            <SkeletonText width={30} height={20} light />
            <SkeletonText width={50} height={12} light />
          </div>
          <div className={styles.profileStatDivider} />
          <div className={styles.profileStat}>
            <SkeletonText width={40} height={20} light />
            <SkeletonText width={50} height={12} light />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.profileContent}>
        {/* Account Info Section */}
        <div className={styles.profileSection}>
          <SkeletonText width={100} height={12} />
          <div className={styles.profileInfoCard} style={{ marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.profileInfoRow}>
                <SkeletonText width={70} height={14} />
                <SkeletonText width={120} height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div className={styles.profileSection}>
          <SkeletonText width={70} height={12} />
          <div className={styles.profileInfoCard} style={{ marginTop: 8 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.profileMenuItem}>
                <SkeletonCircle size={20} />
                <SkeletonText width={120} height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Sign Out Button */}
        <SkeletonBox width="100%" height={48} borderRadius="var(--radius-md)" />
      </div>
    </>
  );
}

/* ─── Incident Detail Skeleton ─── */
export function IncidentDetailSkeleton() {
  return (
    <>
      {/* Header */}
      <header className={styles.incidentHeader}>
        <SkeletonCircle size={40} />
        <SkeletonText width={140} height={18} />
        <div style={{ width: 40 }} />
      </header>

      {/* Content */}
      <div className={styles.incidentContent}>
        {/* Tracking Card */}
        <div className={styles.incidentTrackingCard}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <SkeletonText width={80} height={12} />
            <SkeletonText width={120} height={22} />
          </div>
          <SkeletonBox
            width={80}
            height={28}
            borderRadius="var(--radius-full)"
          />
        </div>

        {/* Progress Section */}
        <div className={styles.incidentProgressSection}>
          <SkeletonBox
            width="100%"
            height={6}
            borderRadius="var(--radius-full)"
          />
          <div className={styles.incidentProgressSteps}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonText key={i} width={50} height={12} />
            ))}
          </div>
        </div>

        {/* Details Section */}
        <div className={styles.incidentSection}>
          <SkeletonText width={60} height={16} />
          <div className={styles.incidentDetailCard} style={{ marginTop: 8 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={styles.incidentDetailRow}>
                <SkeletonText width={70} height={14} />
                <SkeletonText width={140} height={14} />
              </div>
            ))}
          </div>
        </div>

        {/* Location Section */}
        <div className={styles.incidentSection}>
          <SkeletonText width={70} height={16} />
          <div className={styles.incidentDetailCard} style={{ marginTop: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <SkeletonCircle size={20} />
              <SkeletonText width="80%" height={14} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
