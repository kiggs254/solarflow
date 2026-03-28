import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const C = {
  ink: "#0f172a",
  slate: "#334155",
  muted: "#64748b",
  light: "#94a3b8",
  line: "#e2e8f0",
  wash: "#f1f5f9",
  card: "#f8fafc",
  white: "#ffffff",
  accent: "#ea580c",
  accentSoft: "#fff7ed",
  heroBg: "#0f172a",
};

const styles = StyleSheet.create({
  // —— Cover (full bleed hero) ——
  coverPage: { flex: 1, backgroundColor: C.white },
  coverHero: {
    backgroundColor: C.heroBg,
    paddingTop: 52,
    paddingBottom: 40,
    paddingHorizontal: 48,
  },
  coverEyebrow: {
    color: C.accent,
    fontSize: 9,
    letterSpacing: 2.4,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  coverTitle: {
    color: C.white,
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    lineHeight: 1.15,
    maxWidth: 480,
  },
  coverAccentRule: { height: 4, width: 56, backgroundColor: C.accent, marginTop: 18 },
  coverForLabel: { color: C.light, fontSize: 10, marginTop: 28 },
  coverLeadName: {
    color: C.white,
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  coverMeta: { color: C.muted, fontSize: 9, marginTop: 10 },
  coverLower: {
    flex: 1,
    paddingHorizontal: 48,
    paddingTop: 36,
    paddingBottom: 32,
    justifyContent: "space-between",
  },
  coverTagline: { fontSize: 10, color: C.slate, lineHeight: 1.5, maxWidth: 400 },
  coverFoot: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  coverBrand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.ink },
  coverBrandSub: { fontSize: 8, color: C.muted, marginTop: 2 },

  // —— Inner pages ——
  page: {
    paddingTop: 36,
    paddingHorizontal: 44,
    paddingBottom: 52,
    fontFamily: "Helvetica",
    fontSize: 9.5,
    color: C.slate,
    backgroundColor: C.white,
  },
  topRule: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 5,
    backgroundColor: C.accent,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  pageHeaderBar: { width: 4, backgroundColor: C.accent, marginRight: 14 },
  pageHeaderText: { flex: 1, justifyContent: "center" },
  pageHeaderKicker: { fontSize: 7, color: C.light, letterSpacing: 1.2, textTransform: "uppercase" },
  pageHeaderTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: C.ink,
    marginBottom: 10,
    marginTop: 4,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  sectionTitleFirst: { marginTop: 0 },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.wash,
  },
  label: { color: C.muted, fontSize: 8.5, width: "40%" },
  value: { fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink, width: "58%", textAlign: "right" },

  mapWrap: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    overflow: "hidden",
  },
  map: { width: "100%", maxHeight: 200, objectFit: "cover" },

  // Metric cards (2-col)
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, marginHorizontal: -4 },
  gridItem: {
    width: "48%",
    marginHorizontal: "1%",
    marginBottom: 8,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
  },
  gridLabel: { fontSize: 7.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.6 },
  gridValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: C.ink, marginTop: 4 },

  // Financial hero
  financialHero: {
    backgroundColor: C.heroBg,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  financialHeroCol: { width: "31%", alignItems: "center" },
  financialHeroLabel: { fontSize: 7, color: C.light, textTransform: "uppercase", letterSpacing: 0.8 },
  financialHeroValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: C.white, marginTop: 6 },

  // Tables
  tableWrap: { marginTop: 6, borderWidth: 1, borderColor: C.line, borderRadius: 6, overflow: "hidden" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: C.ink,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  th: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white, width: "33%" },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: C.wash },
  tableRowAlt: { backgroundColor: C.card },
  td: { fontSize: 8.5, color: C.slate, width: "33%" },

  pill: {
    backgroundColor: C.accentSoft,
    borderWidth: 1,
    borderColor: "#fed7aa",
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 6,
    marginBottom: 6,
  },
  pillText: { fontSize: 8, color: "#9a3412" },

  small: { fontSize: 8, color: C.muted, marginTop: 8, lineHeight: 1.45 },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  footerLeft: { fontSize: 7.5, color: C.light },
  footerRight: { fontSize: 7.5, color: C.muted },

  terms: { fontSize: 9, color: C.slate, lineHeight: 1.55, marginBottom: 10 },
  termsBullet: { flexDirection: "row", marginBottom: 8, paddingLeft: 4 },
  bullet: { width: 14, fontSize: 9, color: C.accent, fontFamily: "Helvetica-Bold" },
  termsText: { flex: 1, fontSize: 9, color: C.slate, lineHeight: 1.55 },
  signature: {
    marginTop: 28,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: C.line,
    width: "65%",
  },
  sigLine: { borderBottomWidth: 1, borderBottomColor: C.muted, marginBottom: 6, height: 28 },
  sigLabel: { fontSize: 8, color: C.muted },
});

