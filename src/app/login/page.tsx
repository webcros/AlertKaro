'use client';

import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function LoginPage() {
    const supabase = createClient();

    const handleGoogleSignIn = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            console.error('Error signing in:', error.message);
        }
    };

    return (
        <main className={styles.login}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div className={styles.logoWrapper}>
                        <svg
                            viewBox="0 0 60 70"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className={styles.logo}
                        >
                            <path
                                d="M30 2L5 12V32C5 47 17.5 62 30 67C42.5 62 55 47 55 32V12L30 2Z"
                                fill="#D32F2F"
                            />
                        </svg>
                    </div>
                    <h1 className={styles.title}>Alertkaro</h1>
                    <p className={styles.subtitle}>Citizen Reporting Platform</p>
                </div>

                <div className={styles.content}>
                    <h2 className={styles.heading}>Sign in to continue.</h2>

                    <button
                        onClick={handleGoogleSignIn}
                        className={styles.googleButton}
                    >
                        <svg
                            className={styles.googleIcon}
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Continue with Google
                    </button>

                    <p className={styles.disclaimer}>
                        Alertkaro will only access your basic profile information for
                        account verification.
                    </p>
                </div>

                <footer className={styles.footer}>
                    <a href="/privacy" className={styles.footerLink}>
                        Privacy Policy
                    </a>
                    <span className={styles.footerDot}>•</span>
                    <a href="/terms" className={styles.footerLink}>
                        Terms of Use
                    </a>
                </footer>
            </div>
        </main>
    );
}
