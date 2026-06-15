"use client";

import { useState } from "react";
import { trpc } from "@/contexts/trpc-provider";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineItemsEditor } from "./line-items-editor";
import type { LineItem } from "./line-items-editor";
import type { Employee, PaymentCategory } from "@/types";

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
        <LineItemsEditor
          lineItems={lineItems}
          availableCategories={availableCategories}
          employeeId={employeeId}
          date={date}
          hasNoRates={hasNoRates}
          onUpdate={updateRow}
          onRemove={removeRow}
          onAdd={addRow}
        />
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
