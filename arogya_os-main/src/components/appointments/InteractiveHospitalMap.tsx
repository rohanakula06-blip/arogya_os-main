import { Button } from "@/components/ui/button";
import { calculateDistanceKm, Hospital } from "@/lib/appointments-store";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Compass,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Navigation2,
  Phone,
  ShieldCheck,
  Star,
  Stethoscope,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface InteractiveHospitalMapProps {
  userLat: number;
  userLng: number;
  userLabel: string;
  radiusKm: number;
  hospitals: Hospital[];
  selectedHospital: Hospital | null;
  onSelectHospital: (hospital: Hospital) => void;
  onRecenter: () => void;
}

type TileLayerMode = "streets" | "humanitarian" | "satellite" | "topographic";

const TILE_LAYERS: Record<TileLayerMode, { url: string; attribution: string; name: string; maxZoom: number; subdomains?: string[] }> = {
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    name: "OpenStreetMap Standard",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
  humanitarian: {
    url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, Humanitarian Map Style',
    name: "Medical & Health View",
    maxZoom: 19,
    subdomains: ["a", "b", "c"],
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri, Maxar, Earthstar Geographics",
    name: "Live Satellite Imagery",
    maxZoom: 19,
  },
  topographic: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    name: "Topographic Terrain",
    maxZoom: 17,
    subdomains: ["a", "b", "c"],
  },
};

