'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface NotificationContextType {
    unreadCount: number;
    refreshUnreadCount: () => Promise<void>;
    showToast: boolean;
    toastMessage: string;
    toastTitle: string;
    hideToast: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
    unreadCount: 0,
    refreshUnreadCount: async () => { },
    showToast: false,
    toastMessage: '',
    toastTitle: '',
    hideToast: () => { },
});

export function useNotifications() {
    return useContext(NotificationContext);
}

interface NotificationProviderProps {
    children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
    const supabase = createClient();
    const [unreadCount, setUnreadCount] = useState(0);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastTitle, setToastTitle] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    const refreshUnreadCount = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('is_read', false);

        setUnreadCount(count || 0);
    }, [supabase]);

    const hideToast = useCallback(() => {
        setShowToast(false);
    }, []);

    useEffect(() => {
        // Initial load
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                refreshUnreadCount();
            }
        }

        init();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session?.user) {
                setUserId(session.user.id);
                refreshUnreadCount();
            } else {
                setUserId(null);
                setUnreadCount(0);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [supabase, refreshUnreadCount]);

    // Subscribe to real-time notifications
    useEffect(() => {
        if (!userId) return;

        const channel = supabase
            .channel('global-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`,
                },
                (payload) => {
                    // Increment unread count
                    setUnreadCount(prev => prev + 1);

                    // Show toast notification
                    const notification = payload.new as { title: string; message: string };
                    setToastTitle(notification.title);
                    setToastMessage(notification.message);
                    setShowToast(true);

                    // Auto-hide after 5 seconds
                    setTimeout(() => {
                        setShowToast(false);
                    }, 5000);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [supabase, userId]);

    return (
        <NotificationContext.Provider value={{
            unreadCount,
            refreshUnreadCount,
            showToast,
            toastMessage,
            toastTitle,
            hideToast,
        }}>
            {children}

            {/* Toast Notification */}
            {showToast && (
                <div className="notification-toast">
                    <div className="toast-icon">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                        </svg>
                    </div>
                    <div className="toast-content">
                        <strong>{toastTitle}</strong>
                        <p>{toastMessage}</p>
                    </div>
                    <button onClick={hideToast} className="toast-close">
                        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                        </svg>
                    </button>
                </div>
            )}

            <style jsx global>{`
                .notification-toast {
                    position: fixed;
                    top: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 16px 20px;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05);
                    z-index: 10000;
                    max-width: 400px;
                    width: calc(100% - 40px);
                    animation: slideDown 0.3s ease-out;
                }

                @keyframes slideDown {
                    from {
                        opacity: 0;
                        transform: translateX(-50%) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(-50%) translateY(0);
                    }
                }

                .toast-icon {
                    width: 40px;
                    height: 40px;
                    background: linear-gradient(135deg, #D32F2F, #B71C1C);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    flex-shrink: 0;
                }

                .toast-content {
                    flex: 1;
                    min-width: 0;
                }

                .toast-content strong {
                    display: block;
                    font-size: 14px;
                    font-weight: 600;
                    color: #1a1a1a;
                    margin-bottom: 4px;
                }

                .toast-content p {
                    font-size: 13px;
                    color: #666;
                    margin: 0;
                    line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .toast-close {
                    padding: 4px;
                    color: #999;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    border-radius: 50%;
                    transition: all 0.2s ease;
                    flex-shrink: 0;
                }

                .toast-close:hover {
                    background: #f5f5f5;
                    color: #333;
                }
            `}</style>
        </NotificationContext.Provider>
    );
}
