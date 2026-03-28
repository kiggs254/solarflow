import { prisma } from "@/lib/prisma";

export type CreateNotificationInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
}

export type CreateForAllParams = {
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  /** If set, only users with notifyProposalAccepted true receive the notification */
  filter?: { notifyProposalAccepted?: boolean };
};

export async function createNotificationForAll(params: CreateForAllParams): Promise<void> {
  const where: { notifyProposalAccepted?: boolean } = {};
  if (params.filter?.notifyProposalAccepted) {
    where.notifyProposalAccepted = true;
  }

  const users = await prisma.user.findMany({
    where: Object.keys(where).length ? where : undefined,
    select: { id: true },
  });
  if (users.length === 0) return;

  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    })),
  });
}

/** Notify assignee, or all users if no assignee */
export async function notifyNewLead(params: {
  leadId: string;
  leadName: string;
  assignedToId: string | null;
}): Promise<void> {
  const link = `/leads/${params.leadId}`;
  const title = "New lead";
  const body = params.leadName;

  if (params.assignedToId) {
    await createNotification({
      userId: params.assignedToId,
      type: "NEW_LEAD",
      title,
      body,
      link,
    });
    return;
  }

  const users = await prisma.user.findMany({ select: { id: true } });
  if (users.length === 0) return;
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: "NEW_LEAD",
      title,
      body,
      link,
    })),
  });
}

/** Proposal accepted — in-app for opted-in users (email stays separate) */
export async function notifyProposalAcceptedInApp(params: {
  proposalTitle: string;
  leadName: string;
  proposalId: string;
}): Promise<void> {
  await createNotificationForAll({
    type: "PROPOSAL_ACCEPTED",
    title: "Proposal accepted",
    body: `${params.proposalTitle} — ${params.leadName}`,
    link: `/proposals/${params.proposalId}`,
    filter: { notifyProposalAccepted: true },
  });
}

/** Create TASK_REMINDER notifications for due reminders; mark tasks reminderSent */
export async function processDueTaskReminders(): Promise<number> {
  const now = new Date();
  const due = await prisma.task.findMany({
    where: {
      completed: false,
      reminderSent: false,
      reminderAt: { lte: now },
      assignedToId: { not: null },
    },
    include: { assignedTo: { select: { id: true } } },
  });
  if (due.length === 0) return 0;

  let count = 0;
  for (const t of due) {
    if (!t.assignedToId) continue;
    const link = t.leadId
      ? `/leads/${t.leadId}`
      : t.projectId
        ? `/projects/${t.projectId}`
        : "/tasks";

    await createNotification({
      userId: t.assignedToId,
      type: "TASK_REMINDER",
      title: "Task reminder",
      body: t.title,
      link,
    });
    await prisma.task.update({
      where: { id: t.id },
      data: { reminderSent: true },
    });
    count++;
  }
  return count;
}
