export interface SystemDesignInput {
  roofAreaSqM: number;
  panelWattage: number;
  panelAreaSqM: number;
  sunHoursPerDay: number;
  efficiency: number;
}

export interface SystemDesignResult {
  panelCount: number;
  systemSizeKw: number;
  yearlyProductionKwh: number;
}

export function calculateSystemDesign(input: SystemDesignInput): SystemDesignResult {
  const panelCount = Math.floor(input.roofAreaSqM / input.panelAreaSqM);
  const systemSizeKw = (panelCount * input.panelWattage) / 1000;
  const yearlyProductionKwh =
    systemSizeKw * input.sunHoursPerDay * 365 * input.efficiency;
  return { panelCount, systemSizeKw, yearlyProductionKwh };
}

export const DEFAULT_PANEL_WATTAGE = 400;
export const DEFAULT_PANEL_AREA_SQM = 1.7;
export const DEFAULT_EFFICIENCY = 0.8;

export const PANEL_OPTIONS = [
  { label: "320W Standard", wattage: 320, areaSqM: 1.6 },
  { label: "370W High Efficiency", wattage: 370, areaSqM: 1.7 },
  { label: "400W Premium", wattage: 400, areaSqM: 1.7 },
  { label: "450W Commercial", wattage: 450, areaSqM: 2.0 },
];

export const BATTERY_OPTIONS = [
  { label: "None", value: "none", capacityKwh: 0, cost: 0 },
  { label: "Tesla Powerwall 3 (13.5 kWh)", value: "powerwall3", capacityKwh: 13.5, cost: 9500 },
  { label: "Enphase IQ 5P (5 kWh)", value: "enphase5p", capacityKwh: 5, cost: 5500 },
  { label: "LG RESU Prime (16 kWh)", value: "lg-resu", capacityKwh: 16, cost: 11000 },
];

export const INVERTER_OPTIONS = [
  { label: "String Inverter", value: "string", efficiencyBonus: 0 },
  { label: "Microinverters", value: "micro", efficiencyBonus: 0.05 },
  { label: "Power Optimizers + String", value: "optimizers", efficiencyBonus: 0.03 },
];
