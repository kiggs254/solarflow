"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polygon,
  DrawingManager,
  Rectangle,
} from "@react-google-maps/api";
import { Loading } from "@/components/ui/loading";
import { Search, PenLine, X, Camera, MousePointerClick, Move } from "lucide-react";

const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 };

export type RegionBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

interface SolarMapProps {
  onSearchNavigate?: () => void;
  onAddressResolved?: (formattedAddress: string) => void;
  roofSegments?: {
    center: { latitude: number; longitude: number };
    boundingBox: {
      sw: { latitude: number; longitude: number };
      ne: { latitude: number; longitude: number };
    };
  }[];
  panels?: { center: { latitude: number; longitude: number }; orientation: string }[];
  selectedLocation?: { lat: number; lng: number } | null;
  regionBounds?: RegionBounds | null;
  onRegionChange?: (bounds: RegionBounds | null) => void;
  /** Called when the user single-clicks the map to pin a point (no rectangle) */
  onLocationPin?: (lat: number, lng: number) => void;
  onMapIdle?: (state: { center: { lat: number; lng: number }; zoom: number }) => void;
  onCaptureRequest?: () => void;
  capturing?: boolean;
  initialGeocodeAddress?: string | null;
}

const libraries: ("places" | "drawing")[] = ["places", "drawing"];

