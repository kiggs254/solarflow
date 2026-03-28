import useSWR from "swr";
import type { SolarPanel, Battery, Inverter } from "@prisma/client";
import type { GoogleStaticMapSnapshotInput } from "@/lib/google-static-map-snapshot";
import {
  buildGoogleStaticMapSnapshotUrl,
  isLikelyStaticMapImageBytes,
  normalizeGoogleMapsApiKey,
} from "@/lib/google-static-map-snapshot";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePanels(activeOnly = false) {
  const q = activeOnly ? "?active=true" : "";
  const { data, error, isLoading, mutate } = useSWR(`/api/equipment/panels${q}`, fetcher);
  return {
    panels: (data?.data ?? []) as SolarPanel[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useBatteries(activeOnly = false) {
  const q = activeOnly ? "?active=true" : "";
  const { data, error, isLoading, mutate } = useSWR(`/api/equipment/batteries${q}`, fetcher);
  return {
    batteries: (data?.data ?? []) as Battery[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export function useInverters(activeOnly = false) {
  const q = activeOnly ? "?active=true" : "";
  const { data, error, isLoading, mutate } = useSWR(`/api/equipment/inverters${q}`, fetcher);
  return {
    inverters: (data?.data ?? []) as Inverter[],
    isLoading,
    isError: !!error,
    mutate,
  };
}

export async function createPanel(data: Partial<SolarPanel>) {
  const res = await fetch("/api/equipment/panels", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create panel");
  return res.json();
}

export async function updatePanel(id: string, data: Partial<SolarPanel>) {
  const res = await fetch(`/api/equipment/panels/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update panel");
  return res.json();
}

export async function deletePanel(id: string) {
  const res = await fetch(`/api/equipment/panels/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete panel");
  return res.json();
}

export async function createBattery(data: Partial<Battery>) {
  const res = await fetch("/api/equipment/batteries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create battery");
  return res.json();
}

export async function updateBattery(id: string, data: Partial<Battery>) {
  const res = await fetch(`/api/equipment/batteries/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update battery");
  return res.json();
}

export async function deleteBattery(id: string) {
  const res = await fetch(`/api/equipment/batteries/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete battery");
  return res.json();
}

export async function createInverter(data: Partial<Inverter>) {
  const res = await fetch("/api/equipment/inverters", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create inverter");
  return res.json();
}

export async function updateInverter(id: string, data: Partial<Inverter>) {
  const res = await fetch(`/api/equipment/inverters/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update inverter");
  return res.json();
}

export async function deleteInverter(id: string) {
  const res = await fetch(`/api/equipment/inverters/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete inverter");
  return res.json();
}

async function captureMapSnapshotInBrowser(payload: GoogleStaticMapSnapshotInput) {
  const key = normalizeGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
  if (!key) throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY missing");

  const url = buildGoogleStaticMapSnapshotUrl(key, payload);
  const res = await fetch(url);
  const blob = await res.blob();
  const ab = await blob.arrayBuffer();
  const bytes = new Uint8Array(ab);

  if (!res.ok) {
    const text = new TextDecoder().decode(bytes.slice(0, 600));
    throw new Error(text.trim() || `HTTP ${res.status}`);
  }

  if (!isLikelyStaticMapImageBytes(bytes)) {
    const text = new TextDecoder().decode(bytes.slice(0, 600));
    throw new Error(text.trim() || "Response was not a map image");
  }

  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });

  const mime = blob.type || res.headers.get("content-type") || "image/png";
  const base64 = dataUrl.includes(",") ? (dataUrl.split(",")[1] ?? "") : "";

  return { dataUrl, base64, mime };
}

export async function captureMapSnapshot(payload: GoogleStaticMapSnapshotInput) {
  let browserErr: string | null = null;
  if (typeof window !== "undefined") {
    const key = normalizeGoogleMapsApiKey(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY);
    if (key) {
      try {
        return await captureMapSnapshotInBrowser(payload);
      } catch (e) {
        browserErr = e instanceof Error ? e.message : String(e);
        console.warn("Browser static map snapshot failed, trying /api/solar/map-snapshot:", browserErr);
      }
    }
  }

  const res = await fetch("/api/solar/map-snapshot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as {
      error?: string;
      detail?: string;
      hint?: string;
      upstreamStatus?: number;
    };
    const parts = [
      err.detail,
      err.hint,
      err.upstreamStatus != null ? `HTTP ${err.upstreamStatus} from Google` : "",
    ].filter(Boolean);
    const base = parts.length ? parts.join(" — ") : err.error || "Snapshot failed";
    throw new Error(browserErr ? `${base} (browser: ${browserErr.slice(0, 200)})` : base);
  }
  return res.json() as Promise<{ dataUrl: string; base64: string; mime: string }>;
}
