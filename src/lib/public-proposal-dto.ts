import type { Prisma } from "@prisma/client";

const proposalForPublicSelect = {
  id: true,
  title: true,
  createdAt: true,
  systemSizeKw: true,
  panelCount: true,
  panelWattage: true,
  batteryOption: true,
  inverter: true,
  installCost: true,
  annualSavings: true,
  paybackYears: true,
  roiPercent: true,
  roofAreaSqM: true,
  maxSunshineHours: true,
  solarPotentialKwh: true,
  carbonOffsetKg: true,
  imageryQuality: true,
  roofSegments: true,
  sunshineQuantiles: true,
  mapSnapshotBase64: true,
  latitude: true,
  longitude: true,
  address: true,
  yearlyProductionKwh: true,
  monthlyBillSavings: true,
  lifetimeSavings: true,
  grossCost: true,
  incentiveAmount: true,
  yearlyBreakdown: true,
  publicSharePasswordHash: true,
  leadId: true,
  lead: { select: { name: true, email: true, phone: true, address: true } },
  proposalStatus: { select: { key: true, label: true } },
  solarPanel: {
    select: {
      manufacturer: true,
      model: true,
      wattage: true,
      efficiency: true,
      warrantyYears: true,
    },
  },
  battery: {
    select: {
      manufacturer: true,
      model: true,
      capacityKwh: true,
      usableKwh: true,
      powerKw: true,
    },
  },
  inverterRel: {
    select: {
      manufacturer: true,
      model: true,
      type: true,
      ratedPowerKw: true,
      efficiency: true,
    },
  },
} as const;

export type ProposalForPublic = Prisma.ProposalGetPayload<{ select: typeof proposalForPublicSelect }>;

export type ProposalPresentationSolarPanel = NonNullable<ProposalForPublic["solarPanel"]>;
export type ProposalPresentationBattery = NonNullable<ProposalForPublic["battery"]>;
export type ProposalPresentationInverter = NonNullable<ProposalForPublic["inverterRel"]>;

/** Shared shape for dashboard + public proposal pages */
export type ProposalPresentationData = {
  title: string;
  createdAt: string;
  proposalStatus: { key: string; label: string } | null;
  lead: {
    id?: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
  systemSizeKw: number;
  panelCount: number;
  panelWattage: number;
  batteryOption: string | null;
  inverter: string | null;
  installCost: number;
  annualSavings: number;
  paybackYears: number;
  roiPercent: number;
  roofAreaSqM: number | null;
  maxSunshineHours: number | null;
  solarPotentialKwh: number | null;
  carbonOffsetKg: number | null;
  imageryQuality: string | null;
  roofSegments: unknown;
  sunshineQuantiles: unknown;
  mapSnapshotBase64: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
  yearlyProductionKwh: number | null;
  monthlyBillSavings: number | null;
  lifetimeSavings: number | null;
  grossCost: number | null;
  incentiveAmount: number | null;
  yearlyBreakdown: unknown;
  solarPanel: ProposalPresentationSolarPanel | null;
  battery: ProposalPresentationBattery | null;
  inverterRel: ProposalPresentationInverter | null;
};

export function proposalPublicInclude() {
  return { select: proposalForPublicSelect };
}

export function toPresentationData(
  p: ProposalForPublic,
  mode: "crm" | "public"
): ProposalPresentationData {
  const lead =
    mode === "public"
      ? { name: p.lead?.name ?? "Customer" }
      : {
          id: p.leadId,
          name: p.lead?.name ?? "—",
          email: p.lead?.email ?? null,
          phone: p.lead?.phone ?? null,
          address: p.lead?.address ?? null,
        };

  const createdAtIso =
    typeof p.createdAt === "string" ? p.createdAt : p.createdAt.toISOString();

  return {
    title: p.title,
    createdAt: createdAtIso,
    proposalStatus: p.proposalStatus
      ? { key: p.proposalStatus.key, label: p.proposalStatus.label }
      : null,
    lead,
    systemSizeKw: p.systemSizeKw,
    panelCount: p.panelCount,
    panelWattage: p.panelWattage,
    batteryOption: p.batteryOption,
    inverter: p.inverter,
    installCost: p.installCost,
    annualSavings: p.annualSavings,
    paybackYears: p.paybackYears,
    roiPercent: p.roiPercent,
    roofAreaSqM: p.roofAreaSqM,
    maxSunshineHours: p.maxSunshineHours,
    solarPotentialKwh: p.solarPotentialKwh,
    carbonOffsetKg: p.carbonOffsetKg,
    imageryQuality: p.imageryQuality,
    roofSegments: p.roofSegments,
    sunshineQuantiles: p.sunshineQuantiles,
    mapSnapshotBase64: p.mapSnapshotBase64,
    latitude: p.latitude,
    longitude: p.longitude,
    address: p.address,
    yearlyProductionKwh: p.yearlyProductionKwh,
    monthlyBillSavings: p.monthlyBillSavings,
    lifetimeSavings: p.lifetimeSavings,
    grossCost: p.grossCost,
    incentiveAmount: p.incentiveAmount,
    yearlyBreakdown: p.yearlyBreakdown,
    solarPanel: p.solarPanel,
    battery: p.battery,
    inverterRel: p.inverterRel,
  };
}

/** JSON response for GET /api/public/proposals/[token] — no password hash */
export function toPublicApiPayload(data: ProposalPresentationData, needsPassword: boolean) {
  return { needsPassword, proposal: needsPassword ? null : data };
}
