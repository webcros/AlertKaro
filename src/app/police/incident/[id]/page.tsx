'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Incident {
    id: string;
    tracking_id: string;
    title: string;
    description: string;
    status: string;
    priority: string;
    address: string;
    latitude: number;
    longitude: number;
    created_at: string;
    updated_at: string;
    user: {
        id: string;
        full_name: string;
        phone: string;
        email: string;
        avatar_url: string;
    };
    category: {
        name: string;
        icon: string;
        color: string;
    };
    area: {
        name: string;
    } | null;
}

interface Media {
    id: string;
    file_url: string;
    file_type: string;
}

interface Update {
    id: string;
    status: string;
    notes: string;
    created_at: string;
    updated_by: {
        full_name: string;
    };
}

interface Resolution {
    id: string;
    resolution_media_url: string;
    resolution_media_type: string;
    notes: string | null;
    created_at: string;
}

export default function PoliceIncidentDetailPage() {
    const router = useRouter();
    const params = useParams();
    const supabase = createClient();
    const incidentId = params.id as string;

    const [profile, setProfile] = useState<{ id: string; full_name: string; role: string } | null>(null);
    const [incident, setIncident] = useState<Incident | null>(null);
    const [media, setMedia] = useState<Media[]>([]);
    const [updates, setUpdates] = useState<Update[]>([]);
    const [resolution, setResolution] = useState<Resolution | null>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [newStatus, setNewStatus] = useState('');
    const [updateNotes, setUpdateNotes] = useState('');
    const [showUpdateModal, setShowUpdateModal] = useState(false);
    const [resolutionFile, setResolutionFile] = useState<File | null>(null);
    const [resolutionPreview, setResolutionPreview] = useState<string | null>(null);
    const resolutionInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                return;
            }

            const { data: profileData } = await supabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('id', user.id)
                .single();

            if (!profileData || !['police', 'admin'].includes(profileData.role)) {
                router.push('/dashboard');
                return;
            }

            setProfile(profileData);

            // Load incident
            const { data: incidentData, error } = await supabase
                .from('incidents')
                .select(`
          *,
          user:profiles!incidents_user_id_fkey(id, full_name, phone, email, avatar_url),
          category:categories(name, icon, color),
          area:areas(name)
        `)
                .eq('id', incidentId)
                .single();

            if (error || !incidentData) {
                router.push('/police');
                return;
            }

            setIncident(incidentData as unknown as Incident);
            setNewStatus(incidentData.status);

            // Load media
            const { data: mediaData } = await supabase
                .from('incident_media')
                .select('*')
                .eq('incident_id', incidentId);

            if (mediaData) setMedia(mediaData);

            // Load updates
            const { data: updatesData } = await supabase
                .from('incident_updates')
                .select(`*, updated_by:profiles(full_name)`)
                .eq('incident_id', incidentId)
                .order('created_at', { ascending: false });

            if (updatesData) setUpdates(updatesData as unknown as Update[]);

            // Load existing resolution
            const { data: resolutionData } = await supabase
                .from('incident_resolutions')
                .select('*')
                .eq('incident_id', incidentId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (resolutionData) setResolution(resolutionData as Resolution);

            setLoading(false);
        }

        loadData();
    }, [incidentId, supabase, router]);

    const handleResolutionFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) return;
        if (file.size > 50 * 1024 * 1024) return; // 50MB limit

        setResolutionFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => {
            setResolutionPreview(ev.target?.result as string);
        };
        reader.readAsDataURL(file);
    };

    const removeResolutionFile = () => {
        setResolutionFile(null);
        setResolutionPreview(null);
        if (resolutionInputRef.current) {
            resolutionInputRef.current.value = '';
        }
    };

    const handleUpdateStatus = async () => {
        if (!profile || !incident) return;

        setUpdating(true);

        try {
            // If resolving and a resolution file is provided, upload it
            if (newStatus === 'resolved' && resolutionFile) {
                const fileExt = resolutionFile.name.split('.').pop();
                const fileName = `resolutions/${incident.id}/${Date.now()}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('incident-media')
                    .upload(fileName, resolutionFile);

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('incident-media')
                        .getPublicUrl(fileName);

                    const { data: resData } = await supabase
                        .from('incident_resolutions')
                        .insert({
                            incident_id: incident.id,
                            resolution_media_url: publicUrl,
                            resolution_media_type: resolutionFile.type.startsWith('video/') ? 'video' : 'image',
                            notes: updateNotes || null,
                            uploaded_by: profile.id,
                        })
                        .select()
                        .single();

                    if (resData) {
                        setResolution(resData as Resolution);
                    }
                }
            }

            // Insert update record — sync_incident_status trigger auto-updates
            // incidents.status AND notify_status_change trigger creates the notification
            const { data: updateData, error: updateRecordError } = await supabase
                .from('incident_updates')
                .insert({
                    incident_id: incident.id,
                    status: newStatus,
                    notes: updateNotes || null,
                    updated_by: profile.id,
                })
                .select(`*, updated_by:profiles(full_name)`)
                .single();

            if (updateRecordError) {
                console.error('Error creating update record:', updateRecordError);
                throw updateRecordError;
            }

            if (updateData) {
                setUpdates(prev => [updateData as unknown as Update, ...prev]);
            }

            // Notification is auto-created by DB trigger (notify_status_change)
            // when incidents.status is updated via sync_incident_status trigger

            setIncident(prev => prev ? { ...prev, status: newStatus } : null);
            setShowUpdateModal(false);
            setUpdateNotes('');
            setResolutionFile(null);
            setResolutionPreview(null);
        } catch (error) {
            console.error('Error updating status:', error);
        } finally {
            setUpdating(false);
        }
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'submitted':
                return { label: 'New', color: '#D32F2F', bg: '#FFEBEE' };
            case 'in_review':
                return { label: 'In Review', color: '#F57C00', bg: '#FFF3E0' };
            case 'action_taken':
                return { label: 'Action Taken', color: '#1976D2', bg: '#E3F2FD' };
            case 'resolved':
                return { label: 'Resolved', color: '#388E3C', bg: '#E8F5E9' };
            default:
                return { label: status, color: '#757575', bg: '#F5F5F5' };
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
            </div>
        );
    }

    if (!incident) return null;

    const statusInfo = getStatusInfo(incident.status);

    return (
        <div className={styles.page}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.logo}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                    <span>AlertKaro</span>
                </div>

                <nav className={styles.nav}>
                    <Link href="/police" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
                        </svg>
                        Dashboard
                    </Link>
                    <Link href="/police/incidents" className={`${styles.navLink} ${styles.active}`}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-2h2v2zm0-4h-2V7h2v6z" />
                        </svg>
                        All Incidents
                    </Link>
                    <Link href="/police/map" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                        </svg>
                        Map View
                    </Link>
                    <Link href="/police/analytics" className={styles.navLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
                        </svg>
                        Analytics
                    </Link>
                </nav>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                <header className={styles.header}>
                    <Link href="/police" className={styles.backLink}>
                        <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Back to Dashboard
                    </Link>
                </header>

                <div className={styles.content}>
                    {/* Left Column - Details */}
                    <div className={styles.leftColumn}>
                        {/* Header Card */}
                        <div className={styles.card}>
                            <div className={styles.incidentHeader}>
                                <div>
                                    <span className={styles.trackingId}>#{incident.tracking_id}</span>
                                    <h1 className={styles.incidentTitle}>{incident.title}</h1>
                                </div>
                                <span
                                    className={styles.statusBadge}
                                    style={{ backgroundColor: statusInfo.bg, color: statusInfo.color }}
                                >
                                    {statusInfo.label}
                                </span>
                            </div>

                            {incident.description && (
                                <p className={styles.description}>{incident.description}</p>
                            )}

                            <div className={styles.metaGrid}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Category</span>
                                    <span
                                        className={styles.metaValue}
                                        style={{ color: incident.category?.color }}
                                    >
                                        {incident.category?.name}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Priority</span>
                                    <span className={styles.metaValue} style={{ textTransform: 'capitalize' }}>
                                        {incident.priority}
                                    </span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Reported On</span>
                                    <span className={styles.metaValue}>{formatDate(incident.created_at)}</span>
                                </div>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>Last Updated</span>
                                    <span className={styles.metaValue}>{formatDate(incident.updated_at)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Location Card */}
                        {incident.address && (
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>Location</h2>
                                <div className={styles.locationInfo}>
                                    <svg viewBox="0 0 24 24" fill="#D32F2F" width="20" height="20">
                                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                                    </svg>
                                    <span>{incident.address}</span>
                                </div>
                                {incident.latitude && incident.longitude && (
                                    <a
                                        href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.mapLink}
                                    >
                                        View on Google Maps
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                            <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                                        </svg>
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Evidence Card */}
                        {media.length > 0 && (
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>Evidence ({media.length})</h2>
                                <div className={styles.mediaGrid}>
                                    {media.map((item) => (
                                        <div key={item.id} className={styles.mediaItem}>
                                            {item.file_type === 'video' ? (
                                                <>
                                                    <video
                                                        src={item.file_url}
                                                        controls
                                                        className={styles.mediaContent}
                                                        preload="metadata"
                                                    />
                                                    <span className={styles.videoTypeBadge}>
                                                        <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12">
                                                            <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                                        </svg>
                                                        Video
                                                    </span>
                                                </>
                                            ) : (
                                                <a href={item.file_url} target="_blank" rel="noopener noreferrer">
                                                    <img src={item.file_url} alt="" className={styles.mediaContent} />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Resolution Media Card */}
                        {resolution && (
                            <div className={styles.card}>
                                <h2 className={styles.cardTitle}>Resolution Evidence</h2>
                                <div className={styles.resolutionMedia}>
                                    {resolution.resolution_media_type === 'video' ? (
                                        <video
                                            src={resolution.resolution_media_url}
                                            controls
                                            className={styles.resolutionMediaContent}
                                        />
                                    ) : (
                                        <img
                                            src={resolution.resolution_media_url}
                                            alt="Resolution"
                                            className={styles.resolutionMediaContent}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Actions & Updates */}
                    <div className={styles.rightColumn}>
                        {/* Reporter Card */}
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Reporter</h2>
                            <div className={styles.reporterInfo}>
                                <div className={styles.reporterAvatar}>
                                    {incident.user?.full_name?.charAt(0)}
                                </div>
                                <div>
                                    <p className={styles.reporterName}>{incident.user?.full_name}</p>
                                    <p className={styles.reporterContact}>{incident.user?.phone}</p>
                                    <p className={styles.reporterContact}>{incident.user?.email}</p>
                                </div>
                            </div>
                            <a
                                href={`tel:${incident.user?.phone}`}
                                className={styles.callButton}
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                </svg>
                                Call Reporter
                            </a>
                        </div>

                        {/* Update Status Card */}
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Update Status</h2>
                            <button
                                onClick={() => setShowUpdateModal(true)}
                                className={styles.updateButton}
                            >
                                Change Status
                            </button>
                        </div>

                        {/* Timeline Card */}
                        <div className={styles.card}>
                            <h2 className={styles.cardTitle}>Activity Timeline</h2>
                            {updates.length === 0 ? (
                                <p className={styles.noUpdates}>No updates yet</p>
                            ) : (
                                <div className={styles.timeline}>
                                    {updates.map((update, index) => (
                                        <div key={update.id} className={styles.timelineItem}>
                                            <div className={styles.timelineDot}></div>
                                            {index < updates.length - 1 && <div className={styles.timelineLine}></div>}
                                            <div className={styles.timelineContent}>
                                                <span
                                                    className={styles.timelineStatus}
                                                    style={{ color: getStatusInfo(update.status).color }}
                                                >
                                                    {getStatusInfo(update.status).label}
                                                </span>
                                                {update.notes && (
                                                    <p className={styles.timelineNotes}>{update.notes}</p>
                                                )}
                                                <div className={styles.timelineMeta}>
                                                    <span>{update.updated_by?.full_name}</span>
                                                    <span>{formatDate(update.created_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {/* Update Modal */}
            {showUpdateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowUpdateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2 className={styles.modalTitle}>Update Status</h2>

                        <div className={styles.formGroup}>
                            <label>New Status</label>
                            <select
                                value={newStatus}
                                onChange={(e) => setNewStatus(e.target.value)}
                                className={styles.select}
                            >
                                <option value="submitted">New</option>
                                <option value="in_review">In Review</option>
                                <option value="action_taken">Action Taken</option>
                                <option value="resolved">Resolved</option>
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Notes (Optional)</label>
                            <textarea
                                value={updateNotes}
                                onChange={(e) => setUpdateNotes(e.target.value)}
                                placeholder="Add notes about this status change..."
                                className={styles.textarea}
                                rows={4}
                            />
                        </div>

                        {/* Resolution upload when resolving */}
                        {newStatus === 'resolved' && !resolution && (
                            <div className={styles.uploadSection}>
                                <label className={styles.uploadLabel}>Resolution Evidence (Photo/Video)</label>
                                {!resolutionPreview ? (
                                    <button
                                        type="button"
                                        onClick={() => resolutionInputRef.current?.click()}
                                        className={styles.uploadDropzone}
                                    >
                                        <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                                            <path d="M19 7v2.99s-1.99.01-2 0V7h-3s.01-1.99 0-2h3V2h2v3h3v2h-3zm-3 4V8h-3V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2v-8h-3zM5 19l3-4 2 3 3-4 4 5H5z" />
                                        </svg>
                                        <span>Upload resolution photo or video</span>
                                    </button>
                                ) : (
                                    <div className={styles.uploadPreview}>
                                        {resolutionFile?.type.startsWith('video/') ? (
                                            <video src={resolutionPreview} className={styles.uploadPreviewMedia} controls />
                                        ) : (
                                            <img src={resolutionPreview} alt="Resolution preview" className={styles.uploadPreviewMedia} />
                                        )}
                                        <button
                                            onClick={removeResolutionFile}
                                            className={styles.removeUpload}
                                            type="button"
                                        >
                                            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={resolutionInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={handleResolutionFileSelect}
                                    className={styles.hiddenInput}
                                />
                            </div>
                        )}

                        <div className={styles.modalActions}>
                            <button
                                onClick={() => setShowUpdateModal(false)}
                                className={styles.cancelButton}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateStatus}
                                disabled={updating}
                                className={styles.saveButton}
                            >
                                {updating ? 'Updating...' : 'Update Status'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
