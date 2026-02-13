"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

// Leaflet types
declare global {
  interface Window {
    L: typeof import("leaflet");
  }
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export default function ReportPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const locationMapRef = useRef<HTMLDivElement>(null);
  const locationMapInstanceRef = useRef<any>(null);
  const locationMarkerRef = useRef<any>(null);

  const [step, setStep] = useState<"camera" | "details">("camera");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Load Leaflet CSS and JS
  useEffect(() => {
    const loadLeaflet = async () => {
      // Add Leaflet CSS
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
        link.crossOrigin = "";
        document.head.appendChild(link);
      }

      // Add Leaflet JS
      if (!window.L) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity =
          "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => setMapLoaded(true);
        document.head.appendChild(script);
      } else {
        setMapLoaded(true);
      }
    };

    loadLeaflet();
  }, []);

  // Initialize/update location map when location changes
  useEffect(() => {
    if (!mapLoaded || !location || !locationMapRef.current || !window.L) return;

    const L = window.L;

    // If map doesn't exist, create it
    if (!locationMapInstanceRef.current) {
      const map = L.map(locationMapRef.current, {
        zoomControl: true,
        scrollWheelZoom: false,
        dragging: true,
      }).setView([location.latitude, location.longitude], 16);

      // Add tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OSM",
        maxZoom: 19,
      }).addTo(map);

      locationMapInstanceRef.current = map;
    } else {
      // Update map view
      locationMapInstanceRef.current.setView(
        [location.latitude, location.longitude],
        16,
      );
    }

    // Remove existing marker
    if (locationMarkerRef.current) {
      locationMapInstanceRef.current.removeLayer(locationMarkerRef.current);
    }

    // Create custom marker icon
    const markerIcon = L.divIcon({
      className: styles.locationMarker,
      html: `
                <div class="${styles.markerPulse}"></div>
                <div class="${styles.markerDot}"></div>
            `,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });

    // Add marker
    const marker = L.marker([location.latitude, location.longitude], {
      icon: markerIcon,
    }).addTo(locationMapInstanceRef.current);

    locationMarkerRef.current = marker;
  }, [mapLoaded, location]);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id, name, icon, color")
        .eq("is_active", true)
        .order("sort_order");

      if (data) {
        setCategories(data);
        if (data.length > 0) {
          setSelectedCategory(data[0].id);
        }
      }
    }
    loadCategories();
  }, [supabase]);

  // Get location
  const getLocation = useCallback(async () => {
    // Destroy existing map instance before showing loading state
    if (locationMapInstanceRef.current) {
      locationMapInstanceRef.current.remove();
      locationMapInstanceRef.current = null;
      locationMarkerRef.current = null;
    }

    setLocationLoading(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported");
      setLocationLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get address
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          const data = await response.json();

          setLocation({
            latitude,
            longitude,
            address:
              data.display_name ||
              `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } catch {
          setLocation({
            latitude,
            longitude,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        }

        setLocationLoading(false);
      },
      (err) => {
        setLocationError(err.message || "Failed to get location");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  // Get location when moving to details step
  useEffect(() => {
    if (step === "details" && !location) {
      getLocation();
    }
  }, [step, location, getLocation]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
      return (isImage || isVideo) && isValidSize;
    });

    if (validFiles.length > 0) {
      setMediaFiles((prev) => [...prev, ...validFiles]);

      // Create previews
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setMediaPreviews((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });

      if (step === "camera") {
        setStep("details");
      }
    }
  };

  // Attach stream to video element when stream or showCamera changes
  useEffect(() => {
    if (showCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [showCamera, stream]);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      setShowCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      // Fall back to file input
      fileInputRef.current?.click();
    }
  };

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, {
              type: "image/jpeg",
            });
            setMediaFiles((prev) => [...prev, file]);
            setMediaPreviews((prev) => [
              ...prev,
              canvas.toDataURL("image/jpeg"),
            ]);
            stopCamera();
            setStep("details");
          }
        },
        "image/jpeg",
        0.8,
      );
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  // Remove media
  const removeMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit report
  const handleSubmit = async () => {
    if (!title.trim()) {
      setError("Please enter a title");
      return;
    }
    if (!selectedCategory) {
      setError("Please select a category");
      return;
    }
    if (mediaFiles.length === 0) {
      setError("Please add at least one photo or video");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      // Create incident
      const { data: incident, error: incidentError } = await supabase
        .from("incidents")
        .insert({
          user_id: user.id,
          category_id: selectedCategory,
          title: title.trim(),
          description: description.trim() || null,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          address: location?.address || null,
        })
        .select()
        .single();

      if (incidentError) throw incidentError;

      // Upload media files
      for (const file of mediaFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${incident.id}/${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("incident-media")
          .upload(fileName, file);

        if (uploadError) {
          console.error("Upload error:", uploadError);
          continue;
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("incident-media").getPublicUrl(fileName);

        // Save media record
        await supabase.from("incident_media").insert({
          incident_id: incident.id,
          file_url: publicUrl,
          file_name: file.name,
          file_type: file.type.startsWith("video/") ? "video" : "image",
          file_size: file.size,
        });
      }

      // Navigate to success or dashboard
      router.push(`/incident/${incident.id}?new=true`);
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (icon: string) => {
    switch (icon) {
      case "traffic":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
          </svg>
        );
      case "shield":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
        );
      case "city":
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15 11V5l-3-3-3 3v2H3v14h18V11h-6zm-8 8H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm6 8h-2v-2h2v2zm0-4h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm6 12h-2v-2h2v2zm0-4h-2v-2h2v2z" />
          </svg>
        );
      default:
        return (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        );
    }
  };

  // Camera view
  if (showCamera) {
    return (
      <main className={styles.cameraPage}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={styles.cameraVideo}
        />
        <canvas ref={canvasRef} className={styles.hiddenCanvas} />

        <div className={styles.cameraOverlay}>
          <button onClick={stopCamera} className={styles.closeCamera}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>

          <div className={styles.cameraControls}>
            <button onClick={takePhoto} className={styles.captureButton}>
              <span className={styles.captureInner}></span>
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backButton}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className={styles.headerTitle}>Report Incident</h1>
        <div className={styles.headerSpacer}></div>
      </header>

      <div className={styles.content}>
        {step === "camera" ? (
          <div className={styles.cameraStep}>
            <div className={styles.cameraPrompt}>
              <div className={styles.cameraIconLarge}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="48"
                  height="48"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                </svg>
              </div>
              <h2>Capture Evidence</h2>
              <p>Take a photo or video of the incident</p>
            </div>

            <div className={styles.captureOptions}>
              <button onClick={startCamera} className={styles.captureOption}>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" />
                </svg>
                <span>Take Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className={styles.captureOption}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  width="24"
                  height="24"
                >
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
                </svg>
                <span>Upload from Gallery</span>
              </button>
            </div>

            {/* File input moved to bottom of page for shared access */}
          </div>
        ) : (
          <div className={styles.detailsStep}>
            {/* Media Preview */}
            <div className={styles.mediaSection}>
              <div className={styles.mediaGrid}>
                {mediaPreviews.map((preview, index) => (
                  <div key={index} className={styles.mediaPreview}>
                    {mediaFiles[index]?.type.startsWith("video/") ? (
                      <video src={preview} className={styles.previewMedia} />
                    ) : (
                      <img
                        src={preview}
                        alt=""
                        className={styles.previewMedia}
                      />
                    )}
                    <button
                      onClick={() => removeMedia(index)}
                      className={styles.removeMedia}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={styles.addMoreMedia}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    width="24"
                    height="24"
                  >
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Category Selection */}
            <div className={styles.formSection}>
              <label className={styles.sectionLabel}>Category</label>
              <div className={styles.categoryGrid}>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`${styles.categoryCard} ${
                      selectedCategory === category.id
                        ? styles.categorySelected
                        : ""
                    }`}
                    style={
                      {
                        "--category-color": category.color,
                      } as React.CSSProperties
                    }
                  >
                    <div className={styles.categoryIconWrapper}>
                      {getCategoryIcon(category.icon)}
                    </div>
                    <span>{category.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className={styles.formSection}>
              <label htmlFor="title" className={styles.sectionLabel}>
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className={styles.input}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className={styles.formSection}>
              <label htmlFor="description" className={styles.sectionLabel}>
                Description (Optional)
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide more details about the incident..."
                className={styles.textarea}
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Location */}
            <div className={styles.formSection}>
              <label className={styles.sectionLabel}>
                Location
                <span className={styles.sectionHint}>
                  (Required for accurate incident tracking)
                </span>
              </label>
              <div className={styles.locationBox}>
                {locationLoading ? (
                  <div className={styles.locationLoading}>
                    <div className={styles.spinner}></div>
                    <span>Getting your location...</span>
                  </div>
                ) : locationError ? (
                  <div className={styles.locationError}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="20"
                      height="20"
                    >
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                    <span>{locationError}</span>
                    <button
                      onClick={getLocation}
                      className={styles.retryButton}
                    >
                      Retry
                    </button>
                  </div>
                ) : location ? (
                  <>
                    {/* Map Preview */}
                    <div className={styles.locationMapContainer}>
                      <div
                        ref={locationMapRef}
                        className={styles.locationMap}
                      ></div>
                      <div className={styles.mapOverlay}>
                        <span className={styles.coordinatesBadge}>
                          {location.latitude.toFixed(6)},{" "}
                          {location.longitude.toFixed(6)}
                        </span>
                      </div>
                    </div>
                    {/* Address */}
                    <div className={styles.locationSuccess}>
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="18"
                        height="18"
                      >
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span className={styles.locationAddress}>
                        {location.address}
                      </span>
                    </div>
                    <button
                      onClick={getLocation}
                      className={styles.refreshLocationButton}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        width="16"
                        height="16"
                      >
                        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                      </svg>
                      Refresh Location
                    </button>
                  </>
                ) : (
                  <button
                    onClick={getLocation}
                    className={styles.getLocationButton}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="24"
                      height="24"
                    >
                      <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z" />
                    </svg>
                    <div className={styles.getLocationText}>
                      <strong>Enable Location</strong>
                      <span>Tap to capture incident location</span>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>
        )}
      </div>

      {/* Submit Button (only on details step) */}
      {step === "details" && (
        <div className={styles.submitSection}>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={styles.submitButton}
          >
            {loading ? (
              <span className={styles.spinner}></span>
            ) : (
              "Submit Report"
            )}
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        capture="environment"
        onChange={handleFileSelect}
        className={styles.hiddenInput}
        multiple
      />
    </main>
  );
}
