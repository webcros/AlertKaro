'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function SplashPage() {
    const router = useRouter();

    useEffect(() => {
        const timer = setTimeout(() => {
            router.push('/login');
        }, 2500);

        return () => clearTimeout(timer);
    }, [router]);

    return (
        <main className={styles.splash}>
            <div className={styles.content}>
                <div className={styles.logo}>
                    <svg
                        viewBox="0 0 120 140"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={styles.logoIcon}
                    >
                        {/* Shield */}
                        <path
                            d="M60 5L10 25V65C10 95 35 125 60 135C85 125 110 95 110 65V25L60 5Z"
                            stroke="#D32F2F"
                            strokeWidth="4"
                            fill="none"
                        />
                        {/* Phone outline */}
                        <rect
                            x="35"
                            y="30"
                            width="35"
                            height="60"
                            rx="4"
                            stroke="#D32F2F"
                            strokeWidth="3"
                            fill="none"
                        />
                        {/* Phone speaker */}
                        <line
                            x1="45"
                            y1="38"
                            x2="60"
                            y2="38"
                            stroke="#D32F2F"
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                        {/* Megaphone */}
                        <g transform="translate(50, 50)">
                            <path
                                d="M0 15L25 5V35L0 25V15Z"
                                fill="#D32F2F"
                            />
                            <circle cx="-5" cy="20" r="8" fill="#D32F2F" />
                            <path
                                d="M30 10C35 15 35 25 30 30"
                                stroke="#D32F2F"
                                strokeWidth="2"
                                strokeLinecap="round"
                                fill="none"
                            />
                            <path
                                d="M35 5C42 12 42 28 35 35"
                                stroke="#D32F2F"
                                strokeWidth="2"
                                strokeLinecap="round"
                                fill="none"
                            />
                        </g>
                    </svg>
                </div>
                <h1 className={styles.title}>AlertKaro</h1>
                <p className={styles.tagline}>Report. Track. Resolve.</p>
            </div>
            <div className={styles.dots}>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
                <span className={styles.dot}></span>
            </div>
        </main>
    );
}
