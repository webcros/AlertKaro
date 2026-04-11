"use client";

import { useTheme } from "@/lib/ThemeContext";
import styles from "./ThemeToggle.module.css";

interface ThemeToggleProps {
  showLabel?: boolean;
  compact?: boolean;
}

export default function ThemeToggle({
  showLabel = false,
  compact = false,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      className={`${styles.toggle} ${compact ? styles.compact : ""}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${isLight ? "dark" : "light"} mode`}
      title={`Switch to ${isLight ? "dark" : "light"} mode`}
    >
      <div className={`${styles.track} ${isLight ? styles.light : ""}`}>
        <div className={`${styles.thumb} ${isLight ? styles.light : ""}`}>
          {isLight ? "☀️" : "🌙"}
        </div>
      </div>
      {showLabel && (
        <span className={styles.label}>{isLight ? "Light" : "Dark"}</span>
      )}
    </button>
  );
}
