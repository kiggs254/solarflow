"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const assignFetcher = (url: string) => fetch(url).then((r) => r.json());

function toDatetimeLocalValue(iso: string | Date | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface TaskFormProps {
  initialData?: any;
  /** When set, task is scoped to this lead (hidden field) */
  defaultLeadId?: string | null;
  /** When set, task is scoped to this project (hidden field) */
  defaultProjectId?: string | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function TaskForm({
  initialData,
  defaultLeadId,
  defaultProjectId,
  onSubmit,
  onCancel,
  loading,
}: TaskFormProps) {
  const { data: session } = useSession();
  const { data: assignData, isLoading: assignLoading } = useSWR<{ data: { id: string; name: string }[] }>(
    "/api/users/for-assignment",
    assignFetcher
  );
  const assignableUsers = useMemo(() => assignData?.data ?? [], [assignData?.data]);

  const [form, setForm] = useState({
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    dueDate: initialData?.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
    reminderAt: toDatetimeLocalValue(initialData?.reminderAt),
    assignedToId: initialData?.assignedToId ?? "",
  });

  useEffect(() => {
    if (initialData?.assignedToId) return;
    const uid = session?.user?.id;
    if (!uid) return;
    setForm((prev) => {
      if (!prev.assignedToId) return { ...prev, assignedToId: uid };
      const ids = new Set(assignableUsers.map((u) => u.id));
      if (assignableUsers.length > 0 && !ids.has(prev.assignedToId)) {
        return { ...prev, assignedToId: uid };
      }
      return prev;
    });
  }, [session?.user?.id, initialData?.assignedToId, assignableUsers]);

  const assigneeOptions = [
    { label: "Unassigned", value: "" },
    ...assignableUsers.map((u) => ({ label: u.name, value: u.id })),
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      title: form.title,
      description: form.description,
      dueDate: form.dueDate || null,
      reminderAt: form.reminderAt ? new Date(form.reminderAt).toISOString() : null,
      assignedToId: form.assignedToId || null,
      leadId: defaultLeadId ?? initialData?.leadId ?? null,
      projectId: defaultProjectId ?? initialData?.projectId ?? null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        id="title"
        label="Task title"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        required
        placeholder="e.g. Schedule site inspection"
      />
      <Textarea
        id="description"
        label="Description"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
        placeholder="Task details..."
      />
      <Input
        id="dueDate"
        label="Due date"
        type="date"
        value={form.dueDate}
        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
      />
      <Input
        id="reminderAt"
        label="Reminder (date & time)"
        type="datetime-local"
        value={form.reminderAt}
        onChange={(e) => setForm({ ...form, reminderAt: e.target.value })}
      />
      <Select
        id="assignedToId"
        label="Assigned to"
        options={assigneeOptions}
        value={form.assignedToId}
        onChange={(e) => setForm({ ...form, assignedToId: e.target.value })}
        disabled={assignLoading}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : initialData ? "Update task" : "Create task"}
        </Button>
      </div>
    </form>
  );
}
