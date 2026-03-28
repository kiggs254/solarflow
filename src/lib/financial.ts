export interface FinancialInput {
  systemSizeKw: number;
  costPerWatt: number;
  electricityRate: number;
  yearlyProductionKwh: number;
  incentivePercent: number;
  batteryCost: number;
  /** Additional equipment (e.g. catalog panel total + inverter) on top of $/W model */
  equipmentCost?: number;
}

export interface FinancialResult {
  grossCost: number;
  installCost: number;
  incentiveAmount: number;
  annualSavings: number;
  paybackYears: number;
  roi25Year: number;
  monthlyBillSavings: number;
  lifetimeSavings: number;
  yearlyBreakdown: { year: number; cumulativeSavings: number; netPosition: number }[];
}

export function calculateFinancials(input: FinancialInput): FinancialResult {
  const extra = input.equipmentCost ?? 0;
  const grossCost = input.systemSizeKw * 1000 * input.costPerWatt + input.batteryCost + extra;
  const incentive = grossCost * input.incentivePercent;
  const installCost = grossCost - incentive;
  const annualSavings = input.yearlyProductionKwh * input.electricityRate;
  const paybackYears = annualSavings > 0 ? installCost / annualSavings : 0;
  const lifetimeSavings = annualSavings * 25 - installCost;
  const roi25Year = installCost > 0 ? (lifetimeSavings / installCost) * 100 : 0;
  const monthlyBillSavings = annualSavings / 12;

  const yearlyBreakdown = Array.from({ length: 25 }, (_, i) => {
    const year = i + 1;
    const degradation = 1 - 0.005 * i;
    const cumulativeSavings = Array.from({ length: year }, (_, j) => annualSavings * (1 - 0.005 * j)).reduce((a, b) => a + b, 0);
    return {
      year,
      cumulativeSavings: Math.round(cumulativeSavings),
      netPosition: Math.round(cumulativeSavings - installCost),
    };
  });

  return {
    grossCost: Math.round(grossCost),
    installCost: Math.round(installCost),
    incentiveAmount: Math.round(incentive),
    annualSavings: Math.round(annualSavings),
    paybackYears: Math.round(paybackYears * 10) / 10,
    roi25Year: Math.round(roi25Year * 10) / 10,
    monthlyBillSavings: Math.round(monthlyBillSavings),
    lifetimeSavings: Math.round(lifetimeSavings),
    yearlyBreakdown,
  };
}

export const DEFAULT_COST_PER_WATT = 2.5;
export const DEFAULT_ELECTRICITY_RATE = 0.15;
export const DEFAULT_INCENTIVE_PERCENT = 0.3;
