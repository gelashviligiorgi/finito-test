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

  const hasNoRates = employeeId !== null && availableCategories.length === 0;

  return (
    <div className="space-y-6">
      {/* Employee + Date */}
      <div className="flex flex-wrap gap-x-6 gap-y-4 items-start">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Employee
          </label>
          <EmployeeCombobox employees={employees} value={employeeId} onChange={setEmployeeId} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>

      {isDuplicate && (
        <p className="text-sm text-destructive">
          A payslip for this employee on {date} already exists.
        </p>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Line Items
        </p>

        {employeeId === null ? (
          <p className="text-sm text-muted-foreground">
            Select an employee to see available categories.
          </p>
        ) : hasNoRates ? (
          <p className="text-sm text-amber-600">
            No rates configured for this employee on {date}. Set rates first.
          </p>
        ) : (
          <div className="space-y-2">
            {/* Column headers */}
            <div className="flex items-center gap-2 px-0.5">
              <span className="w-48 text-xs text-muted-foreground">Category</span>
              <span className="w-28 text-xs text-muted-foreground">Units</span>
            </div>

            {lineItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2">
                <Select
                  value={item.paymentCategoryId}
                  onValueChange={(val) => val && updateRow(item.id, "paymentCategoryId", val)}
                  items={categoryItems}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Select…" />
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
                  placeholder="0"
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

            <Button size="sm" variant="outline" onClick={addRow} className="mt-1">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add row
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 pt-1">
        <Button onClick={() => void handleSubmit()} disabled={!isValid || isSaving}>
          {isSaving ? "Saving…" : "Create payslip"}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
          Reset
        </Button>
      </div>
    </div>
  );
}
