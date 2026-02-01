import type { Metadata, Viewport } from 'next';
import './globals.css';
import { NotificationProvider } from '@/lib/NotificationContext';

export const metadata: Metadata = {
    title: 'AlertKaro - Report. Track. Resolve.',
    description: 'Citizen reporting platform for civic issues. Report incidents, track progress, and help build a better community.',
    keywords: ['civic reporting', 'incident reporting', 'citizen platform', 'alertkaro', 'community safety'],
    authors: [{ name: 'AlertKaro' }],
    openGraph: {
        title: 'AlertKaro - Report. Track. Resolve.',
        description: 'Citizen reporting platform for civic issues.',
        type: 'website',
        locale: 'en_IN',
        siteName: 'AlertKaro',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'AlertKaro - Report. Track. Resolve.',
        description: 'Citizen reporting platform for civic issues.',
    },
    robots: {
        index: true,
        follow: true,
    },
    manifest: '/manifest.json',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#D32F2F',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            </head>
            <body>
                <NotificationProvider>
                    {children}
                </NotificationProvider>
            </body>
        </html>
    );
}

