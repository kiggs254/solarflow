"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polygon,
  Polyline,
} from "@react-google-maps/api";
import { Loading } from "@/components/ui/loading";
import {
  Search,
  PenLine,
  X,
  Camera,
  MousePointerClick,
  Move,
  Grid3x3,
  Zap,
  Sun,
  Check,
  Undo2,
} from "lucide-react";
import { polygonBBox, samplePanelGrid, isSelfIntersecting, type PanelGridRect } from "@/lib/geometry";
import { formatNumber } from "@/lib/utils";

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

export type RegionPolygon = {
  /** Closed ring (no duplicate last vertex). */
  vertices: { lat: number; lng: number }[];
  /** Geodesic area in m² (Google spherical when available, shoelace fallback otherwise). */
  areaM2: number;
  bbox: RegionBounds;
};

export type EnergyPreview = {
  areaM2: number;
  usableAreaM2: number;
  panels: number;
  kW: number;
  kWhYr: number;
  usableFraction: number;
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
  regionPolygon?: RegionPolygon | null;
  onRegionChange?: (region: RegionPolygon | null) => void;
  /** Called when the user single-clicks the map to pin a point (no polygon) */
  onLocationPin?: (lat: number, lng: number) => void;
  onMapIdle?: (state: { center: { lat: number; lng: number }; zoom: number }) => void;
  onCaptureRequest?: () => void;
  capturing?: boolean;
  initialGeocodeAddress?: string | null;
  energyPreview?: EnergyPreview;
  showPanelGrid?: boolean;
  onPanelGridToggle?: (v: boolean) => void;
  usableFraction?: number;
  onUsableFractionChange?: (n: number) => void;
  /** Panel footprint for the virtual grid (meters). Defaults to a 1.05 × 1.85 panel. */
  panelWidthM?: number;
  panelHeightM?: number;
}

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

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
  regionPolygon,
  onRegionChange,
  onLocationPin,
  onMapIdle,
  onCaptureRequest,
  capturing,
  initialGeocodeAddress,
  energyPreview,
  showPanelGrid,
  onPanelGridToggle,
  usableFraction = 0.75,
  onUsableFractionChange,
  panelWidthM = 1.05,
  panelHeightM = 1.85,
}: SolarMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const [searchValue, setSearchValue] = useState("");
  const [drawMode, setDrawMode] = useState(false);
  const [drawingVertices, setDrawingVertices] = useState<{ lat: number; lng: number }[]>([]);
  const [hoverPoint, setHoverPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [viewZoom, setViewZoom] = useState(12);
  const [selfIntersectError, setSelfIntersectError] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const polygonRef = useRef<google.maps.Polygon | null>(null);
  const pathListenersRef = useRef<google.maps.MapsEventListener[]>([]);
  const geocodeDoneRef = useRef(false);
  const geocodeTargetRef = useRef(initialGeocodeAddress);
  geocodeTargetRef.current = initialGeocodeAddress;

  const mapCenter = selectedLocation ?? viewCenter ?? DEFAULT_CENTER;
  const mapZoom = selectedLocation ? 20 : viewZoom;

  const hasSelection = Boolean(selectedLocation || regionPolygon);

  // Reset the in-progress ring whenever we leave draw mode.
  useEffect(() => {
    if (!drawMode) {
      setDrawingVertices([]);
      setHoverPoint(null);
    }
  }, [drawMode]);

  useEffect(() => {
    if (selectedLocation) {
      setViewCenter(selectedLocation);
      setViewZoom(20);
    }
  }, [selectedLocation?.lat, selectedLocation?.lng]);

  // Auto-dismiss the self-intersect toast after a few seconds.
  useEffect(() => {
    if (!selfIntersectError) return;
    const t = setTimeout(() => setSelfIntersectError(false), 4000);
    return () => clearTimeout(t);
  }, [selfIntersectError]);

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
      if (!e.latLng) return;
      if (drawMode) {
        setSelfIntersectError(false);
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setDrawingVertices((prev) => [...prev, { lat, lng }]);
        return;
      }
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      onLocationPin?.(lat, lng);
    },
    [drawMode, onLocationPin]
  );

  const handleMapMouseMove = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!drawMode || !e.latLng) return;
      setHoverPoint({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    },
    [drawMode]
  );

  /** Extract vertices from a google Polygon path, compute area + bbox, emit. */
  const buildRegionFromPath = useCallback(
    (path: google.maps.MVCArray<google.maps.LatLng>): RegionPolygon | null => {
      const len = path.getLength();
      if (len < 3) return null;
      const vertices: { lat: number; lng: number }[] = [];
      for (let i = 0; i < len; i++) {
        const p = path.getAt(i);
        vertices.push({ lat: p.lat(), lng: p.lng() });
      }
      if (isSelfIntersecting(vertices)) {
        setSelfIntersectError(true);
        return null;
      }
      let areaM2 = 0;
      if (
        typeof google !== "undefined" &&
        google.maps?.geometry?.spherical?.computeArea
      ) {
        areaM2 = google.maps.geometry.spherical.computeArea(path);
      }
      const bbox = polygonBBox(vertices);
      return { vertices, areaM2, bbox };
    },
    []
  );

  const detachPathListeners = useCallback(() => {
    for (const l of pathListenersRef.current) l.remove();
    pathListenersRef.current = [];
  }, []);

  const finishDrawing = useCallback(
    (vertices: { lat: number; lng: number }[]) => {
      if (vertices.length < 3) return;
      if (isSelfIntersecting(vertices)) {
        setSelfIntersectError(true);
        return;
      }
      let areaM2 = 0;
      if (
        typeof google !== "undefined" &&
        google.maps?.geometry?.spherical?.computeArea
      ) {
        const path = vertices.map((v) => new google.maps.LatLng(v.lat, v.lng));
        areaM2 = google.maps.geometry.spherical.computeArea(path);
      }
      const bbox = polygonBBox(vertices);
      const region: RegionPolygon = { vertices, areaM2, bbox };
      setDrawMode(false);
      setDrawingVertices([]);
      setHoverPoint(null);
      onRegionChange?.(region);
      if (mapRef.current && typeof google !== "undefined") {
        const b = new google.maps.LatLngBounds(
          { lat: bbox.south, lng: bbox.west },
          { lat: bbox.north, lng: bbox.east }
        );
        mapRef.current.fitBounds(b, 60);
      }
    },
    [onRegionChange]
  );

  const undoLastVertex = useCallback(() => {
    setDrawingVertices((prev) => prev.slice(0, -1));
    setSelfIntersectError(false);
  }, []);

  // Keyboard shortcuts while drawing: Esc cancels, Enter finishes, Backspace undoes.
  useEffect(() => {
    if (!drawMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setDrawMode(false);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (drawingVertices.length >= 3) finishDrawing(drawingVertices);
      } else if (e.key === "Backspace" || e.key === "Delete") {
        if ((e.target as HTMLElement | null)?.tagName === "INPUT") return;
        e.preventDefault();
        setDrawingVertices((v) => v.slice(0, -1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawMode, drawingVertices, finishDrawing]);

  const handlePersistedPolygonLoad = useCallback(
    (poly: google.maps.Polygon) => {
      polygonRef.current = poly;
      detachPathListeners();
      const path = poly.getPath();
      const emit = () => {
        setSelfIntersectError(false);
        const region = buildRegionFromPath(path);
        if (region && onRegionChange) onRegionChange(region);
      };
      pathListenersRef.current.push(
        path.addListener("set_at", emit),
        path.addListener("insert_at", emit),
        path.addListener("remove_at", emit)
      );
    },
    [buildRegionFromPath, detachPathListeners, onRegionChange]
  );

  const handlePersistedPolygonUnmount = useCallback(() => {
    detachPathListeners();
    polygonRef.current = null;
  }, [detachPathListeners]);

  const handleClear = useCallback(() => {
    onRegionChange?.(null);
    onPanelGridToggle?.(false);
    onLocationPin && onSearchNavigate?.();
  }, [onRegionChange, onPanelGridToggle, onLocationPin, onSearchNavigate]);

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

  // Apply draggableCursor + zoom lock directly on the map instance instead of via the options
  // prop so we never trigger a full setOptions() call (and re-flash the controls) on mode change.
  // During draw mode we pin the zoom level so an accidental scroll-wheel or double-tap doesn't
  // move the map out from under the drawing.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (drawMode) {
      const z = map.getZoom() ?? 20;
      map.setOptions({
        draggableCursor: "crosshair",
        minZoom: z,
        maxZoom: z,
        zoomControl: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
      });
    } else {
      map.setOptions({
        draggableCursor: onLocationPin ? "pointer" : undefined,
        minZoom: undefined,
        maxZoom: undefined,
        zoomControl: true,
        scrollwheel: true,
        disableDoubleClickZoom: false,
      });
    }
  }, [drawMode, onLocationPin]);

  // Compute the virtual panel grid using Google's accurate containsLocation.
  const panelGrid = useMemo<PanelGridRect[]>(() => {
    if (!isLoaded || !showPanelGrid || !regionPolygon) return [];
    if (typeof google === "undefined" || !google.maps?.geometry?.poly) return [];
    const ringPath = regionPolygon.vertices.map(
      (v) => new google.maps.LatLng(v.lat, v.lng)
    );
    const ghost = new google.maps.Polygon({ paths: ringPath });
    const contains = (lat: number, lng: number) =>
      google.maps.geometry.poly.containsLocation(new google.maps.LatLng(lat, lng), ghost);
    return samplePanelGrid({
      vertices: regionPolygon.vertices,
      bbox: regionPolygon.bbox,
      panelWidthM,
      panelHeightM,
      containsFn: contains,
    });
  }, [isLoaded, showPanelGrid, regionPolygon, panelWidthM, panelHeightM]);

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

  const usablePercent = Math.round(usableFraction * 100);

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
              <span className="text-sm font-medium">
                {drawingVertices.length === 0
                  ? "Click to place your first point"
                  : drawingVertices.length < 3
                  ? `${drawingVertices.length} point${drawingVertices.length === 1 ? "" : "s"} · keep clicking to add more`
                  : `${drawingVertices.length} points · click the green dot or press Finish to close`}
              </span>
              <span className="text-xs text-white/50">·</span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-white/70">Esc</span>
              <span className="text-xs text-white/70">to cancel</span>
            </div>
          </div>
        )}

        {/* ── Self-intersecting polygon toast ── */}
        {selfIntersectError && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center">
            <div className="rounded-lg border border-red-400/40 bg-red-600/95 px-4 py-2 text-xs font-medium text-white shadow-lg">
              Polygon can&apos;t cross itself — please redraw
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

          {/* Finish — only while drawing, enabled once 3+ vertices */}
          {drawMode && (
            <button
              type="button"
              onClick={() => finishDrawing(drawingVertices)}
              disabled={drawingVertices.length < 3}
              className={`${toolbarBtn(drawingVertices.length >= 3)} disabled:cursor-not-allowed disabled:opacity-40`}
              title={
                drawingVertices.length < 3
                  ? "Place at least 3 points"
                  : "Finish polygon (Enter)"
              }
            >
              <Check className="h-4 w-4" />
              Finish
            </button>
          )}

          {/* Undo last vertex — only while drawing */}
          {drawMode && drawingVertices.length > 0 && (
            <button
              type="button"
              onClick={undoLastVertex}
              className={toolbarBtn()}
              title="Remove last point (Backspace)"
            >
              <Undo2 className="h-4 w-4 text-gray-500" />
              Undo
            </button>
          )}

          {/* Adjust hint — shown when a polygon exists */}
          {regionPolygon && !drawMode && (
            <div className="flex items-center gap-1.5 rounded-lg border border-gray-200/80 bg-white/95 px-3 py-2 text-xs text-gray-600 shadow-md backdrop-blur-sm">
              <Move className="h-3.5 w-3.5 text-gray-400 shrink-0" />
              Drag handles · right-click a vertex to delete
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

          {/* Panels grid toggle */}
          {regionPolygon && !drawMode && onPanelGridToggle && (
            <button
              type="button"
              onClick={() => onPanelGridToggle(!showPanelGrid)}
              className={toolbarBtn(showPanelGrid)}
              title={showPanelGrid ? "Hide virtual panel grid" : "Show virtual panel grid"}
            >
              <Grid3x3 className="h-4 w-4" />
              Panels grid
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

        {/* ── Live energy HUD (bottom-right) ── */}
        {regionPolygon && energyPreview && !drawMode && (
          <div className="absolute bottom-3 right-3 z-10 w-64 rounded-2xl border border-white/30 bg-gray-900/85 p-3 text-white shadow-xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
                </span>
                Live estimate
              </div>
              <Sun className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[11px] uppercase tracking-wide text-white/60">Area</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {formatNumber(energyPreview.areaM2, 1)} m²
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-[11px] uppercase tracking-wide text-white/60">Usable</dt>
                <dd className="font-mono font-semibold tabular-nums text-amber-200">
                  {formatNumber(energyPreview.usableAreaM2, 1)} m²
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/60">
                  <Grid3x3 className="h-3 w-3" />
                  Panels
                </dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {energyPreview.panels} <span className="text-xs text-white/50">· {formatNumber(energyPreview.kW, 2)} kW</span>
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2 border-t border-white/10 pt-1.5">
                <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-amber-300">
                  <Zap className="h-3 w-3" />
                  Est yearly
                </dt>
                <dd className="font-mono text-base font-bold tabular-nums text-amber-300">
                  {formatNumber(energyPreview.kWhYr, 0)} kWh
                </dd>
              </div>
            </dl>
            {onUsableFractionChange && (
              <div className="mt-3 border-t border-white/10 pt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-white/60">
                  <span>Usable roof</span>
                  <span className="font-mono tabular-nums text-amber-200">{usablePercent}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={90}
                  step={1}
                  value={usablePercent}
                  onChange={(e) => onUsableFractionChange(parseInt(e.target.value, 10) / 100)}
                  className="w-full accent-amber-400"
                  aria-label="Usable roof percentage"
                />
              </div>
            )}
          </div>
        )}

        {/* ── Google Map ── */}
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "560px" }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          onIdle={handleIdle}
          onClick={drawMode || onLocationPin ? handleMapClick : undefined}
          onMouseMove={drawMode ? handleMapMouseMove : undefined}
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

          {/* ── In-progress drawing: filled preview, edges, rubber-band, vertex markers ── */}
          {drawMode && drawingVertices.length >= 3 && (
            <Polygon
              key="drawing-preview-fill"
              paths={drawingVertices}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.18,
                strokeColor: "#f59e0b",
                strokeWeight: 2.5,
                strokeOpacity: 0.95,
                clickable: false,
                zIndex: 1,
              }}
            />
          )}
          {drawMode && drawingVertices.length >= 2 && drawingVertices.length < 3 && (
            <Polyline
              key="drawing-preview-line"
              path={drawingVertices}
              options={{
                strokeColor: "#f59e0b",
                strokeWeight: 2.5,
                strokeOpacity: 0.95,
                clickable: false,
                zIndex: 1,
              }}
            />
          )}
          {/* Rubber-band from last vertex to hover point */}
          {drawMode && drawingVertices.length > 0 && hoverPoint && (
            <Polyline
              key="drawing-rubber-band"
              path={[drawingVertices[drawingVertices.length - 1], hoverPoint]}
              options={{
                strokeColor: "#f59e0b",
                strokeOpacity: 0,
                strokeWeight: 2,
                clickable: false,
                zIndex: 1,
                icons: [
                  {
                    icon: {
                      path: "M 0,-1 0,1",
                      strokeOpacity: 0.9,
                      strokeColor: "#f59e0b",
                      scale: 2,
                    },
                    offset: "0",
                    repeat: "8px",
                  },
                ],
              }}
            />
          )}
          {/* Closing preview (dashed green) from last vertex back to first — only once 3+ points */}
          {drawMode && drawingVertices.length >= 3 && (
            <Polyline
              key="drawing-close-preview"
              path={[drawingVertices[drawingVertices.length - 1], drawingVertices[0]]}
              options={{
                strokeColor: "#10b981",
                strokeOpacity: 0,
                strokeWeight: 2,
                clickable: false,
                zIndex: 1,
                icons: [
                  {
                    icon: {
                      path: "M 0,-1 0,1",
                      strokeOpacity: 0.9,
                      strokeColor: "#10b981",
                      scale: 2,
                    },
                    offset: "0",
                    repeat: "8px",
                  },
                ],
              }}
            />
          )}
          {/* Vertex markers — first vertex is a larger green "close" target once 3+ points exist */}
          {drawMode &&
            typeof google !== "undefined" &&
            drawingVertices.map((v, i) => {
              const isFirst = i === 0;
              const canClose = isFirst && drawingVertices.length >= 3;
              return (
                <Marker
                  key={`dv-${i}`}
                  position={v}
                  clickable={canClose}
                  onClick={canClose ? () => finishDrawing(drawingVertices) : undefined}
                  title={canClose ? "Click to close the polygon" : undefined}
                  zIndex={5}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: canClose ? 10 : 6,
                    fillColor: canClose ? "#10b981" : "#f59e0b",
                    fillOpacity: 1,
                    strokeColor: "#ffffff",
                    strokeWeight: 2,
                  }}
                />
              );
            })}

          {/* Persisted polygon — editable and draggable */}
          {regionPolygon && !drawMode && (
            <Polygon
              key={`${regionPolygon.vertices.length}-${regionPolygon.bbox.north.toFixed(6)}-${regionPolygon.bbox.west.toFixed(6)}`}
              paths={regionPolygon.vertices}
              onLoad={handlePersistedPolygonLoad}
              onUnmount={handlePersistedPolygonUnmount}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.15,
                strokeColor: "#f59e0b",
                strokeWeight: 2.5,
                editable: true,
                draggable: true,
                clickable: true,
                zIndex: 2,
              }}
            />
          )}

          {/* Virtual panel grid */}
          {!drawMode &&
            panelGrid.map((rect, i) => (
              <Polygon
                key={`panel-${i}`}
                paths={rect.corners}
                options={{
                  fillColor: "#fbbf24",
                  fillOpacity: 0.55,
                  strokeColor: "#92400e",
                  strokeOpacity: 0.8,
                  strokeWeight: 0.5,
                  clickable: false,
                  zIndex: 3,
                }}
              />
            ))}

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