// Floating toolbar button style helpers
const toolbarBtn = (active?: boolean) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium shadow-md transition-all focus:outline-none ${
    active
      ? "bg-amber-500 text-white shadow-amber-200 dark:shadow-amber-900/40"
      : "bg-white/95 text-gray-800 hover:bg-white border border-gray-200/80 backdrop-blur-sm"
  }`;

export function SolarMap({
  onSearchNavigate,
  onAddressResolved,
  roofSegments,
  selectedLocation,
  regionBounds,
  onRegionChange,
  onLocationPin,
  onMapIdle,
  onCaptureRequest,
  capturing,
  initialGeocodeAddress,
}: SolarMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [searchValue, setSearchValue] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [viewZoom, setViewZoom] = useState(12);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rectRef = useRef<google.maps.Rectangle | null>(null);
  const geocodeDoneRef = useRef(false);
  const geocodeTargetRef = useRef(initialGeocodeAddress);
  geocodeTargetRef.current = initialGeocodeAddress;

  const mapCenter = selectedLocation ?? viewCenter ?? DEFAULT_CENTER;
  const mapZoom = selectedLocation ? 20 : viewZoom;

  const hasSelection = Boolean(selectedLocation || regionBounds);

  // Escape key cancels draw mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawMode) setDrawMode(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode]);

  useEffect(() => {
    if (selectedLocation) {
      setViewCenter(selectedLocation);
      setViewZoom(20);
    }
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;

      const addr = geocodeTargetRef.current?.trim();
      if (addr && !geocodeDoneRef.current && !selectedLocation && typeof google !== "undefined") {
        geocodeDoneRef.current = true;
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ address: addr }, (results, status) => {
          if (status !== "OK" || !results?.[0]?.geometry?.location) {
            geocodeDoneRef.current = false;
            return;
          }
          const loc = results[0].geometry!.location!;
          const lat = loc.lat();
          const lng = loc.lng();
          setViewCenter({ lat, lng });
          setViewZoom(20);
          map.panTo({ lat, lng });
          map.setZoom(20);
          const formatted = results[0].formatted_address || addr;
          setSearchValue(formatted);
          onAddressResolved?.(formatted);
        });
      }

      if (inputRef.current) {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
        });
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();
          if (place?.geometry?.location) {
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();
            onSearchNavigate?.();
            setViewCenter({ lat, lng });
            setViewZoom(20);
            map.panTo({ lat, lng });
            map.setZoom(20);
            const resolved = place.formatted_address || "";
            setSearchValue(resolved);
            onAddressResolved?.(resolved);
          }
        });
      }
    },
    [onAddressResolved, onSearchNavigate, selectedLocation]
  );

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onMapIdle) return;
    const c = map.getCenter();
    const z = map.getZoom() ?? 18;
    if (c) {
      const center = { lat: c.lat(), lng: c.lng() };
      onMapIdle({ center, zoom: z });
      if (!selectedLocation) {
        setViewCenter(center);
        setViewZoom(z);
      }
    }
  }, [onMapIdle, selectedLocation]);

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (drawMode || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onLocationPin?.(lat, lng);
    },
    [drawMode, onLocationPin]
  );

  const onRectangleComplete = useCallback(
    (rect: google.maps.Rectangle) => {
      const b = rect.getBounds();
      rect.setMap(null);
      if (b && onRegionChange) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        const bounds: RegionBounds = {
          north: ne.lat(),
          east: ne.lng(),
          south: sw.lat(),
          west: sw.lng(),
        };
        onRegionChange(bounds);
        // Fit map to drawn region
        mapRef.current?.fitBounds(b, 60);
      }
      setDrawMode(false);
    },
    [onRegionChange]
  );

  const handleRectBoundsChanged = useCallback(() => {
    if (!rectRef.current || !onRegionChange) return;
    const b = rectRef.current.getBounds();
    if (!b) return;
    const ne = b.getNorthEast();
    const sw = b.getSouthWest();
    onRegionChange({
      north: ne.lat(),
      east: ne.lng(),
      south: sw.lat(),
      west: sw.lng(),
    });
  }, [onRegionChange]);

  const handleClear = useCallback(() => {
    onRegionChange?.(null);
    onLocationPin && onSearchNavigate?.();
  }, [onRegionChange, onLocationPin, onSearchNavigate]);

  // Memoize static map options so @react-google-maps/api never calls setOptions()
  // on every render — that's what causes the map-type control to flicker.
  const mapOptions = useMemo<google.maps.MapOptions>(() => {
    if (!isLoaded) return {};
    return {
      styles: MAP_STYLES,
      mapTypeId: "satellite",
      tilt: 0,
      mapTypeControl: true,
      mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      streetViewControl: false,
      fullscreenControl: true,
      fullscreenControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]); // only recomputes once when the API loads

  // Apply draggableCursor directly on the map instance instead of via the options prop
  // so we never trigger a full setOptions() call (and re-flash the controls) on mode change.
  useEffect(() => {
    mapRef.current?.setOptions({
      draggableCursor: drawMode ? "crosshair" : onLocationPin ? "pointer" : undefined,
    });
  }, [drawMode, onLocationPin]);

  if (!isLoaded) {
    return (
      <div className="flex h-[560px] items-center justify-center rounded-xl border border-border bg-muted">
        <Loading size="lg" />
      </div>
    );
  }

  const roofPolygons = roofSegments?.map((seg, i) => {
    const { sw, ne } = seg.boundingBox;
    return {
      key: i,
      paths: [
        { lat: sw.latitude, lng: sw.longitude },
        { lat: sw.latitude, lng: ne.longitude },
        { lat: ne.latitude, lng: ne.longitude },
        { lat: ne.latitude, lng: sw.longitude },
      ],
    };
  });

  const rectBounds = regionBounds ?? undefined;

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search address…"
          className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {/* Map container — all controls float inside */}
      <div className="relative overflow-hidden rounded-xl border border-border shadow-sm">

        {/* ── Draw mode overlay banner ── */}
        {drawMode && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
            <div className="flex items-center gap-2.5 rounded-full bg-gray-900/85 px-5 py-2.5 text-white shadow-xl backdrop-blur-md">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
              </span>
              <span className="text-sm font-medium">Click and drag to draw your area</span>
              <span className="text-xs text-white/50">·</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-white/70">Esc</span>
              <span className="text-xs text-white/70">to cancel</span>
            </div>
          </div>
        )}

        {/* ── No-selection hint (bottom-center) ── */}
        {!drawMode && !hasSelection && (
          <div className="pointer-events-none absolute bottom-10 inset-x-0 z-10 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-gray-900/65 px-4 py-2 text-white text-xs backdrop-blur-sm shadow-md">
              <MousePointerClick className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              Click map to analyze a point · or use Draw area for a region
            </div>
          </div>
        )}

        {/* ── Floating toolbar (top-left) ── */}
        <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
          {/* Draw / Cancel */}
          {onRegionChange && (
            <button
              type="button"
              onClick={() => setDrawMode((d) => !d)}
              className={toolbarBtn(drawMode)}
              title={drawMode ? "Cancel drawing (Esc)" : "Draw analysis area"}
            >
              {drawMode ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <PenLine className="h-4 w-4" />
                  Draw area
                </>
              )}
            </button>
          )}

          {/* Adjust hint — shown when a rectangle exists */}
          {rectBounds && !drawMode && (
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-md backdrop-blur-sm">
              <Move className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              Drag edges to adjust
            </div>
          )}

          {/* Clear */}
          {hasSelection && !drawMode && (
            <button
              type="button"
              onClick={handleClear}
              className={toolbarBtn()}
              title="Clear selection"
            >
              <X className="h-4 w-4 text-gray-500" />
              Clear
            </button>
          )}

          {/* Snapshot */}
          {onCaptureRequest && !drawMode && (
            <button
              type="button"
              onClick={onCaptureRequest}
              disabled={capturing}
              className={`${toolbarBtn()} disabled:opacity-50`}
              title="Capture map snapshot for proposal"
            >
              <Camera className="h-4 w-4" />
              {capturing ? "Capturing…" : "Snapshot"}
            </button>
          )}
        </div>

        {/* ── Google Map ── */}
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "560px" }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          onIdle={handleIdle}
          onClick={onLocationPin ? handleMapClick : undefined}
          options={mapOptions}
        >
          {/* Analysis point marker */}
          {selectedLocation && (
            <Marker
              position={selectedLocation}
              icon={
                typeof google !== "undefined"
                  ? {
                      path: google.maps.SymbolPath.CIRCLE,
                      scale: 10,
                      fillColor: "#f59e0b",
                      fillOpacity: 1,
                      strokeColor: "#ffffff",
                      strokeWeight: 3,
                    }
                  : undefined
              }
            />
          )}

          {/* Drawing manager — active only in draw mode */}
          {drawMode && onRegionChange && typeof google !== "undefined" && google.maps?.drawing && (
            <DrawingManager
              key="drawing-active"
              options={{
                drawingControl: false,
                rectangleOptions: {
                  fillColor: "#f59e0b",
                  fillOpacity: 0.18,
                  strokeColor: "#f59e0b",
                  strokeWeight: 2.5,
                  clickable: false,
                  editable: false,
                  zIndex: 1,
                },
              }}
              drawingMode={google.maps.drawing.OverlayType.RECTANGLE}
              onRectangleComplete={onRectangleComplete}
            />
          )}

          {/* Persisted rectangle — editable and draggable */}
          {rectBounds && !drawMode && (
            <Rectangle
              key={`${rectBounds.north}-${rectBounds.south}-${rectBounds.east}-${rectBounds.west}`}
              bounds={rectBounds}
              onLoad={(r) => { rectRef.current = r; }}
              onUnmount={() => { rectRef.current = null; }}
              onBoundsChanged={handleRectBoundsChanged}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.15,
                strokeColor: "#f59e0b",
                strokeWeight: 2.5,
                editable: true,
                draggable: true,
                clickable: true,
              }}
            />
          )}

          {/* Roof segment polygons */}
          {roofPolygons?.map((poly) => (
            <Polygon
              key={poly.key}
              paths={poly.paths}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.25,
                strokeColor: "#f59e0b",
                strokeWeight: 1.5,
                strokeOpacity: 0.7,
              }}
            />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
}
