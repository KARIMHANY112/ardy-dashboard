"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { GOOGLE_MAPS_API_KEY } from "@/lib/api";

// Cairo — same default center used by the Flutter app's map picker.
const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 };

declare global {
  interface Window {
    google?: typeof google;
  }
}

type LocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
};

export default function LocationPicker({ latitude, longitude, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerInstance = useRef<google.maps.Marker | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !mapRef.current || mapInstance.current) return;

    const center = latitude != null && longitude != null ? { lat: latitude, lng: longitude } : DEFAULT_CENTER;

    const map = new window.google!.maps.Map(mapRef.current, {
      center,
      zoom: 12,
    });
    const marker = new window.google!.maps.Marker({ position: center, map });

    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      marker.setPosition(e.latLng);
      onChange(e.latLng.lat(), e.latLng.lng());
    });

    mapInstance.current = map;
    markerInstance.current = marker;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptLoaded]);

  useEffect(() => {
    if (latitude != null && longitude != null && markerInstance.current && mapInstance.current) {
      const pos = { lat: latitude, lng: longitude };
      markerInstance.current.setPosition(pos);
      mapInstance.current.setCenter(pos);
    }
  }, [latitude, longitude]);

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="error-text">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable the map location picker.
      </div>
    );
  }

  return (
    <div>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`}
        onLoad={() => setScriptLoaded(true)}
        onError={() => setLoadError(true)}
      />
      {loadError && (
        <div className="error-text">
          Google Maps failed to load — the API key may be restricted to the mobile apps only.
        </div>
      )}
      <div
        ref={mapRef}
        style={{ width: "100%", height: 260, borderRadius: 10, border: "1.5px solid var(--divider)" }}
      />
      <div style={{ fontSize: 12, color: "rgba(28, 35, 31, 0.6)", marginTop: 6 }}>
        {latitude != null && longitude != null
          ? `Pin set at ${latitude.toFixed(5)}, ${longitude.toFixed(5)} — click the map to move it`
          : "Click the map to drop a pin at the listing's location"}
      </div>
    </div>
  );
}
