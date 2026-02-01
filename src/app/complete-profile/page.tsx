'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function CompleteProfilePage() {
    const router = useRouter();
    const supabase = createClient();

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [agreed, setAgreed] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!fullName.trim()) {
            setError('Please enter your full name');
            return;
        }

        if (!phone.trim() || phone.length < 10) {
            setError('Please enter a valid mobile number');
            return;
        }

        if (!agreed) {
            setError('Please agree to the terms');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    full_name: fullName.trim(),
                    phone: phone.trim(),
                    email: user.email,
                    avatar_url: user.user_metadata?.avatar_url || null,
                    updated_at: new Date().toISOString(),
                });

            if (updateError) {
                throw updateError;
            }

            router.push('/dashboard');
        } catch (err: any) {
            console.error('Error updating profile:', err);
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className={styles.page}>
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
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="fullName" className={styles.label}>
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your full name"
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="phone" className={styles.label}>
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                            placeholder="Enter your mobile number"
                            className={styles.input}
                            disabled={loading}
                        />
                    </div>

                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="agree"
                            checked={agreed}
                            onChange={(e) => setAgreed(e.target.checked)}
                            className={styles.checkbox}
                            disabled={loading}
                        />
                        <label htmlFor="agree" className={styles.checkboxLabel}>
                            I confirm that the information provided is accurate and I agree to the{' '}
                            <a href="/terms" className={styles.link}>Terms of Service</a>.
                        </label>
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={loading}
                    >
                        {loading ? (
                            <span className={styles.spinner}></span>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>
            </div>
        </main>
    );
}
