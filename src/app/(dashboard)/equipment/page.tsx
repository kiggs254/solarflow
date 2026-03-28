"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  usePanels,
  useBatteries,
  useInverters,
  updatePanel,
  deletePanel,
  updateBattery,
  deleteBattery,
  updateInverter,
  deleteInverter,
} from "@/hooks/use-equipment";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { PageLoading } from "@/components/ui/loading";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PanelForm } from "@/components/equipment/panel-form";
import { BatteryForm } from "@/components/equipment/battery-form";
import { InverterForm } from "@/components/equipment/inverter-form";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { SolarPanel, Battery, Inverter } from "@prisma/client";

type Tab = "panels" | "batteries" | "inverters";

function EqField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/70 py-2 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <div className="min-w-0 text-right text-foreground">{children}</div>
    </div>
  );
}

export default function EquipmentPage() {
  const [tab, setTab] = useState<Tab>("panels");
  const { panels, isLoading: lp, mutate: mp } = usePanels();
  const { batteries, isLoading: lb, mutate: mb } = useBatteries();
  const { inverters, isLoading: li, mutate: mi } = useInverters();

  const [editPanel, setEditPanel] = useState<SolarPanel | null>(null);
  const [editBattery, setEditBattery] = useState<Battery | null>(null);
  const [editInverter, setEditInverter] = useState<Inverter | null>(null);
  const [saving, setSaving] = useState(false);

  const loading = lp || lb || li;
  if (loading && panels.length === 0 && batteries.length === 0 && inverters.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment Catalog</h1>
          <p className="text-sm text-muted-foreground">Manage panels, batteries, and inverters used in system design</p>
        </div>
        <div className="flex gap-2">
          {tab === "panels" && (
            <Link href="/equipment/panels/new">
              <Button><Plus className="mr-1.5 h-4 w-4" /> Add panel</Button>
            </Link>
          )}
          {tab === "batteries" && (
            <Link href="/equipment/batteries/new">
              <Button><Plus className="mr-1.5 h-4 w-4" /> Add battery</Button>
            </Link>
          )}
          {tab === "inverters" && (
            <Link href="/equipment/inverters/new">
              <Button><Plus className="mr-1.5 h-4 w-4" /> Add inverter</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto border-b border-border pb-px sm:mx-0">
        {(["panels", "batteries", "inverters"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors min-h-11 sm:min-h-0 sm:py-2 ${
              tab === t
                ? "border-brand-500 text-brand-700 dark:text-brand-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "panels" ? "Solar panels" : t === "batteries" ? "Batteries" : "Inverters"}
          </button>
        ))}
      </div>

      {tab === "panels" && (
        <Card>
          <CardHeader>
            <CardTitle>Solar panels</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              {panels.map((p) => (
                <Card key={p.id} className="p-4">
                  <p className="font-semibold text-foreground">
                    {p.manufacturer} · {p.model}
                  </p>
                  <EqField label="Wattage">{p.wattage} W</EqField>
                  <EqField label="Efficiency">{(p.efficiency * 100).toFixed(1)}%</EqField>
                  <EqField label="Area">{p.areaSqM} m²</EqField>
                  <EqField label="Cost / panel">${p.costPerPanel}</EqField>
                  <EqField label="Active">{p.isActive ? "Yes" : "No"}</EqField>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-10 flex-1" onClick={() => setEditPanel(p)}>
                      <Pencil className="mr-1.5 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 flex-1 text-red-600"
                      onClick={async () => {
                        if (!confirm("Delete this panel?")) return;
                        await deletePanel(p.id);
                        mp();
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>W</TableHead>
                    <TableHead>Eff.</TableHead>
                    <TableHead>m²</TableHead>
                    <TableHead>$/panel</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {panels.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.manufacturer}</TableCell>
                      <TableCell>{p.model}</TableCell>
                      <TableCell>{p.wattage}</TableCell>
                      <TableCell>{(p.efficiency * 100).toFixed(1)}%</TableCell>
                      <TableCell>{p.areaSqM}</TableCell>
                      <TableCell>${p.costPerPanel}</TableCell>
                      <TableCell>{p.isActive ? "Yes" : "No"}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditPanel(p)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm("Delete this panel?")) return;
                            await deletePanel(p.id);
                            mp();
                          }}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "batteries" && (
        <Card>
          <CardHeader>
            <CardTitle>Batteries</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              {batteries.map((b) => (
                <Card key={b.id} className="p-4">
                  <p className="font-semibold text-foreground">
                    {b.manufacturer} · {b.model}
                  </p>
                  <EqField label="kWh">{b.capacityKwh}</EqField>
                  <EqField label="kW">{b.powerKw}</EqField>
                  <EqField label="Cycles">{b.cycleLife}</EqField>
                  <EqField label="Cost">${b.cost}</EqField>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-10 flex-1" onClick={() => setEditBattery(b)}>
                      <Pencil className="mr-1.5 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 flex-1 text-red-600"
                      onClick={async () => {
                        if (!confirm("Delete?")) return;
                        await deleteBattery(b.id);
                        mb();
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>kWh</TableHead>
                    <TableHead>kW</TableHead>
                    <TableHead>Cycles</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batteries.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.manufacturer}</TableCell>
                      <TableCell>{b.model}</TableCell>
                      <TableCell>{b.capacityKwh}</TableCell>
                      <TableCell>{b.powerKw}</TableCell>
                      <TableCell>{b.cycleLife}</TableCell>
                      <TableCell>${b.cost}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditBattery(b)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm("Delete?")) return;
                            await deleteBattery(b.id);
                            mb();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "inverters" && (
        <Card>
          <CardHeader>
            <CardTitle>Inverters</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              {inverters.map((inv) => (
                <Card key={inv.id} className="p-4">
                  <p className="font-semibold text-foreground">
                    {inv.manufacturer} · {inv.model}
                  </p>
                  <EqField label="Type">{inv.type}</EqField>
                  <EqField label="kW">{inv.ratedPowerKw}</EqField>
                  <EqField label="Efficiency">{(inv.efficiency * 100).toFixed(1)}%</EqField>
                  <EqField label="Cost">${inv.cost}</EqField>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" variant="outline" size="sm" className="min-h-10 flex-1" onClick={() => setEditInverter(inv)}>
                      <Pencil className="mr-1.5 h-4 w-4" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="min-h-10 flex-1 text-red-600"
                      onClick={async () => {
                        if (!confirm("Delete?")) return;
                        await deleteInverter(inv.id);
                        mi();
                      }}
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Manufacturer</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>kW</TableHead>
                    <TableHead>Eff.</TableHead>
                    <TableHead>Cost</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inverters.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.manufacturer}</TableCell>
                      <TableCell>{inv.model}</TableCell>
                      <TableCell>{inv.type}</TableCell>
                      <TableCell>{inv.ratedPowerKw}</TableCell>
                      <TableCell>{(inv.efficiency * 100).toFixed(1)}%</TableCell>
                      <TableCell>${inv.cost}</TableCell>
                      <TableCell className="flex gap-1">
                        <Button type="button" variant="ghost" size="icon" onClick={() => setEditInverter(inv)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (!confirm("Delete?")) return;
                            await deleteInverter(inv.id);
                            mi();
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!editPanel} onClose={() => setEditPanel(null)} title="Edit panel">
        {editPanel && (
          <PanelForm
            initial={editPanel}
            loading={saving}
            onCancel={() => setEditPanel(null)}
            onSubmit={async (data) => {
              setSaving(true);
              try {
                await updatePanel(editPanel.id, data);
                await mp();
                setEditPanel(null);
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!editBattery} onClose={() => setEditBattery(null)} title="Edit battery">
        {editBattery && (
          <BatteryForm
            initial={editBattery}
            loading={saving}
            onCancel={() => setEditBattery(null)}
            onSubmit={async (data) => {
              setSaving(true);
              try {
                await updateBattery(editBattery.id, data);
                await mb();
                setEditBattery(null);
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </Dialog>

      <Dialog open={!!editInverter} onClose={() => setEditInverter(null)} title="Edit inverter">
        {editInverter && (
          <InverterForm
            initial={editInverter}
            loading={saving}
            onCancel={() => setEditInverter(null)}
            onSubmit={async (data) => {
              setSaving(true);
              try {
                await updateInverter(editInverter.id, data);
                await mi();
                setEditInverter(null);
              } finally {
                setSaving(false);
              }
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
