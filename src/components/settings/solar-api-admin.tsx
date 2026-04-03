"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useSolarConfig, saveSolarConfig } from "@/hooks/use-solar-config";
import type { SolarProviderName } from "@/types/solar-providers";
import { CheckCircle2, AlertCircle, Zap } from "lucide-react";

type FreeSolarProviderName = "PVGIS" | "NASA" | "OPEN_METEO";

const PROVIDERS: {
  id: SolarProviderName;
  label: string;
  requiresKey: boolean;
  coverage: string;
  quality: string;
}[] = [
  {
    id: "GOOGLE",
    label: "Google Solar API",
    requiresKey: true,
    coverage: "Major cities worldwide (aerial imagery required)",
    quality: "Highest — rooftop-level analysis, panel layout, roof segments",
  },
  {
    id: "PVGIS",
    label: "PVGIS (EU Joint Research Centre)",
    requiresKey: false,
    coverage: "Global (best in Europe, Africa, Asia, Americas)",
    quality: "High — monthly energy output, optimal tilt, PV performance",
  },
  {
    id: "NREL",
    label: "NREL PVWatts v8",
    requiresKey: true,
    coverage: "Global via NSRDB database",
    quality: "High — AC energy production modeling, monthly breakdown",
  },
  {
    id: "NASA",
    label: "NASA POWER",
    requiresKey: false,
    coverage: "Global (0.5° resolution)",
    quality: "Medium — irradiance from satellite data, monthly averages",
  },
  {
    id: "OPEN_METEO",
    label: "Open-Meteo Solar",
    requiresKey: false,
    coverage: "Global (satellite forecast data)",
    quality: "Low — 92-day forecast extrapolated to annual estimate",
  },
];

const FREE_PROVIDERS: { id: FreeSolarProviderName; label: string }[] = [
  { id: "PVGIS", label: "PVGIS (EU JRC)" },
  { id: "NASA", label: "NASA POWER" },
  { id: "OPEN_METEO", label: "Open-Meteo Solar" },
];

const activeProviderOptions = PROVIDERS.map((p) => ({
  label: `${p.label}${p.requiresKey ? " (API key)" : " (free)"}`,
  value: p.id,
}));

const fallbackProviderOptions = [
  { label: "None (fail if active provider has no data)", value: "" },
  ...FREE_PROVIDERS.map((p) => ({ label: p.label, value: p.id })),
];

export function SolarApiAdmin() {
  const { config, isLoading, mutate } = useSolarConfig();

  const [activeProvider, setActiveProvider] = useState<SolarProviderName | "">("");
  const [fallbackProvider, setFallbackProvider] = useState<FreeSolarProviderName | "">("");
  const [nrelApiKey, setNrelApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState(false);

  // Initialise local state from loaded config (only once)
  const [initialised, setInitialised] = useState(false);
  if (config && !initialised) {
    setActiveProvider(config.activeProvider);
    setFallbackProvider((config.fallbackProvider as FreeSolarProviderName | null) ?? "");
    setInitialised(true);
  }

  const effectiveActive = (activeProvider || config?.activeProvider || "GOOGLE") as SolarProviderName;
  const selectedProviderMeta = PROVIDERS.find((p) => p.id === effectiveActive);

  const needsNrelKey = effectiveActive === "NREL";

  const isFreePrimary = ["PVGIS", "NASA", "OPEN_METEO"].includes(effectiveActive);

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      await saveSolarConfig({
        activeProvider: effectiveActive,
        fallbackProvider: (fallbackProvider as FreeSolarProviderName) || null,
        ...(nrelApiKey ? { nrelApiKey } : {}),
      });
      setNrelApiKey("");
      setSaved(true);
      await mutate();
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Loading solar API configuration…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-brand-500" />
          Solar Data Providers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Choose which API powers the Solar Analysis page. The app automatically falls back to free
          providers when the active provider has no data for a location.
        </p>

        {/* Active provider */}
        <Select
          id="activeProvider"
          label="Active provider"
          options={activeProviderOptions}
          value={effectiveActive}
          onChange={(e) => {
            setActiveProvider(e.target.value as SolarProviderName);
            setSaved(false);
          }}
        />

        {selectedProviderMeta && (
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs space-y-1">
            <p className="font-medium text-foreground">{selectedProviderMeta.label}</p>
            <p className="text-muted-foreground">
              <span className="font-medium">Coverage:</span> {selectedProviderMeta.coverage}
            </p>
            <p className="text-muted-foreground">
              <span className="font-medium">Data quality:</span> {selectedProviderMeta.quality}
            </p>
          </div>
        )}

        {/* Google key note */}
        {effectiveActive === "GOOGLE" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
            Google Solar API key is configured via the <code className="font-mono">GOOGLE_SOLAR_API_KEY</code>{" "}
            environment variable on the server. It cannot be changed here.
          </div>
        )}

        {/* NREL API key input */}
        {needsNrelKey && (
          <div className="space-y-2">
            <Input
              id="nrelApiKey"
              label="NREL API Key"
              type="password"
              placeholder={config?.nrelConfigured ? "Key saved — enter a new one to replace" : "Enter your NREL PVWatts API key"}
              value={nrelApiKey}
              onChange={(e) => setNrelApiKey(e.target.value)}
            />
            <div className="flex items-center gap-1.5 text-xs">
              {config?.nrelConfigured ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Key configured</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-amber-700">No key saved yet</span>
                </>
              )}
              <span className="text-muted-foreground ml-1">
                — Register free at{" "}
                <a
                  href="https://developer.nrel.gov/signup/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-600 underline hover:text-brand-700"
                >
                  developer.nrel.gov/signup
                </a>
              </span>
            </div>
          </div>
        )}

        {/* Fallback provider — only shown when primary is not already free */}
        {!isFreePrimary && (
          <Select
            id="fallbackProvider"
            label="Fallback provider (when active has no data)"
            options={fallbackProviderOptions}
            value={fallbackProvider}
            onChange={(e) => {
              setFallbackProvider(e.target.value as FreeSolarProviderName | "");
              setSaved(false);
            }}
          />
        )}

        {isFreePrimary && (
          <p className="text-xs text-muted-foreground">
            Free providers automatically chain: PVGIS → NASA → Open-Meteo when a location has no data.
          </p>
        )}

        {saveError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            {saveError}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Settings saved
          </div>
        )}

        <div className="pt-1">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save solar settings"}
          </Button>
        </div>

        {/* Provider capability reference */}
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-semibold text-foreground mb-2">Provider comparison</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">Key?</th>
                  <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">Roof detail</th>
                  <th className="text-left py-1.5 font-medium text-muted-foreground">Monthly chart</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROVIDERS.map((p) => (
                  <tr key={p.id} className={effectiveActive === p.id ? "bg-brand-50/40 dark:bg-brand-950/20" : ""}>
                    <td className="py-1.5 pr-3 font-medium text-foreground">{p.label.split(" (")[0]}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{p.requiresKey ? "Yes" : "No"}</td>
                    <td className="py-1.5 pr-3 text-muted-foreground">{p.id === "GOOGLE" ? "✓" : "—"}</td>
                    <td className="py-1.5 text-muted-foreground">{p.id !== "GOOGLE" ? "✓" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
