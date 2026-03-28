"use client";

import { useState, useCallback, useRef } from "react";
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
  onLocationSelect: (lat: number, lng: number) => void;
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
  onLocationSelect,
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
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rectangleRef = useRef<google.maps.Rectangle | null>(null);
  const geocodeDoneRef = useRef(false);
  const geocodeTargetRef = useRef(initialGeocodeAddress);
  geocodeTargetRef.current = initialGeocodeAddress;

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
          map.panTo({ lat, lng });
          map.setZoom(20);
          onLocationSelect(lat, lng);
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
            map.panTo({ lat, lng });
            map.setZoom(20);
            onLocationSelect(lat, lng);
            const addr = place.formatted_address || "";
            setSearchValue(addr);
            onAddressResolved?.(addr);
          }
        });
      }
    },
    [onLocationSelect, onAddressResolved, selectedLocation]
  );

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onLocationSelect(lat, lng);
        mapRef.current?.panTo({ lat, lng });
        if (mapRef.current && mapRef.current.getZoom()! < 18) {
          mapRef.current.setZoom(20);
        }
      }
    },
    [onLocationSelect]
  );

  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (!map || !onMapIdle) return;
    const c = map.getCenter();
    const z = map.getZoom() ?? 18;
    if (c) onMapIdle({ center: { lat: c.lat(), lng: c.lng() }, zoom: z });
  }, [onMapIdle]);

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

  const pushBoundsFromRectangle = useCallback(() => {
    const r = rectangleRef.current;
    if (!r || !onRegionChange) return;
    const b = r.getBounds();
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
          center={selectedLocation || DEFAULT_CENTER}
          zoom={selectedLocation ? 20 : 12}
          onClick={drawMode ? undefined : handleMapClick}
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
              bounds={rectBounds}
              options={{
                fillColor: "#f59e0b",
                fillOpacity: 0.2,
                strokeColor: "#f59e0b",
                strokeWeight: 2,
                editable: true,
                draggable: true,
                clickable: true,
              }}
              onLoad={(r) => {
                rectangleRef.current = r;
              }}
              onUnmount={() => {
                rectangleRef.current = null;
              }}
              onBoundsChanged={pushBoundsFromRectangle}
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

      {!selectedLocation && (
        <p className="text-center text-sm text-muted-foreground">
          <MapPin className="inline h-4 w-4 mr-1" />
          Search for an address or click on the map to analyze solar potential
        </p>
      )}
    </div>
  );
}
