"use client";

import { useCallback, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import { cn } from "@/lib/utils";

const libraries: "places"[] = ["places"];

export interface AddressAutocompleteProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (address: string) => void;
  onPlaceResolved?: (payload: { address: string; latitude: number; longitude: number }) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function AddressAutocomplete({
  id,
  label,
  value,
  onChange,
  onPlaceResolved,
  placeholder,
  required,
  disabled,
  className,
  error,
}: AddressAutocompleteProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  const attach = useCallback(() => {
    if (!isLoaded || !apiKey || !inputRef.current || loadError) return;
    if (acRef.current) return;
    acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ["address"],
      fields: ["formatted_address", "geometry"],
    });
    acRef.current.addListener("place_changed", () => {
      const place = acRef.current?.getPlace();
      if (!place?.geometry?.location) return;
      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();
      const addr = place.formatted_address || inputRef.current?.value || "";
      onChange(addr);
      onPlaceResolved?.({ address: addr, latitude: lat, longitude: lng });
    });
  }, [apiKey, isLoaded, loadError, onChange, onPlaceResolved]);

  useEffect(() => {
    attach();
    return () => {
      const g = typeof window !== "undefined" ? window.google : undefined;
      if (g?.maps?.event && acRef.current) {
        g.maps.event.clearInstanceListeners(acRef.current);
      }
      acRef.current = null;
    };
  }, [attach]);

  const showFallback = !apiKey || loadError || !isLoaded;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-brand-600"> *</span>}
        </label>
      )}
      <input
        ref={inputRef}
        id={id}
        type="text"
        autoComplete="street-address"
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
          "placeholder:text-muted-foreground",
          "focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/20",
          error && "border-red-500",
          disabled && "cursor-not-allowed opacity-60"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
      />
      {showFallback && apiKey === "" && (
        <p className="text-xs text-muted-foreground">
          Add <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> for address
          autocomplete. You can still type your full address.
        </p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
