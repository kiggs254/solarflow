"use client";

import { useEffect } from "react";
import { useWhiteLabel } from "@/hooks/use-white-label";

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function generatePalette(hex: string) {
  const { h, s } = hexToHSL(hex);
  return {
    "50": `hsl(${h}, ${s}%, 95%)`,
    "100": `hsl(${h}, ${s}%, 90%)`,
    "200": `hsl(${h}, ${s}%, 80%)`,
    "300": `hsl(${h}, ${s}%, 65%)`,
    "400": `hsl(${h}, ${s}%, 55%)`,
    "500": `hsl(${h}, ${Math.min(s, 90)}%, 50%)`,
    "600": `hsl(${h}, ${Math.min(s + 5, 95)}%, 42%)`,
    "700": `hsl(${h}, ${Math.min(s + 10, 100)}%, 35%)`,
    "800": `hsl(${h}, ${Math.min(s + 10, 100)}%, 28%)`,
    "900": `hsl(${h}, ${Math.min(s + 10, 100)}%, 20%)`,
    "950": `hsl(${h}, ${Math.min(s + 10, 100)}%, 12%)`,
  };
}

export function ThemeColorProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useWhiteLabel();

  useEffect(() => {
    const root = document.documentElement;
    const palette = generatePalette(settings.themeColor);

    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--brand-${shade}`, value);
    });
    root.style.setProperty("--brand-color", settings.themeColor);
    root.style.setProperty("--ring", settings.themeColor);
  }, [settings.themeColor]);

  useEffect(() => {
    if (!settings.faviconUrl) return;
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = settings.faviconUrl;
  }, [settings.faviconUrl]);

  return <>{children}</>;
}
