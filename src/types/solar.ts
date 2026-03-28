export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface SizeAndSunshineStats {
  areaMeters2: number;
  sunshineQuantiles: number[];
  groundAreaMeters2: number;
}

export interface RoofSegmentSizeAndSunshineStats {
  pitchDegrees: number;
  azimuthDegrees: number;
  stats: SizeAndSunshineStats;
  center: LatLng;
  boundingBox: {
    sw: LatLng;
    ne: LatLng;
  };
  planeHeightAtCenterMeters: number;
}

export interface SolarPanel {
  center: LatLng;
  orientation: "LANDSCAPE" | "PORTRAIT";
  yearlyEnergyDcKwh: number;
  segmentIndex: number;
}

export interface SolarPanelConfig {
  panelsCount: number;
  yearlyEnergyDcKwh: number;
  roofSegmentSummaries: {
    pitchDegrees: number;
    azimuthDegrees: number;
    panelsCount: number;
    yearlyEnergyDcKwh: number;
    segmentIndex: number;
  }[];
}

export interface FinancialAnalysis {
  monthlyBill: { currencyCode: string; units: string };
  panelConfigIndex: number;
  financialDetails: {
    initialAcKwhPerYear: number;
    remainingLifetimeUtilityBill: { currencyCode: string; units: string };
    federalIncentive: { currencyCode: string; units: string };
    stateIncentive: { currencyCode: string; units: string };
    utilityIncentive: { currencyCode: string; units: string };
    lifetimeSrecTotal: { currencyCode: string; units: string };
    costOfElectricityWithoutSolar: { currencyCode: string; units: string };
    netMeteringAllowed: boolean;
    solarPercentage: number;
    percentageExportedToGrid: number;
  };
  leasingSavings?: unknown;
  cashPurchaseSavings?: {
    outOfPocketCost: { currencyCode: string; units: string };
    upfrontCost: { currencyCode: string; units: string };
    rebateValue: { currencyCode: string; units: string };
    paybackYears: number;
    savings: { savingsYear1: { currencyCode: string; units: string }; savingsYear20: { currencyCode: string; units: string }; savingsLifetime: { currencyCode: string; units: string } };
  };
  financedPurchaseSavings?: unknown;
}

export interface SolarPotential {
  maxArrayPanelsCount: number;
  maxArrayAreaMeters2: number;
  maxSunshineHoursPerYear: number;
  carbonOffsetFactorKgPerMwh: number;
  wholeRoofStats: SizeAndSunshineStats;
  roofSegmentStats: RoofSegmentSizeAndSunshineStats[];
  solarPanelConfigs: SolarPanelConfig[];
  solarPanels: SolarPanel[];
  panelCapacityWatts: number;
  panelHeightMeters: number;
  panelWidthMeters: number;
  panelLifetimeYears: number;
  buildingStats: SizeAndSunshineStats;
  financialAnalyses: FinancialAnalysis[];
}

export interface BuildingInsights {
  name: string;
  center: LatLng;
  boundingBox: { sw: LatLng; ne: LatLng };
  imageryDate: { year: number; month: number; day: number };
  imageryProcessedDate: { year: number; month: number; day: number };
  postalCode: string;
  administrativeArea: string;
  statisticalArea: string;
  regionCode: string;
  solarPotential: SolarPotential;
  imageryQuality: "HIGH" | "MEDIUM" | "LOW";
}
