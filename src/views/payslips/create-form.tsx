"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { trpc } from "@/contexts/trpc-provider";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Employee, PaymentCategory } from "@/types";

type LineItem = { id: number; paymentCategoryId: string; units: string };

type Props = {
  employees: Employee[];
  categories: PaymentCategory[];
  defaultDate: string;
  existingPayslips: { employeeId: number; date: string }[];
  onSave: (data: {
    employeeId: number;
    date: string;
    lineItems: { paymentCategoryId: number; units: number }[];
  }) => Promise<void>;
  isSaving: boolean;
};

let nextId = 1;
function makeItem(): LineItem {
  return { id: nextId++, paymentCategoryId: "", units: "" };
}

export function CreatePayslipForm({
  employees,
  categories,
  defaultDate,
  existingPayslips,
  onSave,
  isSaving,
}: Props) {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [date, setDate] = useState(defaultDate);
  const [lineItems, setLineItems] = useState<LineItem[]>([makeItem()]);

  const { data: employeeRates = [] } = trpc.rates.getByEmployee.useQuery(
    { employeeId: employeeId ?? 0, asOfDate: date },
    { enabled: employeeId !== null && date !== "" }
  );

  const ratedCategoryIds = new Set(employeeRates.map((r) => r.paymentCategoryId));
  const availableCategories =
    employeeId !== null ? categories.filter((c) => ratedCategoryIds.has(c.id)) : [];

  const categoryItems = Object.fromEntries(
    availableCategories.map((c) => [c.id.toString(), c.name])
  );

  function addRow() {
    setLineItems((prev) => [...prev, makeItem()]);
  }

  function removeRow(id: number) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function updateRow(id: number, field: "paymentCategoryId" | "units", value: string) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function reset() {
    setEmployeeId(null);
    setDate(defaultDate);
    setLineItems([makeItem()]);
  }

  async function handleSubmit() {
    if (!employeeId || !date) return;

    const validItems = lineItems.filter(
      (item) => item.paymentCategoryId !== "" && parseFloat(item.units) > 0
    );
    if (validItems.length === 0) return;

    await onSave({
      employeeId,
      date,
      lineItems: validItems.map((item) => ({
        paymentCategoryId: Number(item.paymentCategoryId),
        units: parseFloat(item.units),
      })),
    });

    reset();
  }

  const isDuplicate =
    employeeId !== null &&
    date !== "" &&
    existingPayslips.some((p) => p.employeeId === employeeId && p.date === date);

  const isValid =
    employeeId !== null &&
    date !== "" &&
    !isDuplicate &&
    lineItems.some((item) => item.paymentCategoryId !== "" && parseFloat(item.units) > 0);

  return (
    <div className="rounded-lg border p-5 space-y-4">
      <h2 className="font-semibold text-base">New Payslip</h2>

      {isDuplicate && (
        <p className="text-sm text-destructive">
          A payslip for this employee on {date} already exists.
        </p>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="space-y-2">
          <label className="block text-sm text-muted-foreground mb-2">Employee</label>
          <EmployeeCombobox employees={employees} value={employeeId} onChange={setEmployeeId} />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-muted-foreground mb-2">Date</label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-muted-foreground mb-2">Line Items</label>
        {employeeId === null && (
          <p className="text-sm text-muted-foreground">
            Select an employee to see available categories.
          </p>
        )}
        {employeeId !== null && availableCategories.length === 0 && (
          <p className="text-sm text-amber-600">
            No rates configured for this employee on {date}. Set rates first.
          </p>
        )}
        {availableCategories.length > 0 &&
          lineItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2">
              <Select
                value={item.paymentCategoryId}
                onValueChange={(val) => val && updateRow(item.id, "paymentCategoryId", val)}
                items={categoryItems}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Category…" />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="Units"
                value={item.units}
                onChange={(e) => updateRow(item.id, "units", e.target.value)}
                className="w-28"
              />

              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => removeRow(item.id)}
                disabled={lineItems.length === 1}
              >
                <X />
              </Button>
            </div>
          ))}

        {availableCategories.length > 0 && (
          <Button size="sm" variant="outline" onClick={addRow}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add row
          </Button>
        )}
      </div>

      <Button onClick={() => void handleSubmit()} disabled={!isValid || isSaving}>
        {isSaving ? "Saving…" : "Create payslip"}
      </Button>
    </div>
  );
}
