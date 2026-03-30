"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polygon,
  DrawingManager,
  Rectangle,
} from "@react-google-maps/api";
import { Loading } from "@/components/ui/loading";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Square, Trash2, Camera } from "lucide-react";

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
  /** Called when the user picks a search result — clear analysis location / region on the parent so the map can move without snapping back to the old marker. */
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
  onMapIdle?: (state: { center: { lat: number; lng: number }; zoom: number }) => void;
  onCaptureRequest?: () => void;
  capturing?: boolean;
  /** If set (and no selectedLocation yet), geocode once after the map loads */
  initialGeocodeAddress?: string | null;
}

const libraries: ("places" | "drawing")[] = ["places", "drawing"];

export function SolarMap({
  onSearchNavigate,
  onAddressResolved,
  roofSegments,
  selectedLocation,
  regionBounds,
  onRegionChange,
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
  /** Map view when there is no analysis point yet (search / pan / zoom only). */
  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [viewZoom, setViewZoom] = useState(12);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const geocodeDoneRef = useRef(false);
  const geocodeTargetRef = useRef(initialGeocodeAddress);
  geocodeTargetRef.current = initialGeocodeAddress;

  const mapCenter = selectedLocation ?? viewCenter ?? DEFAULT_CENTER;
  const mapZoom = selectedLocation ? 20 : viewZoom;

  /** Keep local view in sync when parent supplies an analysis point (URL or after drawing). */
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

  const onRectangleComplete = useCallback(
    (rect: google.maps.Rectangle) => {
      const b = rect.getBounds();
      rect.setMap(null);
      if (b && onRegionChange) {
        const ne = b.getNorthEast();
        const sw = b.getSouthWest();
        onRegionChange({
          north: ne.lat(),
          east: ne.lng(),
          south: sw.lat(),
          west: sw.lng(),
        });
      }
      setDrawMode(false);
    },
    [onRegionChange]
  );

  if (!isLoaded) {
    return (
      <div className="flex h-[500px] items-center justify-center rounded-xl border border-border bg-muted">
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
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search address..."
          className="flex h-10 w-full rounded-lg border border-input bg-card pl-9 pr-4 text-sm shadow-sm placeholder:text-muted-foreground focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={drawMode ? "default" : "outline"}
          size="sm"
          onClick={() => setDrawMode((d) => !d)}
          disabled={!onRegionChange}
        >
          <Square className="mr-1.5 h-3.5 w-3.5" />
          {drawMode ? "Drawing… click drag on map" : "Draw region"}
        </Button>
        {onRegionChange && regionBounds && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRegionChange(null)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Clear region
          </Button>
        )}
        {onCaptureRequest && (
          <Button type="button" variant="secondary" size="sm" onClick={onCaptureRequest} disabled={capturing}>
            <Camera className="mr-1.5 h-3.5 w-3.5" />
            {capturing ? "Capturing…" : "Capture snapshot"}
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "500px" }}
          center={mapCenter}
          zoom={mapZoom}
          onLoad={onMapLoad}
          onIdle={handleIdle}
          options={{
            styles: MAP_STYLES,
            mapTypeId: "satellite",
            tilt: 0,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            draggableCursor: drawMode ? "crosshair" : undefined,
          }}
        >
          {selectedLocation && <Marker position={selectedLocation} />}

          {drawMode && onRegionChange && typeof google !== "undefined" && google.maps?.drawing && (
            <DrawingManager
              key="drawing-active"
              options={{
                drawingControl: false,
                rectangleOptions: {
                  fillColor: "#f59e0b",
                  fillOpacity: 0.25,
                  strokeColor: "#f59e0b",
                  strokeWeight: 2,
                  clickable: false,
                  editable: false,
                  zIndex: 1,
                },
              }}
              drawingMode={google.maps.drawing.OverlayType.RECTANGLE}
              onRectangleComplete={onRectangleComplete}
            />
          )}

          {rectBounds && !drawMode && (
            <Rectangle
              key={`${rectBounds.north}-${rectBounds.south}-${rectBounds.east}-${rectBounds.west}`}
              bounds={rectBounds}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.2,
                strokeColor: "#f59e0b",
                strokeWeight: 2,
                editable: false,
                draggable: false,
                clickable: false,
              }}
            />
          )}

          {roofPolygons?.map((poly) => (
            <Polygon
              key={poly.key}
              paths={poly.paths}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.3,
                strokeColor: "#f59e0b",
                strokeWeight: 2,
                strokeOpacity: 0.8,
              }}
            />
          ))}
        </GoogleMap>
      </div>

      {!regionBounds && (
        <p className="text-center text-sm text-muted-foreground">
          <MapPin className="inline h-4 w-4 mr-1" />
          Search to move the map, then use <span className="font-medium text-foreground">Draw region</span> to
          select the area. Solar analysis uses the center of your rectangle.
        </p>
      )}
    </div>
  );
}
