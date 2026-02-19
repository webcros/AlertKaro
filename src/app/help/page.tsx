"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

const faqs = [
  {
    question: "How do I report an incident?",
    answer:
      'Tap the "Report" button on the bottom navigation bar. Fill in the incident details, add photos if available, allow location access, and submit. Your report will be reviewed and forwarded to the relevant authorities.',
  },
  {
    question: "Can I report anonymously?",
    answer:
      "You need an account to submit reports so authorities can follow up if needed. However, your identity is never shared publicly on the community feed.",
  },
  {
    question: "How long does it take for my report to be reviewed?",
    answer:
      "Reports are typically reviewed within 24 hours. Urgent incidents flagged as emergencies are prioritised and may receive a faster response.",
  },
  {
    question: "How do I update my profile information?",
    answer:
      "Go to your Profile page and tap on the field you wish to update. Changes are saved automatically.",
  },
  {
    question: "Why is my location access required?",
    answer:
      "Location access is requested only when submitting a report to accurately tag the incident's location. Alerkaro does not track your location in the background.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Contact our support team at support@alerkaro.app with your registered email and we will process your deletion request within 7 business days.",
  },
];

export default function HelpSupportPage() {
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (i: number) => setOpenIndex(openIndex === i ? null : i);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className={styles.title}>Help & Support</h1>
      </div>

      <div className={styles.content}>
        {/* Contact cards */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Get in Touch</h2>
          <div className={styles.contactGrid}>
            <a
              href="mailto:support@alerkaro.app"
              className={styles.contactCard}
            >
              <div className={styles.contactIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="22"
                  height="22"
                >
                  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </div>
              <p className={styles.contactLabel}>Email Us</p>
              <p className={styles.contactValue}>support@alerkaro.app</p>
            </a>
            <a href="tel:+254700000000" className={styles.contactCard}>
              <div className={styles.contactIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="22"
                  height="22"
                >
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </div>
              <p className={styles.contactLabel}>Call Us</p>
              <p className={styles.contactValue}>+254 700 000 000</p>
            </a>
          </div>
        </section>

        {/* FAQs */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Frequently Asked Questions</h2>
          <div className={styles.faqCard}>
            {faqs.map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  className={styles.faqQuestion}
                  onClick={() => toggle(i)}
                  aria-expanded={openIndex === i}
                >
                  <span>{faq.question}</span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="20"
                    height="20"
                    className={`${styles.faqChevron} ${openIndex === i ? styles.faqChevronOpen : ""}`}
                  >
                    <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                  </svg>
                </button>
                {openIndex === i && (
                  <p className={styles.faqAnswer}>{faq.answer}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* App info */}
        <section className={styles.section}>
          <div className={styles.appInfo}>
            <p className={styles.appName}>Alerkaro</p>
            <p className={styles.appVersion}>Version 2.0.0</p>
          </div>
        </section>
      </div>
    </main>
  );
}
