"use client";

import { useState } from "react";
import { trpc } from "@/contexts/trpc-provider";
import { useEffectiveDate } from "@/contexts/effective-date-context";
import { EmployeeCombobox } from "@/components/employee-combobox";
import { RateTable } from "./rate-table";

export function RatesView() {
  const { effectiveDate } = useEffectiveDate();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const { data: employees = [] } = trpc.employees.getAll.useQuery();
  const { data: categories = [] } = trpc.paymentCategories.getAll.useQuery();
  const { data: employeeRates = [], refetch: refetchRates } = trpc.rates.getByEmployee.useQuery(
    { employeeId: selectedEmployeeId ?? 0, asOfDate: effectiveDate },
    { enabled: selectedEmployeeId !== null }
  );

  const upsert = trpc.rates.upsert.useMutation({
    onSuccess: () => void refetchRates(),
  });

  async function handleSave(categoryId: number, amount: number) {
    if (!selectedEmployeeId) return;
    await upsert.mutateAsync({
      employeeId: selectedEmployeeId,
      paymentCategoryId: categoryId,
      amount,
      effectiveFrom: effectiveDate,
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Rates</h1>
        <p className="text-muted-foreground text-sm">
          Viewing rates as of <span className="font-medium text-foreground">{effectiveDate}</span>
        </p>
      </div>

      <EmployeeCombobox
        employees={employees}
        value={selectedEmployeeId}
        onChange={(id) => setSelectedEmployeeId(id)}
      />

      {selectedEmployeeId === null ? (
        <p className="text-muted-foreground text-sm">Select an employee to view their rates.</p>
      ) : (
        <RateTable
          categories={categories}
          rates={employeeRates}
          effectiveDate={effectiveDate}
          onSave={handleSave}
          isSaving={upsert.isPending}
        />
      )}
    </div>
  );
}
