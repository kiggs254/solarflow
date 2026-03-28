"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useForms, createForm, updateForm, deleteForm, type LeadCaptureFormRow } from "@/hooks/use-forms";
import type { PublicUser } from "@/hooks/use-users";
import { defaultLeadCaptureFormFields, type FormFieldDef } from "@/lib/lead-forms";
import { labelToFieldKey, slugifyHyphen, formatDate } from "@/lib/utils";
import { Copy, ExternalLink, GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { LeadPipelineStage } from "@prisma/client";

const DND_FIELD = "application/solarflow-formfield";

const FIELD_TYPES: { value: FormFieldDef["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "textarea", label: "Text area" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown" },
  { value: "checkbox", label: "Checkbox" },
  { value: "address", label: "Address" },
];

function reindexSortOrder(fields: FormFieldDef[]): FormFieldDef[] {
  return fields.map((f, i) => ({ ...f, sortOrder: i }));
}

export function LeadFormsAdmin({
  stages,
  users,
}: {
  stages: LeadPipelineStage[];
  users: PublicUser[];
}) {
  const { forms, mutate, isLoading } = useForms(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LeadCaptureFormRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [brandColor, setBrandColor] = useState("#f59e0b");
  const [isActive, setIsActive] = useState(true);
  const [defaultStageId, setDefaultStageId] = useState("");
  const [assignToUserId, setAssignToUserId] = useState("");
  const [fields, setFields] = useState<FormFieldDef[]>(() => defaultLeadCaptureFormFields());

  const [addFieldOpen, setAddFieldOpen] = useState(false);
  const [newFieldType, setNewFieldType] = useState<FormFieldDef["type"]>("text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldPlaceholder, setNewFieldPlaceholder] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const stageOptions = useMemo(
    () =>
      [...stages]
        .filter((s) => s.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label))
        .map((s) => ({ label: s.label, value: s.id })),
    [stages]
  );

  const userOptions = useMemo(
    () => users.map((u) => ({ label: `${u.name} (${u.email})`, value: u.id })),
    [users]
  );

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setSuccessMessage("Thanks! We'll be in touch soon.");
    setBrandColor("#f59e0b");
    setIsActive(true);
    setDefaultStageId(stageOptions[0]?.value ?? "");
    setAssignToUserId("");
    setFields(reindexSortOrder(defaultLeadCaptureFormFields()));
    setDialogOpen(true);
  };

  const openEdit = (row: LeadCaptureFormRow) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug);
    setSlugTouched(true);
    setDescription(row.description ?? "");
    setSuccessMessage(row.successMessage ?? "");
    setBrandColor(row.brandColor ?? "#f59e0b");
    setIsActive(row.isActive);
    setDefaultStageId(row.defaultStageId ?? "");
    setAssignToUserId(row.assignToUserId ?? "");
    const raw = Array.isArray(row.fields) ? (row.fields as FormFieldDef[]) : [];
    setFields(reindexSortOrder(raw.length ? raw : defaultLeadCaptureFormFields()));
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!dialogOpen || slugTouched || editing) return;
    const next = slugifyHyphen(name);
    if (next) setSlug(next);
  }, [name, dialogOpen, slugTouched, editing]);

  const persist = async () => {
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description.trim() || null,
        successMessage: successMessage.trim() || null,
        brandColor: brandColor.match(/^#[0-9A-Fa-f]{6}$/) ? brandColor : "#f59e0b",
        isActive,
        defaultStageId: defaultStageId || null,
        assignToUserId: assignToUserId || null,
        fields: reindexSortOrder(fields),
      };
      if (editing) await updateForm(editing.id, payload);
      else await createForm(payload);
      setDialogOpen(false);
      await mutate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      alert("Copy failed");
    }
  };

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const onDragStartField = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData(DND_FIELD, String(index));
    e.dataTransfer.effectAllowed = "move";
    setDragIndex(index);
  }, []);

  const onDragOverField = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDropField = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData(DND_FIELD);
    const from = parseInt(raw, 10);
    setDragIndex(null);
    if (Number.isNaN(from) || from === targetIndex) return;
    setFields((prev) => {
      const next = [...prev];
      const [removed] = next.splice(from, 1);
      next.splice(targetIndex, 0, removed!);
      return reindexSortOrder(next);
    });
  }, []);

  const addCustomField = () => {
    const label = newFieldLabel.trim();
    if (!label) return;
    const key = labelToFieldKey(label);
    const id = `fld_${key}_${Date.now()}`;
    const opts =
      newFieldType === "select"
        ? newFieldOptions
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    if (newFieldType === "select" && (!opts || opts.length === 0)) {
      alert("Add at least one option (comma or newline separated)");
      return;
    }
    setFields((prev) =>
      reindexSortOrder([
        ...prev,
        {
          id,
          key,
          label,
          type: newFieldType,
          required: newFieldRequired,
          placeholder: newFieldPlaceholder.trim() || undefined,
          options: opts,
          isBuiltIn: false,
          sortOrder: prev.length,
        },
      ])
    );
    setAddFieldOpen(false);
    setNewFieldLabel("");
    setNewFieldPlaceholder("");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setNewFieldType("text");
  };

  const removeField = (f: FormFieldDef) => {
    if (f.key === "name" && f.isBuiltIn) {
      alert("The name field cannot be removed.");
      return;
    }
    setFields((prev) => reindexSortOrder(prev.filter((x) => x.id !== f.id)));
  };

  const patchField = (id: string, patch: Partial<FormFieldDef>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading forms…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Public pages at <code className="rounded bg-muted px-1">/f/your-slug</code> and embed script for
          external sites.
        </p>
        <Button type="button" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" /> New form
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-40" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.map((f) => (
            <TableRow key={f.id}>
              <TableCell className="font-medium">{f.name}</TableCell>
              <TableCell className="font-mono text-xs">{f.slug}</TableCell>
              <TableCell>{Array.isArray(f.fields) ? f.fields.length : 0}</TableCell>
              <TableCell>{f.isActive ? "Yes" : "No"}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{formatDate(f.updatedAt)}</TableCell>
              <TableCell className="flex flex-wrap gap-1">
                <Button type="button" variant="ghost" size="icon" title="Edit" onClick={() => openEdit(f)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Public link"
                  onClick={() => void copyText(`${origin}/f/${f.slug}`)}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  title="Copy embed code"
                  onClick={() =>
                    void copyText(
                      `<script src="${origin}/api/forms/${f.id}/embed.js" async></script>`
                    )
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={async () => {
                    if (!confirm(`Delete form “${f.name}”?`)) return;
                    try {
                      await deleteForm(f.id);
                      await mutate();
                    } catch (e) {
                      alert(e instanceof Error ? e.message : "Delete failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {forms.length === 0 && (
        <p className="text-sm text-muted-foreground">No capture forms yet. Create one to get a public URL.</p>
      )}

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={editing ? "Edit lead form" : "New lead form"}
      >
        <div className="max-h-[75vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Form name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input
              label="URL slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder="website-leads"
            />
          </div>
          <Textarea
            label="Description (shown above fields)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Brand color"
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
            />
            <Select
              id="defaultStage"
              label="Default pipeline stage for new leads"
              options={[{ label: "— Use CRM default —", value: "" }, ...stageOptions]}
              value={defaultStageId}
              onChange={(e) => setDefaultStageId(e.target.value)}
            />
          </div>
          <Select
            id="assignTo"
            label="Assign leads to user (optional)"
            options={[{ label: "— Unassigned —", value: "" }, ...userOptions]}
            value={assignToUserId}
            onChange={(e) => setAssignToUserId(e.target.value)}
          />
          <Textarea
            label="Success message"
            value={successMessage}
            onChange={(e) => setSuccessMessage(e.target.value)}
            rows={2}
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Form is active (public page + embed work)
          </label>

          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Form fields</CardTitle>
                <Button type="button" size="sm" variant="outline" onClick={() => setAddFieldOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Add field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Drag the handle to reorder. Built-in fields map to lead name, email, phone, address, and notes.
              </p>
              {fields.map((f, index) => (
                <div
                  key={f.id}
                  className={`flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2 ${
                    dragIndex === index ? "opacity-60" : ""
                  }`}
                  onDragOver={onDragOverField}
                  onDrop={(e) => onDropField(e, index)}
                >
                  <button
                    type="button"
                    className="cursor-grab text-muted-foreground hover:text-foreground"
                    draggable
                    onDragStart={(e) => onDragStartField(e, index)}
                    onDragEnd={() => setDragIndex(null)}
                    aria-label="Reorder"
                  >
                    <GripVertical className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{f.label}</span>
                      <span className="rounded bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                        {f.key}
                      </span>
                      <span className="text-xs text-muted-foreground">{f.type}</span>
                      {f.isBuiltIn && (
                        <span className="text-xs font-medium text-brand-700 dark:text-brand-300">built-in</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Input
                        className="h-8 text-xs"
                        label=""
                        placeholder="Label"
                        value={f.label}
                        disabled={f.isBuiltIn && f.key === "name"}
                        onChange={(e) => patchField(f.id, { label: e.target.value })}
                      />
                      <Input
                        className="h-8 text-xs"
                        label=""
                        placeholder="Placeholder"
                        value={f.placeholder ?? ""}
                        onChange={(e) => patchField(f.id, { placeholder: e.target.value || undefined })}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={f.required}
                          disabled={f.key === "name" && f.isBuiltIn}
                          onChange={(e) => patchField(f.id, { required: e.target.checked })}
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    disabled={f.key === "name" && f.isBuiltIn}
                    onClick={() => removeField(f)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {!editing && (
            <p className="text-xs text-muted-foreground">
              After you save a new form, edit it again to copy the public URL and embed script (they need the
              form ID).
            </p>
          )}

          {editing && origin && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-base">Share & embed</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Public page</p>
                  <code className="block break-all rounded bg-muted p-2 text-xs">
                    {origin}/f/{slug || editing.slug}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => void copyText(`${origin}/f/${slug || editing.slug}`)}
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy link
                  </Button>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Embed on another website</p>
                  <code className="block break-all rounded bg-muted p-2 text-xs">
                    {`<script src="${origin}/api/forms/${editing.id}/embed.js" async></script>`}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      void copyText(
                        `<script src="${origin}/api/forms/${editing.id}/embed.js" async></script>`
                      )
                    }
                  >
                    <Copy className="mr-1 h-3 w-3" /> Copy script tag
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void persist()}
              disabled={saving || !name.trim() || !slug.trim() || fields.length === 0}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={addFieldOpen} onClose={() => setAddFieldOpen(false)} title="Add custom field">
        <div className="space-y-3">
          <Select
            id="nft"
            label="Field type"
            options={FIELD_TYPES.map((t) => ({ label: t.label, value: t.value }))}
            value={newFieldType}
            onChange={(e) => setNewFieldType(e.target.value as FormFieldDef["type"])}
          />
          <Input
            label="Label"
            value={newFieldLabel}
            onChange={(e) => setNewFieldLabel(e.target.value)}
            placeholder="e.g. Monthly electric bill"
          />
          <Input
            label="Placeholder (optional)"
            value={newFieldPlaceholder}
            onChange={(e) => setNewFieldPlaceholder(e.target.value)}
          />
          {newFieldType === "select" && (
            <Textarea
              label="Options (comma or one per line)"
              value={newFieldOptions}
              onChange={(e) => setNewFieldOptions(e.target.value)}
              rows={3}
            />
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={newFieldRequired}
              onChange={(e) => setNewFieldRequired(e.target.checked)}
            />
            Required
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAddFieldOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={addCustomField} disabled={!newFieldLabel.trim()}>
              Add
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