function money(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `$${Math.round(n).toLocaleString("en-US")}`;
}

function num(n: number | null | undefined, d = 1): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: d, minimumFractionDigits: 0 });
}

function mapImageSrc(snapshot: string | null | undefined): string | null {
  if (!snapshot) return null;
  return snapshot.startsWith("data:") ? snapshot : `data:image/png;base64,${snapshot}`;
}

function PageFooter({ brandName }: { brandName: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerLeft}>{brandName}</Text>
      <Text
        style={styles.footerRight}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  );
}

function PageHeader({ proposalTitle }: { proposalTitle: string }) {
  const short = proposalTitle.length > 52 ? `${proposalTitle.slice(0, 49)}…` : proposalTitle;
  return (
    <View style={styles.pageHeader} fixed>
      <View style={styles.pageHeaderBar} />
      <View style={styles.pageHeaderText}>
        <Text style={styles.pageHeaderKicker}>Proposal document</Text>
        <Text style={styles.pageHeaderTitle}>{short}</Text>
      </View>
    </View>
  );
}

interface ProposalPDFProps {
  proposal: any;
  lead: any;
}

const BRAND_NAME = "SolarFlow";

export function ProposalPDF({ proposal, lead }: ProposalPDFProps) {
  const roofSegments = Array.isArray(proposal.roofSegments) ? proposal.roofSegments : [];
  const quantiles = Array.isArray(proposal.sunshineQuantiles) ? proposal.sunshineQuantiles : [];
  const yearlyBreakdown = Array.isArray(proposal.yearlyBreakdown) ? proposal.yearlyBreakdown : [];
  const mapSrc = mapImageSrc(proposal.mapSnapshotBase64);

  const sp = proposal.solarPanel;
  const bat = proposal.battery;
  const inv = proposal.inverterRel;

  const created = proposal.createdAt ? new Date(proposal.createdAt).toLocaleDateString("en-US", { dateStyle: "long" }) : "";
  const title = proposal.title || "Solar proposal";
  const leadName = lead?.name || "Customer";

  return (
    <Document title={title} author={BRAND_NAME} subject="Solar proposal">
      {/* Cover */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverHero}>
          <Text style={styles.coverEyebrow}>Solar proposal</Text>
          <Text style={styles.coverTitle}>{title}</Text>
          <View style={styles.coverAccentRule} />
          <Text style={styles.coverForLabel}>Prepared for</Text>
          <Text style={styles.coverLeadName}>{leadName}</Text>
          <Text style={styles.coverMeta}>{created}</Text>
        </View>
        <View style={styles.coverLower}>
          <Text style={styles.coverTagline}>
            This document summarizes site analysis, recommended equipment, projected savings, and estimated costs.
            Values are based on imagery and assumptions at the time of generation.
          </Text>
          <View style={styles.coverFoot}>
            <View>
              <Text style={styles.coverBrand}>{BRAND_NAME}</Text>
              <Text style={styles.coverBrandSub}>Solar CRM · proposal platform</Text>
            </View>
            <Text style={{ fontSize: 8, color: C.light }}>Confidential</Text>
          </View>
        </View>
        <PageFooter brandName={BRAND_NAME} />
      </Page>

      {/* Site & analysis */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <PageHeader proposalTitle={title} />

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Site location</Text>
        {proposal.address && (
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.value}>{proposal.address}</Text>
          </View>
        )}
        {(proposal.latitude != null || proposal.longitude != null) && (
          <View style={styles.row}>
            <Text style={styles.label}>Coordinates</Text>
            <Text style={styles.value}>
              {num(proposal.latitude, 5)}, {num(proposal.longitude, 5)}
            </Text>
          </View>
        )}
        {mapSrc ? (
          <View style={styles.mapWrap}>
            <Image style={styles.map} src={mapSrc} />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>Solar analysis</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Roof area</Text>
            <Text style={styles.gridValue}>{num(proposal.roofAreaSqM)} m²</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Peak sun / yr</Text>
            <Text style={styles.gridValue}>{num(proposal.maxSunshineHours)} h</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Est. production</Text>
            <Text style={styles.gridValue}>{num(proposal.yearlyProductionKwh)} kWh</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Carbon offset</Text>
            <Text style={styles.gridValue}>{num(proposal.carbonOffsetKg)} kg/MWh</Text>
          </View>
        </View>
        {proposal.imageryQuality ? (
          <Text style={styles.small}>Imagery quality: {proposal.imageryQuality}</Text>
        ) : null}

        <PageFooter brandName={BRAND_NAME} />
      </Page>

      {/* Roof segments & quantiles */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <PageHeader proposalTitle={title} />

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Roof segments</Text>
        {roofSegments.length === 0 ? (
          <Text style={styles.small}>No segment data stored for this proposal.</Text>
        ) : (
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Text style={styles.th}>Pitch (°)</Text>
              <Text style={styles.th}>Azimuth (°)</Text>
              <Text style={styles.th}>Area (m²)</Text>
            </View>
            {roofSegments.slice(0, 26).map((seg: any, i: number) => (
              <View key={i} wrap={false} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                <Text style={styles.td}>{num(seg?.pitchDegrees)}</Text>
                <Text style={styles.td}>{num(seg?.azimuthDegrees)}</Text>
                <Text style={styles.td}>{num(seg?.stats?.areaMeters2)}</Text>
              </View>
            ))}
          </View>
        )}
        {roofSegments.length > 26 ? (
          <Text style={styles.small}>Showing first 26 of {roofSegments.length} segments.</Text>
        ) : null}

        <Text style={styles.sectionTitle}>Sunshine quantiles</Text>
        {quantiles.length === 0 ? (
          <Text style={styles.small}>No quantile data stored.</Text>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}>
            {quantiles.map((q: number, i: number) => (
              <View key={i} style={styles.pill} wrap={false}>
                <Text style={styles.pillText}>
                  Q{i + 1}: {num(q, 2)}
                </Text>
              </View>
            ))}
          </View>
        )}

        <PageFooter brandName={BRAND_NAME} />
      </Page>

      {/* Equipment */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <PageHeader proposalTitle={title} />

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>System overview</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>System size</Text>
            <Text style={styles.gridValue}>{num(proposal.systemSizeKw)} kW</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Panels</Text>
            <Text style={styles.gridValue}>{String(proposal.panelCount ?? "—")}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Panel wattage</Text>
            <Text style={styles.gridValue}>{proposal.panelWattage ? `${proposal.panelWattage} W` : "—"}</Text>
          </View>
        </View>

        {sp ? (
          <>
            <Text style={styles.sectionTitle}>Solar module</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Manufacturer / model</Text>
              <Text style={styles.value}>
                {sp.manufacturer} {sp.model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Wattage</Text>
              <Text style={styles.value}>{sp.wattage}W</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Efficiency</Text>
              <Text style={styles.value}>{num((sp.efficiency ?? 0) * 100, 2)}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Warranty</Text>
              <Text style={styles.value}>{sp.warrantyYears} years</Text>
            </View>
          </>
        ) : null}

        {bat ? (
          <>
            <Text style={styles.sectionTitle}>Battery</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Manufacturer / model</Text>
              <Text style={styles.value}>
                {bat.manufacturer} {bat.model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Capacity / usable</Text>
              <Text style={styles.value}>
                {num(bat.capacityKwh)} / {num(bat.usableKwh)} kWh
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Continuous power</Text>
              <Text style={styles.value}>{num(bat.powerKw)} kW</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Cycle life</Text>
              <Text style={styles.value}>{String(bat.cycleLife)}</Text>
            </View>
          </>
        ) : null}

        {inv ? (
          <>
            <Text style={styles.sectionTitle}>Inverter</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Manufacturer / model</Text>
              <Text style={styles.value}>
                {inv.manufacturer} {inv.model}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Type</Text>
              <Text style={styles.value}>{inv.type}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Rated power</Text>
              <Text style={styles.value}>{num(inv.ratedPowerKw)} kW</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Efficiency</Text>
              <Text style={styles.value}>{num((inv.efficiency ?? 0) * 100, 2)}%</Text>
            </View>
          </>
        ) : null}

        {!sp && !bat && !inv && (proposal.batteryOption || proposal.inverter) ? (
          <View style={{ marginTop: 12 }}>
            {proposal.batteryOption ? (
              <Text style={styles.small}>Battery (summary): {proposal.batteryOption}</Text>
            ) : null}
            {proposal.inverter ? <Text style={styles.small}>Inverter (summary): {proposal.inverter}</Text> : null}
          </View>
        ) : null}

        <PageFooter brandName={BRAND_NAME} />
      </Page>

      {/* Financials */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <PageHeader proposalTitle={title} />

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Investment and savings</Text>

        <View style={styles.financialHero}>
          <View style={styles.financialHeroCol}>
            <Text style={styles.financialHeroLabel}>Net install</Text>
            <Text style={styles.financialHeroValue}>{money(proposal.installCost)}</Text>
          </View>
          <View style={styles.financialHeroCol}>
            <Text style={styles.financialHeroLabel}>Annual savings</Text>
            <Text style={styles.financialHeroValue}>{money(proposal.annualSavings)}</Text>
          </View>
          <View style={styles.financialHeroCol}>
            <Text style={styles.financialHeroLabel}>Payback</Text>
            <Text style={styles.financialHeroValue}>
              {proposal.paybackYears != null && !Number.isNaN(proposal.paybackYears)
                ? `${num(proposal.paybackYears)} yrs`
                : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Gross cost</Text>
            <Text style={styles.gridValue}>{money(proposal.grossCost)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Incentives</Text>
            <Text style={styles.gridValue}>{money(proposal.incentiveAmount)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>Monthly savings</Text>
            <Text style={styles.gridValue}>{money(proposal.monthlyBillSavings)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>25-yr savings</Text>
            <Text style={styles.gridValue}>{money(proposal.lifetimeSavings)}</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridLabel}>25-year ROI</Text>
            <Text style={styles.gridValue}>
              {proposal.roiPercent != null ? `${num(proposal.roiPercent)}%` : "—"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>25-year projection</Text>
        {yearlyBreakdown.length === 0 ? (
          <Text style={styles.small}>No yearly breakdown stored.</Text>
        ) : (
          <View style={styles.tableWrap}>
            <View style={styles.tableHeader}>
              <Text style={styles.th}>Year</Text>
              <Text style={styles.th}>Cumulative savings</Text>
              <Text style={styles.th}>Net position</Text>
            </View>
            {yearlyBreakdown.map((row: any, i: number) => (
              <View key={i} wrap={false} style={i % 2 === 1 ? [styles.tableRow, styles.tableRowAlt] : styles.tableRow}>
                <Text style={styles.td}>{String(row.year ?? i + 1)}</Text>
                <Text style={styles.td}>{money(row.cumulativeSavings)}</Text>
                <Text style={styles.td}>{money(row.netPosition)}</Text>
              </View>
            ))}
          </View>
        )}

        <PageFooter brandName={BRAND_NAME} />
      </Page>

      {/* Terms */}
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />
        <PageHeader proposalTitle={title} />

        <Text style={[styles.sectionTitle, styles.sectionTitleFirst]}>Terms and conditions</Text>

        <View style={styles.termsBullet}>
          <Text style={styles.bullet}>1.</Text>
          <Text style={styles.termsText}>
            This proposal is an estimate based on satellite imagery, assumed electricity rates, and equipment
            specifications at the time of generation. Actual production, costs, and incentives may vary.
          </Text>
        </View>
        <View style={styles.termsBullet}>
          <Text style={styles.bullet}>2.</Text>
          <Text style={styles.termsText}>
            Installation timelines, warranties, and financing are subject to contract and manufacturer
            documentation. Utility policy, net metering, and tax credits may change.
          </Text>
        </View>
        <View style={styles.termsBullet}>
          <Text style={styles.bullet}>3.</Text>
          <Text style={styles.termsText}>
            By signing below, the customer acknowledges receipt of this proposal and authorizes follow-up for site
            survey and engineering.
          </Text>
        </View>

        <View style={styles.signature}>
          <Text style={styles.sigLabel}>Customer signature</Text>
          <View style={styles.sigLine} />
          <Text style={[styles.sigLabel, { marginTop: 16 }]}>Date</Text>
          <View style={[styles.sigLine, { height: 22 }]} />
        </View>

        <PageFooter brandName={BRAND_NAME} />
      </Page>
    </Document>
  );
}
