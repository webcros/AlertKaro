'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
                    <Image
                        src="/images/logo.svg"
                        alt="AlertKaro Logo"
                        width={200}
                        height={200}
                        className={styles.logoImage}
                        priority
                    />
                </div>
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
