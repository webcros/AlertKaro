"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className={styles.title}>Privacy</h1>
      </div>

      <div className={styles.content}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Data We Collect</h2>
          <div className={styles.card}>
            <div className={styles.item}>
              <div className={styles.itemIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
              </div>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>Location Data</p>
                <p className={styles.itemDesc}>
                  Used only when submitting incident reports to tag their
                  location. Never tracked in the background.
                </p>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.itemIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>Contact Information</p>
                <p className={styles.itemDesc}>
                  Your name, email, and phone number are collected during
                  registration for account management.
                </p>
              </div>
            </div>
            <div className={styles.item}>
              <div className={styles.itemIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="20"
                  height="20"
                >
                  <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
                </svg>
              </div>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>Incident Reports</p>
                <p className={styles.itemDesc}>
                  Reports you submit including descriptions, photos, and
                  location are stored securely and shared with relevant
                  authorities.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>How We Use Your Data</h2>
          <div className={styles.card}>
            <p className={styles.paragraph}>
              Your data is used solely to operate Alerkaro's public safety
              features. We do not sell your personal information to third
              parties. Incident data is shared with verified law enforcement
              agencies to enable faster response times.
            </p>
            <p className={styles.paragraph}>
              Aggregated and anonymised data may be used to improve the platform
              and generate community safety insights.
            </p>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Your Rights</h2>
          <div className={styles.card}>
            <div className={styles.rightRow}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
                className={styles.rightIcon}
              >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
              <span>Request a copy of your data</span>
            </div>
            <div className={styles.rightRow}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
                className={styles.rightIcon}
              >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
              <span>Correct inaccurate information</span>
            </div>
            <div className={styles.rightRow}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
                className={styles.rightIcon}
              >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
              <span>Delete your account and associated data</span>
            </div>
            <div className={styles.rightRow}>
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                width="18"
                height="18"
                className={styles.rightIcon}
              >
                <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" />
              </svg>
              <span>Opt out of non-essential communications</span>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <div className={styles.card}>
            <p className={styles.paragraph}>
              For any privacy-related concerns, reach us at{" "}
              <a href="mailto:alertkaro.tech@gmail.com" className={styles.link}>
                alertkaro.tech@gmail.com
              </a>
            </p>
          </div>
        </section>

        <p className={styles.lastUpdated}>Last updated: January 2026</p>
      </div>
    </main>
  );
}
