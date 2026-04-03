import { z } from "zod";

const cuid = z.string().cuid();

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const formFieldTypeEnum = z.enum([
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "checkbox",
  "number",
  "address",
]);

export const leadCaptureFormFieldSchema = z.object({
  id: z.string().min(1).max(80),
  key: z
    .string()
    .min(1)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase snake_case keys"),
  label: z.string().min(1),
  type: formFieldTypeEnum,
  required: z.boolean(),
  placeholder: z.string().optional(),
  options: z.array(z.string()).optional(),
  isBuiltIn: z.boolean(),
  sortOrder: z.number().int(),
});

export const leadCaptureFormCreateSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens"),
  description: z.string().optional().nullable(),
  fields: z.array(leadCaptureFormFieldSchema).min(1),
  isActive: z.boolean().optional(),
  defaultStageId: cuid.optional().nullable(),
  assignToUserId: cuid.optional().nullable(),
  successMessage: z.string().optional().nullable(),
  brandColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use a hex color like #f59e0b")
    .optional()
    .nullable(),
});

export const leadCaptureFormPatchSchema = leadCaptureFormCreateSchema.partial();

export const leadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  stageId: cuid.optional(),
  notes: z.string().optional().or(z.literal("")),
  assignedToId: z.preprocess(
    (val) => (val === "" ? null : val),
    z.union([z.string().cuid(), z.null()]).optional()
  ),
  customFields: z.record(z.string(), z.any()).optional().nullable(),
  sourceFormId: cuid.optional().nullable(),
});

export const projectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  statusId: cuid.optional(),
  systemSizeKw: z.number().optional().nullable(),
  panelCount: z.number().int().optional().nullable(),
  estimatedCost: z.number().optional().nullable(),
  annualOutput: z.number().optional().nullable(),
  leadId: z.string().min(1, "Lead is required"),
  solarData: z.any().optional().nullable(),
});

export const proposalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  systemSizeKw: z.number().positive("System size must be positive"),
  panelCount: z.number().int().positive("Panel count must be positive"),
  panelWattage: z.number().int().positive("Panel wattage must be positive"),
  batteryOption: z.string().optional().nullable(),
  inverter: z.string().optional().nullable(),
  installCost: z.number().positive("Install cost must be positive"),
  annualSavings: z.number().positive("Annual savings must be positive"),
  paybackYears: z.number().positive("Payback years must be positive"),
  roiPercent: z.number(),
  leadId: z.string().min(1, "Lead is required"),
  statusId: cuid.optional(),
  projectId: z.string().optional().nullable(),
  roofAreaSqM: z.number().optional().nullable(),
  maxSunshineHours: z.number().optional().nullable(),
  solarPotentialKwh: z.number().optional().nullable(),
  carbonOffsetKg: z.number().optional().nullable(),
  imageryQuality: z.string().optional().nullable(),
  roofSegments: z.any().optional().nullable(),
  panelConfigs: z.any().optional().nullable(),
  sunshineQuantiles: z.any().optional().nullable(),
  solarPanelId: z.string().optional().nullable(),
  batteryId: z.string().optional().nullable(),
  inverterId: z.string().optional().nullable(),
  mapSnapshotBase64: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  yearlyProductionKwh: z.number().optional().nullable(),
  monthlyBillSavings: z.number().optional().nullable(),
  lifetimeSavings: z.number().optional().nullable(),
  grossCost: z.number().optional().nullable(),
  incentiveAmount: z.number().optional().nullable(),
  yearlyBreakdown: z.any().optional().nullable(),
});

export const solarPanelEquipmentSchema = z.object({
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  wattage: z.number().int().positive(),
  efficiency: z.number(),
  areaSqM: z.number().positive(),
  weightKg: z.number(),
  warrantyYears: z.number().int(),
  temperatureCoef: z.number(),
  voltageVmp: z.number(),
  currentImp: z.number(),
  costPerPanel: z.number(),
  isActive: z.boolean().optional(),
});

export const batteryEquipmentSchema = z.object({
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  capacityKwh: z.number().positive(),
  usableKwh: z.number().positive(),
  powerKw: z.number(),
  peakPowerKw: z.number(),
  voltage: z.number(),
  cycleLife: z.number().int(),
  warrantyYears: z.number().int(),
  roundTripEff: z.number(),
  weightKg: z.number(),
  cost: z.number(),
  isActive: z.boolean().optional(),
});

export const inverterEquipmentSchema = z.object({
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  type: z.string().min(1),
  ratedPowerKw: z.number().positive(),
  maxInputVoltage: z.number(),
  efficiency: z.number(),
  mpptChannels: z.number().int(),
  warrantyYears: z.number().int(),
  weightKg: z.number(),
  cost: z.number(),
  isActive: z.boolean().optional(),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  completed: z.boolean().optional(),
  dueDate: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
  projectId: z.string().optional().nullable(),
  leadId: z.union([z.string().cuid(), z.literal(""), z.null()]).optional(),
  assignedToId: z.preprocess(
    (val) => (val === "" || val === undefined ? null : val),
    z.union([cuid, z.null()]).optional()
  ),
});

export const leadStageUpsertSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE keys"),
  label: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  outcome: z.enum(["NONE", "WON", "LOST"]).optional(),
});

export const leadStagePatchSchema = leadStageUpsertSchema.partial();

export const projectStatusUpsertSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE keys"),
  label: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isActiveInstallation: z.boolean().optional(),
});

export const projectStatusPatchSchema = projectStatusUpsertSchema.partial();

export const proposalStatusUpsertSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Use UPPER_SNAKE_CASE keys"),
  label: z.string().min(1),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  blocksConversion: z.boolean().optional(),
});

export const proposalStatusPatchSchema = proposalStatusUpsertSchema.partial();

export const reorderSchema = z.object({
  orderedIds: z.array(cuid).min(1),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(1, "Name is required"),
  role: z.enum(["ADMIN", "SALES_REP"]),
});

export const userPatchSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(["ADMIN", "SALES_REP"]).optional(),
  notifyProposalAccepted: z.boolean().optional(),
});

export const proposalPublicShareBodySchema = z.object({
  regenerate: z.boolean().optional(),
  /** Set to a non-empty string to enable/change password; `null` clears the password */
  password: z.union([z.string().min(1).max(200), z.null()]).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LeadInput = z.infer<typeof leadSchema>;
export type LeadCaptureFormFieldInput = z.infer<typeof leadCaptureFormFieldSchema>;
export type LeadCaptureFormCreateInput = z.infer<typeof leadCaptureFormCreateSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type ProposalInput = z.infer<typeof proposalSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type SolarPanelEquipmentInput = z.infer<typeof solarPanelEquipmentSchema>;
export type BatteryEquipmentInput = z.infer<typeof batteryEquipmentSchema>;
export type InverterEquipmentInput = z.infer<typeof inverterEquipmentSchema>;

export const solarProviderNames = ["GOOGLE", "PVGIS", "NREL", "NASA", "OPEN_METEO"] as const;
export const freeSolarProviderNames = ["PVGIS", "NASA", "OPEN_METEO"] as const;

export const solarConfigSchema = z.object({
  activeProvider: z.enum(solarProviderNames),
  fallbackProvider: z.enum(freeSolarProviderNames).nullable().optional(),
  nrelApiKey: z.string().min(1).max(200).optional(),
});

export type SolarConfigInput = z.infer<typeof solarConfigSchema>;
