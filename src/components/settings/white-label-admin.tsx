"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { useWhiteLabel, type WhiteLabelData } from "@/hooks/use-white-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ImagePlus, Trash2, Upload } from "lucide-react";

const PRESET_COLORS = [
  "#f59e0b", // amber (default)
  "#ef4444", // red
  "#f97316", // orange
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];

function FileUploadZone({
  label,
  hint,
  currentUrl,
  field,
  onUploaded,
}: {
  label: string;
  hint: string;
  currentUrl: string | null;
  field: "logoUrl" | "faviconUrl";
  onUploaded: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("field", field);
        const res = await fetch("/api/settings/white-label/upload", {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Upload failed");
        }
        onUploaded();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [field, onUploaded]
  );

  const handleRemove = useCallback(async () => {
    const res = await fetch("/api/settings/white-label", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: null }),
    });
    if (res.ok) onUploaded();
  }, [field, onUploaded]);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>

      {currentUrl ? (
        <div className="flex items-center gap-4">
          <div className="flex h-16 items-center justify-center rounded-lg border border-border bg-muted/50 px-4">
            <Image
              src={currentUrl}
              alt={label}
              width={field === "logoUrl" ? 160 : 40}
              height={40}
              className={field === "logoUrl" ? "h-10 max-w-[160px] object-contain" : "h-10 w-10 object-contain"}
              unoptimized
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="mr-1 h-3.5 w-3.5" />
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleRemove()}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5 text-red-500" />
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 px-4 py-6 text-sm text-muted-foreground transition-colors hover:border-brand-500/50 hover:bg-muted/50"
        >
          <ImagePlus className="h-5 w-5" />
          {uploading ? "Uploading..." : "Click to upload"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function WhiteLabelAdmin() {
  const { settings, mutate } = useWhiteLabel();
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState("");
  const [saving, setSaving] = useState(false);

  const displayName = companyName ?? settings.companyName;
  const activeColor = settings.themeColor;

  const saveColor = useCallback(
    async (color: string) => {
      setSaving(true);
      try {
        await fetch("/api/settings/white-label", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ themeColor: color }),
        });
        await mutate();
      } finally {
        setSaving(false);
      }
    },
    [mutate]
  );

  const saveName = useCallback(async () => {
    if (!companyName || companyName === settings.companyName) return;
    setSaving(true);
    try {
      await fetch("/api/settings/white-label", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName }),
      });
      await mutate();
      setCompanyName(null);
    } finally {
      setSaving(false);
    }
  }, [companyName, settings.companyName, mutate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>White Label</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          Customize branding, logos, and theme color for the entire application.
        </p>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Company name */}
        <div className="space-y-2">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                id="companyName"
                label="Company name"
                value={displayName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Your company name"
              />
            </div>
            {companyName && companyName !== settings.companyName && (
              <Button
                type="button"
                size="sm"
                onClick={() => void saveName()}
                disabled={saving || !companyName.trim()}
              >
                Save
              </Button>
            )}
          </div>
        </div>

        {/* Logo upload */}
        <FileUploadZone
          label="Logo (rectangular)"
          hint="Displayed in the sidebar when expanded. Recommended: PNG or SVG, max 2 MB."
          currentUrl={settings.logoUrl}
          field="logoUrl"
          onUploaded={() => void mutate()}
        />

        {/* Favicon upload */}
        <FileUploadZone
          label="Favicon (square)"
          hint="Displayed in the sidebar when collapsed and as the browser tab icon. Recommended: square PNG or ICO, max 2 MB."
          currentUrl={settings.faviconUrl}
          field="faviconUrl"
          onUploaded={() => void mutate()}
        />

        {/* Theme color */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Theme color</p>
          <p className="text-xs text-muted-foreground">
            Choose a brand color. This changes buttons, links, accents, and focus rings across the app.
          </p>

          <div className="flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => void saveColor(color)}
                disabled={saving}
                className="group relative h-9 w-9 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: color,
                  borderColor: activeColor === color ? "white" : "transparent",
                  boxShadow: activeColor === color ? `0 0 0 2px ${color}` : "none",
                }}
                title={color}
              >
                {activeColor === color && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                id="customColor"
                label="Custom hex color"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                placeholder="#1a73e8"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor || activeColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-lg border border-input bg-transparent p-0.5"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (/^#[0-9A-Fa-f]{6}$/.test(customColor)) {
                    void saveColor(customColor);
                    setCustomColor("");
                  }
                }}
                disabled={saving || !/^#[0-9A-Fa-f]{6}$/.test(customColor)}
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
            <div className="h-8 w-8 rounded-lg" style={{ backgroundColor: activeColor }} />
            <div className="text-sm">
              <p className="font-medium text-foreground">Current: {activeColor}</p>
              <p className="text-xs text-muted-foreground">Applied across the entire application</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
