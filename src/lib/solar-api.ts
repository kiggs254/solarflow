import type { BuildingInsights } from "@/types/solar";

const SOLAR_API_BASE = "https://solar.googleapis.com/v1";

export async function fetchBuildingInsights(
  lat: number,
  lng: number
): Promise<BuildingInsights> {
  const apiKey = process.env.GOOGLE_SOLAR_API_KEY;

  if (!apiKey) {
    console.warn("No GOOGLE_SOLAR_API_KEY set, using mock data");
    return getMockBuildingInsights(lat, lng);
  }

  try {
    const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.warn(`Solar API returned ${response.status}, falling back to mock`);
      return getMockBuildingInsights(lat, lng);
    }

    return response.json();
  } catch (error) {
    console.warn("Solar API error, falling back to mock:", error);
    return getMockBuildingInsights(lat, lng);
  }
}

export function getMockBuildingInsights(lat: number, lng: number): BuildingInsights {
  return {
    name: "buildings/mock_building",
    center: { latitude: lat, longitude: lng },
    boundingBox: {
      sw: { latitude: lat - 0.0002, longitude: lng - 0.0003 },
      ne: { latitude: lat + 0.0002, longitude: lng + 0.0003 },
    },
    imageryDate: { year: 2024, month: 8, day: 15 },
    imageryProcessedDate: { year: 2024, month: 9, day: 1 },
    postalCode: "94043",
    administrativeArea: "CA",
    statisticalArea: "06085511100",
    regionCode: "US",
    imageryQuality: "HIGH",
    solarPotential: {
      maxArrayPanelsCount: 42,
      maxArrayAreaMeters2: 71.4,
      maxSunshineHoursPerYear: 1826,
      carbonOffsetFactorKgPerMwh: 417,
      wholeRoofStats: {
        areaMeters2: 120,
        sunshineQuantiles: [800, 1000, 1200, 1400, 1600, 1700, 1750, 1800, 1826],
        groundAreaMeters2: 110,
      },
      buildingStats: {
        areaMeters2: 130,
        sunshineQuantiles: [700, 900, 1100, 1300, 1500, 1650, 1720, 1780, 1826],
        groundAreaMeters2: 120,
      },
      roofSegmentStats: [
        {
          pitchDegrees: 18,
          azimuthDegrees: 180,
          stats: { areaMeters2: 65, sunshineQuantiles: [1400, 1600, 1700, 1750, 1800], groundAreaMeters2: 60 },
          center: { latitude: lat + 0.00005, longitude: lng },
          boundingBox: {
            sw: { latitude: lat - 0.0001, longitude: lng - 0.0002 },
            ne: { latitude: lat + 0.0001, longitude: lng + 0.0002 },
          },
          planeHeightAtCenterMeters: 5.2,
        },
        {
          pitchDegrees: 18,
          azimuthDegrees: 0,
          stats: { areaMeters2: 55, sunshineQuantiles: [1000, 1200, 1400, 1500, 1600], groundAreaMeters2: 50 },
          center: { latitude: lat - 0.00005, longitude: lng },
          boundingBox: {
            sw: { latitude: lat - 0.0002, longitude: lng - 0.0002 },
            ne: { latitude: lat, longitude: lng + 0.0002 },
          },
          planeHeightAtCenterMeters: 5.2,
        },
      ],
      solarPanelConfigs: [
        {
          panelsCount: 20,
          yearlyEnergyDcKwh: 9600,
          roofSegmentSummaries: [
            { pitchDegrees: 18, azimuthDegrees: 180, panelsCount: 20, yearlyEnergyDcKwh: 9600, segmentIndex: 0 },
          ],
        },
        {
          panelsCount: 30,
          yearlyEnergyDcKwh: 13200,
          roofSegmentSummaries: [
            { pitchDegrees: 18, azimuthDegrees: 180, panelsCount: 20, yearlyEnergyDcKwh: 9600, segmentIndex: 0 },
            { pitchDegrees: 18, azimuthDegrees: 0, panelsCount: 10, yearlyEnergyDcKwh: 3600, segmentIndex: 1 },
          ],
        },
        {
          panelsCount: 42,
          yearlyEnergyDcKwh: 16800,
          roofSegmentSummaries: [
            { pitchDegrees: 18, azimuthDegrees: 180, panelsCount: 25, yearlyEnergyDcKwh: 12000, segmentIndex: 0 },
            { pitchDegrees: 18, azimuthDegrees: 0, panelsCount: 17, yearlyEnergyDcKwh: 4800, segmentIndex: 1 },
          ],
        },
      ],
      solarPanels: Array.from({ length: 42 }, (_, i) => ({
        center: {
          latitude: lat + (Math.random() - 0.5) * 0.0003,
          longitude: lng + (Math.random() - 0.5) * 0.0004,
        },
        orientation: (i % 2 === 0 ? "LANDSCAPE" : "PORTRAIT") as "LANDSCAPE" | "PORTRAIT",
        yearlyEnergyDcKwh: 380 + Math.random() * 40,
        segmentIndex: i < 25 ? 0 : 1,
      })),
      panelCapacityWatts: 400,
      panelHeightMeters: 1.65,
      panelWidthMeters: 1.0,
      panelLifetimeYears: 25,
      financialAnalyses: [
        {
          monthlyBill: { currencyCode: "USD", units: "150" },
          panelConfigIndex: 2,
          financialDetails: {
            initialAcKwhPerYear: 14280,
            remainingLifetimeUtilityBill: { currencyCode: "USD", units: "8500" },
            federalIncentive: { currencyCode: "USD", units: "8400" },
            stateIncentive: { currencyCode: "USD", units: "1000" },
            utilityIncentive: { currencyCode: "USD", units: "0" },
            lifetimeSrecTotal: { currencyCode: "USD", units: "0" },
            costOfElectricityWithoutSolar: { currencyCode: "USD", units: "45000" },
            netMeteringAllowed: true,
            solarPercentage: 95,
            percentageExportedToGrid: 20,
          },
          cashPurchaseSavings: {
            outOfPocketCost: { currencyCode: "USD", units: "28000" },
            upfrontCost: { currencyCode: "USD", units: "28000" },
            rebateValue: { currencyCode: "USD", units: "9400" },
            paybackYears: 8.5,
            savings: {
              savingsYear1: { currencyCode: "USD", units: "2100" },
              savingsYear20: { currencyCode: "USD", units: "42000" },
              savingsLifetime: { currencyCode: "USD", units: "52500" },
            },
          },
        },
      ],
    },
  };
}