export const InteractiveHospitalMap: React.FC<InteractiveHospitalMapProps> = ({
  userLat,
  userLng,
  userLabel,
  radiusKm,
  hospitals,
  selectedHospital,
  onSelectHospital,
  onRecenter,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);
  const hospitalMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [activeLayer, setActiveLayer] = useState<TileLayerMode>("streets");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already initialized

    const map = L.map(mapContainerRef.current, {
      center: [userLat, userLng],
      zoom: radiusKm <= 5 ? 14 : radiusKm <= 10 ? 13 : 12,
      zoomControl: false,
      attributionControl: true,
    });

    const initialLayer = TILE_LAYERS[activeLayer];
    const tileLayer = L.tileLayer(initialLayer.url, {
      attribution: initialLayer.attribution,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Invalidate size after mount to prevent grey tile clipping
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    const config = TILE_LAYERS[activeLayer];
    tileLayerRef.current.setUrl(config.url);
  }, [activeLayer]);

  // Update User Marker & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // 1. User Position Marker
    const userIconHtml = `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <span style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="width: 18px; height: 18px; border-radius: 50%; background: #10b981; border: 3px solid #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.3); z-index: 10;"></div>
      </div>
    `;

    const userIcon = L.divIcon({
      html: userIconHtml,
      className: "custom-user-marker",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker([userLat, userLng], {
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(map);

      userMarkerRef.current.bindPopup(
        `<div style="font-family: monospace; padding: 4px;">
          <strong style="color: #10b981; font-size: 13px;">📍 Live GPS Position</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">${userLabel}</p>
        </div>`,
      );
    } else {
      userMarkerRef.current.setLatLng([userLat, userLng]);
      userMarkerRef.current.setPopupContent(
        `<div style="font-family: monospace; padding: 4px;">
          <strong style="color: #10b981; font-size: 13px;">📍 Live GPS Position</strong>
          <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">${userLabel}</p>
        </div>`,
      );
    }

    // 2. Radius Circle Boundary
    const radiusMeters = radiusKm * 1000;
    if (!radiusCircleRef.current) {
      radiusCircleRef.current = L.circle([userLat, userLng], {
        radius: radiusMeters,
        color: "#10b981",
        weight: 1.8,
        opacity: 0.8,
        fillColor: "#10b981",
        fillOpacity: 0.07,
        dashArray: "6, 8",
      }).addTo(map);
    } else {
      radiusCircleRef.current.setLatLng([userLat, userLng]);
      radiusCircleRef.current.setRadius(radiusMeters);
    }

    // Smoothly pan & fit circle bounds
    map.flyTo([userLat, userLng], radiusKm <= 5 ? 14 : radiusKm <= 10 ? 13 : 12, {
      duration: 1.2,
    });
  }, [userLat, userLng, userLabel, radiusKm]);

  // Update Hospital Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear removed hospital markers
    const currentHospIds = new Set(hospitals.map((h) => h.id));
    hospitalMarkersRef.current.forEach((marker, id) => {
      if (!currentHospIds.has(id)) {
        marker.remove();
        hospitalMarkersRef.current.delete(id);
      }
    });

    // Add or update hospital pins
    hospitals.forEach((hosp) => {
      const isSelected = selectedHospital?.id === hosp.id;
      const distance = calculateDistanceKm(userLat, userLng, hosp.lat, hosp.lng);

      const markerHtml = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: transform 0.2s;">
          <div style="
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            background: ${isSelected ? "#059669" : "#ffffff"};
            color: ${isSelected ? "#ffffff" : "#0f172a"};
            border: 2px solid ${isSelected ? "#10b981" : "#e2e8f0"};
            border-radius: 9999px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.18);
            font-family: monospace;
            font-size: 11px;
            font-weight: 700;
            white-space: nowrap;
          ">
            <span>🏥</span>
            <span>${hosp.name.split(" ")[0]}</span>
            <span style="
              background: ${isSelected ? "#047857" : "#f1f5f9"};
              color: ${isSelected ? "#a7f3d0" : "#0f766e"};
              padding: 1px 5px;
              border-radius: 6px;
              font-size: 9px;
            ">${distance.toFixed(1)} km</span>
          </div>
          <div style="
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 7px solid ${isSelected ? "#059669" : "#ffffff"};
            margin-top: -1px;
          "></div>
        </div>
      `;

      const hospIcon = L.divIcon({
        html: markerHtml,
        className: "custom-hospital-marker",
        iconSize: [120, 36],
        iconAnchor: [60, 36],
      });

      const popupContent = `
        <div style="font-family: inherit; width: 240px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: 600; text-transform: uppercase; color: #059669; background: #ecfdf5; padding: 2px 6px; border-radius: 4px;">
              ${hosp.category}
            </span>
            <span style="font-size: 11px; font-weight: 700; color: #eab308; display: flex; align-items: center; gap: 2px;">
              ★ ${hosp.rating}
            </span>
          </div>
          <h4 style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #0f172a; line-height: 1.3;">
            ${hosp.name}
          </h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b; line-height: 1.3;">
            ${hosp.address}
          </p>
          <div style="display: flex; gap: 6px; font-size: 10px; margin-bottom: 8px; font-family: monospace;">
            <span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; color: #334155;">
              📍 <strong>${distance.toFixed(1)} km</strong> away
            </span>
            <span style="background: #ecfdf5; padding: 2px 6px; border-radius: 4px; color: #059669;">
              🛏️ ${hosp.icuBedsAvailable} ICU Beds
            </span>
          </div>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <a 
              href="https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}" 
              target="_blank" 
              rel="noopener noreferrer"
              style="
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 4px;
                background: #f8fafc;
                border: 1px solid #cbd5e1;
                color: #334155;
                font-size: 11px;
                padding: 5px;
                border-radius: 6px;
                text-decoration: none;
                font-weight: 600;
              "
            >
              Directions ↗
            </a>
            <button 
              id="btn-select-${hosp.id}"
              style="
                flex: 1;
                background: #10b981;
                border: none;
                color: #ffffff;
                font-size: 11px;
                padding: 5px;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 600;
              "
            >
              Select & View Doctors
            </button>
          </div>
        </div>
      `;

      if (hospitalMarkersRef.current.has(hosp.id)) {
        const marker = hospitalMarkersRef.current.get(hosp.id)!;
        marker.setLatLng([hosp.lat, hosp.lng]);
        marker.setIcon(hospIcon);
        marker.setPopupContent(popupContent);
      } else {
        const marker = L.marker([hosp.lat, hosp.lng], { icon: hospIcon }).addTo(map);
        marker.bindPopup(popupContent, { maxWidth: 280 });

        marker.on("click", () => {
          onSelectHospital(hosp);
        });

        marker.on("popupopen", () => {
          const selectBtn = document.getElementById(`btn-select-${hosp.id}`);
          if (selectBtn) {
            selectBtn.onclick = () => {
              onSelectHospital(hosp);
              map.closePopup();
            };
          }
        });

        hospitalMarkersRef.current.set(hosp.id, marker);
      }
    });
  }, [hospitals, selectedHospital, userLat, userLng]);

  // When a hospital is selected externally, fly to it and open popup
  useEffect(() => {
    if (!selectedHospital || !mapInstanceRef.current) return;
    const marker = hospitalMarkersRef.current.get(selectedHospital.id);
    if (marker) {
      mapInstanceRef.current.flyTo([selectedHospital.lat, selectedHospital.lng], 15, {
        duration: 0.8,
      });
      marker.openPopup();
    }
  }, [selectedHospital]);

  // Handle layer toggle
  const toggleLayer = () => {
    const modes: TileLayerMode[] = ["streets", "humanitarian", "satellite", "topographic"];
    const nextIndex = (modes.indexOf(activeLayer) + 1) % modes.length;
    setActiveLayer(modes[nextIndex]);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-border/80 shadow-inner transition-all ${
        isFullscreen ? "fixed inset-4 z-50 h-auto rounded-3xl" : "h-80 sm:h-96"
      }`}
    >
      {/* Leaflet DOM Node */}
      <div ref={mapContainerRef} className="h-full w-full bg-accent/20" />

      {/* Top Left: Radius & Live Status HUD */}
      <div className="absolute top-3 left-3 z-400 flex flex-wrap items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-1.5 rounded-xl border border-border/80 bg-background/90 px-3 py-1.5 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-xs">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live 20km Radar</span>
          <span className="text-muted-foreground">·</span>
          <strong className="text-primary">{hospitals.length} Hospitals in Range</strong>
        </div>
      </div>

      {/* Top Right: Layer Switcher & Fullscreen Controls */}
      <div className="absolute top-3 right-3 z-400 flex items-center gap-1.5 pointer-events-auto">
        <button
          type="button"
          onClick={toggleLayer}
          title={`Switch Map Style (Current: ${TILE_LAYERS[activeLayer].name})`}
          className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/90 px-2.5 py-1.5 text-xs font-mono font-medium text-foreground backdrop-blur-md shadow-xs hover:bg-card transition-all cursor-pointer"
        >
          <Layers className="size-3.5 text-primary" />
          <span className="hidden sm:inline">{TILE_LAYERS[activeLayer].name}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          className="rounded-xl border border-border/80 bg-background/90 p-2 text-foreground backdrop-blur-md shadow-xs hover:bg-card transition-all cursor-pointer"
        >
          <Maximize2 className="size-3.5" />
        </button>
      </div>

      {/* Bottom Right: Recenter & Zoom Controls */}
      <div className="absolute bottom-3 right-3 z-400 flex flex-col gap-1.5 pointer-events-auto">
        <Button
          type="button"
          size="sm"
          onClick={onRecenter}
          className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground shadow-md text-xs font-mono font-semibold hover:bg-primary/90 transition-all cursor-pointer"
        >
          <Navigation2 className="size-3.5" />
          <span>Recenter on Me</span>
        </Button>
      </div>

      {/* Bottom Left: Legend Badge */}
      <div className="absolute bottom-3 left-3 z-400 hidden sm:flex items-center gap-3 rounded-xl border border-border/70 bg-background/85 px-3 py-1 text-[11px] font-mono text-muted-foreground backdrop-blur-md pointer-events-none">
        <span className="flex items-center gap-1">
          <span className="size-2.5 rounded-full bg-emerald-500" /> You (Live GPS)
        </span>
        <span className="flex items-center gap-1">
          <span>🏥</span> Hospital Pin (Click to inspect)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full border border-emerald-500" /> {radiusKm} km Radius
        </span>
      </div>
    </div>
  );
};
