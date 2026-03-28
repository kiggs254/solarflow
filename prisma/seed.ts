import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultLeadCaptureFormFields } from "../src/lib/lead-forms";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  await prisma.task.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.project.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.leadCaptureForm.deleteMany();
  await prisma.user.deleteMany();
  await prisma.solarPanel.deleteMany();
  await prisma.battery.deleteMany();
  await prisma.inverter.deleteMany();
  await prisma.leadPipelineStage.deleteMany();
  await prisma.projectStatusOption.deleteMany();
  await prisma.proposalStatusOption.deleteMany();

  const leadStageDefs = [
    { key: "NEW_LEAD", label: "New Lead", sortOrder: 0, outcome: "NONE" as const },
    { key: "QUALIFIED", label: "Qualified", sortOrder: 1, outcome: "NONE" as const },
    { key: "PROPOSAL_GENERATED", label: "Proposal Generated", sortOrder: 2, outcome: "NONE" as const },
    { key: "NEGOTIATION", label: "Negotiation", sortOrder: 3, outcome: "NONE" as const },
    { key: "WON", label: "Won", sortOrder: 4, outcome: "WON" as const },
    { key: "LOST", label: "Lost", sortOrder: 5, outcome: "LOST" as const },
  ];
  for (const d of leadStageDefs) {
    await prisma.leadPipelineStage.create({ data: d });
  }
  const leadStages = await prisma.leadPipelineStage.findMany();
  const stageByKey = Object.fromEntries(leadStages.map((s) => [s.key, s.id])) as Record<string, string>;

  const projectStatusDefs = [
    { key: "DESIGN", label: "Design", sortOrder: 0, isActiveInstallation: false },
    { key: "APPROVAL", label: "Approval", sortOrder: 1, isActiveInstallation: false },
    { key: "INSTALLATION", label: "Installation", sortOrder: 2, isActiveInstallation: true },
    { key: "COMPLETED", label: "Completed", sortOrder: 3, isActiveInstallation: false },
  ];
  for (const d of projectStatusDefs) {
    await prisma.projectStatusOption.create({ data: d });
  }
  const projectStatuses = await prisma.projectStatusOption.findMany();
  const projStatusByKey = Object.fromEntries(projectStatuses.map((s) => [s.key, s.id])) as Record<
    string,
    string
  >;

  const proposalStatusDefs = [
    { key: "DRAFT", label: "Draft", sortOrder: 0, blocksConversion: false },
    { key: "SENT", label: "Sent", sortOrder: 1, blocksConversion: false },
    { key: "NEGOTIATION", label: "Negotiation", sortOrder: 2, blocksConversion: false },
    { key: "ACCEPTED", label: "Accepted", sortOrder: 3, blocksConversion: false },
    { key: "REJECTED", label: "Rejected", sortOrder: 4, blocksConversion: true },
    { key: "EXPIRED", label: "Expired", sortOrder: 5, blocksConversion: true },
    { key: "CONVERTED", label: "Converted to project", sortOrder: 6, blocksConversion: false },
  ];
  for (const d of proposalStatusDefs) {
    await prisma.proposalStatusOption.create({ data: d });
  }
  const proposalStatuses = await prisma.proposalStatusOption.findMany();
  const propStatusByKey = Object.fromEntries(proposalStatuses.map((s) => [s.key, s.id])) as Record<
    string,
    string
  >;

  console.log("Seeded workflow definitions");

  const adminHash = await bcrypt.hash("password123", 12);
  const repHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@solarflow.com",
      name: "Alex Morgan",
      passwordHash: adminHash,
      role: "ADMIN",
    },
  });

  const rep = await prisma.user.create({
    data: {
      email: "sarah@solarflow.com",
      name: "Sarah Chen",
      passwordHash: repHash,
      role: "SALES_REP",
    },
  });

  console.log("Created users:", admin.email, rep.email);

  await prisma.leadCaptureForm.create({
    data: {
      name: "Website Lead Form",
      slug: "website",
      description: "Default public lead capture form — share /f/website or embed the script from Settings.",
      fields: defaultLeadCaptureFormFields() as object[],
      isActive: true,
      defaultStageId: stageByKey.NEW_LEAD,
      assignToUserId: null,
      successMessage: "Thanks! Our team will contact you shortly.",
      brandColor: "#f59e0b",
    },
  });
  console.log("Created default lead capture form (slug: website)");

  await prisma.solarPanel.createMany({
    data: [
      { manufacturer: "Canadian Solar", model: "CS6W-400MS", wattage: 400, efficiency: 0.205, areaSqM: 1.95, weightKg: 22.5, warrantyYears: 25, temperatureCoef: -0.0034, voltageVmp: 41.2, currentImp: 9.71, costPerPanel: 185 },
      { manufacturer: "LONGi", model: "Hi-MO 5 LR5-72HPH-545M", wattage: 545, efficiency: 0.21, areaSqM: 2.58, weightKg: 32.3, warrantyYears: 25, temperatureCoef: -0.0035, voltageVmp: 41.65, currentImp: 13.1, costPerPanel: 245 },
      { manufacturer: "REC", model: "Alpha Pure-R 430", wattage: 430, efficiency: 0.222, areaSqM: 1.94, weightKg: 21.8, warrantyYears: 25, temperatureCoef: -0.0026, voltageVmp: 34.2, currentImp: 12.58, costPerPanel: 310 },
      { manufacturer: "SunPower", model: "Maxeon 6 420", wattage: 420, efficiency: 0.227, areaSqM: 1.85, weightKg: 19.5, warrantyYears: 40, temperatureCoef: -0.0029, voltageVmp: 68.6, currentImp: 6.12, costPerPanel: 395 },
      { manufacturer: "JA Solar", model: "JAM72S30 540/MR", wattage: 540, efficiency: 0.209, areaSqM: 2.58, weightKg: 31.8, warrantyYears: 25, temperatureCoef: -0.0035, voltageVmp: 41.3, currentImp: 13.08, costPerPanel: 228 },
      { manufacturer: "Trina Solar", model: "Vertex S+ TSM-NEG9R.28 440W", wattage: 440, efficiency: 0.22, areaSqM: 1.99, weightKg: 23.5, warrantyYears: 25, temperatureCoef: -0.0034, voltageVmp: 34.2, currentImp: 12.87, costPerPanel: 265 },
      { manufacturer: "Q CELLS", model: "Q.PEAK DUO ML-G11 400", wattage: 400, efficiency: 0.205, areaSqM: 1.93, weightKg: 22.0, warrantyYears: 25, temperatureCoef: -0.0034, voltageVmp: 34.2, currentImp: 11.7, costPerPanel: 198 },
      { manufacturer: "Jinko Solar", model: "Tiger Neo N-type 580W", wattage: 580, efficiency: 0.225, areaSqM: 2.58, weightKg: 32.5, warrantyYears: 25, temperatureCoef: -0.003, voltageVmp: 43.2, currentImp: 13.43, costPerPanel: 268 },
    ],
  });

  await prisma.battery.createMany({
    data: [
      { manufacturer: "Tesla", model: "Powerwall 3", capacityKwh: 13.5, usableKwh: 13.5, powerKw: 11.5, peakPowerKw: 15, voltage: 240, cycleLife: 6000, warrantyYears: 10, roundTripEff: 0.9, weightKg: 130, cost: 9500 },
      { manufacturer: "Enphase", model: "IQ Battery 5P", capacityKwh: 5, usableKwh: 5, powerKw: 3.84, peakPowerKw: 7.68, voltage: 240, cycleLife: 4000, warrantyYears: 15, roundTripEff: 0.89, weightKg: 72, cost: 5500 },
      { manufacturer: "LG Energy Solution", model: "RESU Prime 16H", capacityKwh: 16, usableKwh: 15.4, powerKw: 7, peakPowerKw: 11, voltage: 400, cycleLife: 6000, warrantyYears: 10, roundTripEff: 0.95, weightKg: 130, cost: 11000 },
      { manufacturer: "Generac", model: "PWRcell M6", capacityKwh: 18, usableKwh: 17.1, powerKw: 7.6, peakPowerKw: 11.4, voltage: 400, cycleLife: 3000, warrantyYears: 10, roundTripEff: 0.9, weightKg: 150, cost: 12000 },
      { manufacturer: "sonnen", model: "sonnenCore+", capacityKwh: 10, usableKwh: 10, powerKw: 4.8, peakPowerKw: 8.6, voltage: 240, cycleLife: 10000, warrantyYears: 10, roundTripEff: 0.91, weightKg: 115, cost: 9800 },
      { manufacturer: "BYD", model: "Battery-Box Premium HVS", capacityKwh: 10.24, usableKwh: 9.7, powerKw: 5.12, peakPowerKw: 7.68, voltage: 230, cycleLife: 6000, warrantyYears: 10, roundTripEff: 0.94, weightKg: 100, cost: 8500 },
    ],
  });

  await prisma.inverter.createMany({
    data: [
      { manufacturer: "SolarEdge", model: "SE7600H-US", type: "string+optimizers", ratedPowerKw: 7.6, maxInputVoltage: 480, efficiency: 0.992, mpptChannels: 2, warrantyYears: 12, weightKg: 25.9, cost: 2200 },
      { manufacturer: "Enphase", model: "IQ8+ Microinverter", type: "micro", ratedPowerKw: 0.384, maxInputVoltage: 60, efficiency: 0.97, mpptChannels: 1, warrantyYears: 25, weightKg: 1.1, cost: 185 },
      { manufacturer: "SMA", model: "Sunny Boy 7.7-US", type: "string", ratedPowerKw: 7.7, maxInputVoltage: 600, efficiency: 0.985, mpptChannels: 2, warrantyYears: 10, weightKg: 17.5, cost: 1950 },
      { manufacturer: "Fronius", model: "Primo GEN24 6.0 Plus", type: "hybrid", ratedPowerKw: 6, maxInputVoltage: 600, efficiency: 0.975, mpptChannels: 2, warrantyYears: 10, weightKg: 21.5, cost: 2400 },
      { manufacturer: "Huawei", model: "SUN2000-10KTL-M1", type: "hybrid", ratedPowerKw: 10, maxInputVoltage: 1100, efficiency: 0.985, mpptChannels: 2, warrantyYears: 10, weightKg: 17, cost: 2100 },
      { manufacturer: "APsystems", model: "DS3-L", type: "micro", ratedPowerKw: 0.96, maxInputVoltage: 60, efficiency: 0.97, mpptChannels: 2, warrantyYears: 12, weightKg: 2.8, cost: 165 },
    ],
  });

  console.log("Seeded equipment catalog");

  const defaultProposalStatus = propStatusByKey["ACCEPTED"]!;

  const leads = await Promise.all([
    prisma.lead.create({
      data: {
        name: "John Smith",
        email: "john.smith@email.com",
        phone: "(555) 123-4567",
        address: "123 Oak Street, San Francisco, CA 94102",
        latitude: 37.7749,
        longitude: -122.4194,
        stageId: stageByKey.NEW_LEAD,
        notes: "Interested in rooftop solar for 2-story home.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Maria Garcia",
        email: "maria.garcia@email.com",
        phone: "(555) 234-5678",
        address: "456 Pine Avenue, San Jose, CA 95112",
        latitude: 37.3382,
        longitude: -121.8863,
        stageId: stageByKey.QUALIFIED,
        notes: "Has south-facing roof, good candidate.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Robert Johnson",
        email: "robert.j@email.com",
        phone: "(555) 345-6789",
        address: "789 Elm Drive, Oakland, CA 94607",
        latitude: 37.8044,
        longitude: -122.2712,
        stageId: stageByKey.PROPOSAL_GENERATED,
        notes: "Proposal sent, awaiting response.",
        assignedToId: admin.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Emily Davis",
        email: "emily.d@email.com",
        phone: "(555) 456-7890",
        address: "321 Maple Court, Palo Alto, CA 94301",
        latitude: 37.4419,
        longitude: -122.143,
        stageId: stageByKey.NEGOTIATION,
        notes: "Discussing battery add-on options.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Michael Wilson",
        email: "m.wilson@email.com",
        phone: "(555) 567-8901",
        address: "654 Cedar Lane, Mountain View, CA 94040",
        latitude: 37.3861,
        longitude: -122.0839,
        stageId: stageByKey.WON,
        notes: "Contract signed! Installation scheduled.",
        assignedToId: admin.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Jennifer Brown",
        email: "jen.brown@email.com",
        phone: "(555) 678-9012",
        address: "987 Birch Road, Sunnyvale, CA 94086",
        stageId: stageByKey.WON,
        notes: "Installation complete, very satisfied.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "David Lee",
        email: "david.lee@email.com",
        phone: "(555) 789-0123",
        address: "147 Walnut Street, Fremont, CA 94536",
        stageId: stageByKey.LOST,
        notes: "Went with competitor, price was deciding factor.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Lisa Anderson",
        email: "lisa.a@email.com",
        phone: "(555) 890-1234",
        address: "258 Spruce Way, Berkeley, CA 94704",
        latitude: 37.8716,
        longitude: -122.2727,
        stageId: stageByKey.NEW_LEAD,
        assignedToId: admin.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "James Taylor",
        email: "james.t@email.com",
        phone: "(555) 901-2345",
        address: "369 Ash Boulevard, Redwood City, CA 94061",
        stageId: stageByKey.QUALIFIED,
        notes: "Commercial property, large roof area.",
        assignedToId: rep.id,
      },
    }),
    prisma.lead.create({
      data: {
        name: "Patricia Martinez",
        email: "pat.m@email.com",
        phone: "(555) 012-3456",
        address: "480 Willow Place, Santa Clara, CA 95050",
        stageId: stageByKey.NEW_LEAD,
        assignedToId: admin.id,
      },
    }),
  ]);

  console.log(`Created ${leads.length} leads`);

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "Wilson Residence Solar",
        statusId: projStatusByKey.INSTALLATION,
        systemSizeKw: 8.4,
        panelCount: 21,
        estimatedCost: 18900,
        annualOutput: 12600,
        leadId: leads[4].id,
      },
    }),
    prisma.project.create({
      data: {
        name: "Brown Home Solar",
        statusId: projStatusByKey.COMPLETED,
        systemSizeKw: 6.8,
        panelCount: 17,
        estimatedCost: 15300,
        annualOutput: 10200,
        leadId: leads[5].id,
      },
    }),
    prisma.project.create({
      data: {
        name: "Johnson Rooftop Solar",
        statusId: projStatusByKey.DESIGN,
        systemSizeKw: 10.0,
        panelCount: 25,
        estimatedCost: 22500,
        annualOutput: 15000,
        leadId: leads[2].id,
      },
    }),
    prisma.project.create({
      data: {
        name: "Davis Solar + Battery",
        statusId: projStatusByKey.APPROVAL,
        systemSizeKw: 12.0,
        panelCount: 30,
        estimatedCost: 33500,
        annualOutput: 18000,
        leadId: leads[3].id,
      },
    }),
  ]);

  console.log(`Created ${projects.length} projects`);

  const proposals = await Promise.all([
    prisma.proposal.create({
      data: {
        title: "Wilson Residence - Standard Package",
        systemSizeKw: 8.4,
        panelCount: 21,
        panelWattage: 400,
        inverter: "Microinverters",
        installCost: 18900,
        annualSavings: 2520,
        paybackYears: 7.5,
        roiPercent: 233,
        statusId: defaultProposalStatus,
        leadId: leads[4].id,
        projectId: projects[0].id,
      },
    }),
    prisma.proposal.create({
      data: {
        title: "Brown Home - Eco Package",
        systemSizeKw: 6.8,
        panelCount: 17,
        panelWattage: 400,
        batteryOption: "Tesla Powerwall 3 (13.5 kWh)",
        inverter: "String Inverter",
        installCost: 15300,
        annualSavings: 2040,
        paybackYears: 7.5,
        roiPercent: 233,
        statusId: defaultProposalStatus,
        leadId: leads[5].id,
        projectId: projects[1].id,
      },
    }),
    prisma.proposal.create({
      data: {
        title: "Johnson Rooftop - Premium Package",
        systemSizeKw: 10.0,
        panelCount: 25,
        panelWattage: 400,
        batteryOption: "LG RESU Prime (16 kWh)",
        inverter: "Power Optimizers + String",
        installCost: 22500,
        annualSavings: 3000,
        paybackYears: 7.5,
        roiPercent: 233,
        statusId: defaultProposalStatus,
        leadId: leads[2].id,
        projectId: projects[2].id,
      },
    }),
  ]);

  console.log(`Created ${proposals.length} proposals`);

  await Promise.all([
    prisma.task.create({ data: { title: "Complete site survey", projectId: projects[0].id, assignedToId: rep.id, completed: true } }),
    prisma.task.create({ data: { title: "Order solar panels", projectId: projects[0].id, assignedToId: admin.id, completed: true } }),
    prisma.task.create({ data: { title: "Schedule installation crew", projectId: projects[0].id, assignedToId: rep.id, dueDate: new Date("2026-04-15") } }),
    prisma.task.create({ data: { title: "Final inspection", projectId: projects[0].id, assignedToId: admin.id, dueDate: new Date("2026-04-30") } }),
    prisma.task.create({ data: { title: "Design system layout", projectId: projects[2].id, assignedToId: rep.id } }),
    prisma.task.create({ data: { title: "Submit permit application", projectId: projects[3].id, assignedToId: admin.id, dueDate: new Date("2026-04-01") } }),
    prisma.task.create({ data: { title: "Customer follow-up call", assignedToId: rep.id, dueDate: new Date("2026-03-28") } }),
    prisma.task.create({ data: { title: "Update CRM records", assignedToId: admin.id, completed: true } }),
  ]);

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
