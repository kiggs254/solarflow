"use client";

import { Suspense, useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBuildingInsights } from "@/hooks/use-solar";
import { captureMapSnapshot } from "@/hooks/use-equipment";
import { SolarMap, type RegionBounds } from "@/components/solar/solar-map";
import { BuildingInsightsPanel } from "@/components/solar/building-insights-panel";
import { SystemDesigner, type DesignCompletePayload } from "@/components/solar/system-designer";
import { SolarHeatmap } from "@/components/solar/solar-heatmap";
import { CreateProposalDialog } from "@/components/solar/create-proposal-dialog";
import { Loading, PageLoading } from "@/components/ui/loading";
import { Card, CardContent } from "@/components/ui/card";
import { Sun } from "lucide-react";

function parseSolarSearchParams(searchParams: ReturnType<typeof useSearchParams>) {
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const addrRaw = searchParams.get("address");
  const addr = addrRaw?.trim() ?? "";
  const leadId = searchParams.get("leadId");

  let location: { lat: number; lng: number } | null = null;
  if (lat && lng) {
    const la = parseFloat(lat);
    const lo = parseFloat(lng);
    if (Number.isFinite(la) && Number.isFinite(lo)) location = { lat: la, lng: lo };
  }

  return {
    location,
    addressParam: addr,
    /** Geocode on map load when we only have a street address */
    geocodeAddress: !location && addr ? addr : null,
    leadId: leadId || null,
  };
}

function SolarPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlBoot = useMemo(() => parseSolarSearchParams(searchParams), [searchParams]);

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(() => urlBoot.location);
  const [address, setAddress] = useState(() => urlBoot.addressParam);
  const [regionBounds, setRegionBounds] = useState<RegionBounds | null>(null);
  const [mapSnapshot, setMapSnapshot] = useState<string | null>(null);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const mapStateRef = useRef({ center: { lat: 37.7749, lng: -122.4194 }, zoom: 12 });
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | null>(() => urlBoot.leadId);

  useEffect(() => {
    setLocation(urlBoot.location);
    setAddress(urlBoot.addressParam);
    setPreselectedLeadId(urlBoot.leadId);
  }, [urlBoot.location?.lat, urlBoot.location?.lng, urlBoot.addressParam, urlBoot.leadId]);

  const { insights, isLoading } = useBuildingInsights(location?.lat ?? null, location?.lng ?? null);

  const [proposalOpen, setProposalOpen] = useState(false);
  const [designPayload, setDesignPayload] = useState<DesignCompletePayload | null>(null);

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLocation({ lat, lng });
  }, []);

  const handleMapIdle = useCallback((state: { center: { lat: number; lng: number }; zoom: number }) => {
    mapStateRef.current = state;
  }, []);

  const handleCapture = useCallback(async () => {
    const c = location || mapStateRef.current.center;
    const z = location ? mapStateRef.current.zoom : mapStateRef.current.zoom;
    if (!c) return;
    setCapturing(true);
    setSnapshotError(null);
    try {
      const payload: Parameters<typeof captureMapSnapshot>[0] = {
        lat: c.lat,
        lng: c.lng,
        zoom: z || 20,
        width: 640,
        height: 400,
      };
      if (regionBounds) {
        payload.neLat = regionBounds.north;
        payload.neLng = regionBounds.east;
        payload.swLat = regionBounds.south;
        payload.swLng = regionBounds.west;
      }
      const { dataUrl } = await captureMapSnapshot(payload);
      setMapSnapshot(dataUrl);
    } catch (e) {
      setMapSnapshot(null);
      const msg = e instanceof Error ? e.message : String(e);
      setSnapshotError(msg.length > 600 ? `${msg.slice(0, 600)}…` : msg);
    } finally {
      setCapturing(false);
    }
  }, [location, regionBounds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Solar Analysis</h1>
        <p className="text-sm text-muted-foreground">
          Analyze solar potential, draw a region, capture a map snapshot, and create proposals
        </p>
        {preselectedLeadId && (
          <p className="mt-2 text-xs text-brand-700">
            Opened from a lead — the proposal dialog will pre-select this lead when you finish the design.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SolarMap
            onLocationSelect={handleLocationSelect}
            onAddressResolved={setAddress}
            selectedLocation={location}
            roofSegments={insights?.solarPotential?.roofSegmentStats}
            regionBounds={regionBounds}
            onRegionChange={setRegionBounds}
            onMapIdle={handleMapIdle}
            onCaptureRequest={handleCapture}
            capturing={capturing}
            initialGeocodeAddress={urlBoot.geocodeAddress}
          />

          {snapshotError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-foreground"
            >
              <p className="font-medium text-destructive">Map snapshot failed</p>
              <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{snapshotError}</p>
              {snapshotError.toLowerCase().includes("not activated") ||
              snapshotError.toLowerCase().includes("enable this api") ? (
                <p className="mt-3 text-muted-foreground">
                  In{" "}
                  <a
                    className="text-brand-600 underline hover:text-brand-700"
                    href="https://console.cloud.google.com/google/maps-apis/api-list"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Google Cloud → APIs & Services
                  </a>
                  , enable{" "}
                  <strong className="text-foreground">Maps Static API</strong> for the same project as your
                  Maps key (separate from Maps JavaScript API). Billing must be enabled on the project.
                </p>
              ) : null}
            </div>
          )}

          {isLoading && (
            <Card>
              <CardContent className="py-8">
                <Loading size="lg" className="mb-2" />
                <p className="text-center text-sm text-muted-foreground">Analyzing solar potential...</p>
              </CardContent>
            </Card>
          )}

          {insights && <SolarHeatmap insights={insights} />}
        </div>

        <div className="space-y-6">
          {insights ? (
            <>
              <BuildingInsightsPanel insights={insights} />
              <SystemDesigner
                insights={insights}
                onDesignComplete={(d) => {
                  setDesignPayload(d);
                  setProposalOpen(true);
                }}
              />
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Sun className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Select a Location</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Search for an address or click on the map to view solar analysis data
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {insights && designPayload && location && (
        <CreateProposalDialog
          open={proposalOpen}
          onClose={() => {
            setProposalOpen(false);
            setDesignPayload(null);
          }}
          insights={insights}
          design={designPayload}
          leadAddress={address}
          latitude={location.lat}
          longitude={location.lng}
          mapSnapshotBase64={mapSnapshot}
          regionBounds={regionBounds}
          preselectedLeadId={preselectedLeadId}
          onCreated={() => router.push("/proposals")}
        />
      )}
    </div>
  );
}

export default function SolarPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <SolarPageInner />
    </Suspense>
  );
}
