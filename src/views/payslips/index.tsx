"use client";

import { trpc } from "@/contexts/trpc-provider";
import { useEffectiveDate } from "@/contexts/effective-date-context";
import { CreatePayslipForm } from "./create-form";
import { PayslipTable } from "./payslip-table";

export function PayslipsView() {
  const { effectiveDate } = useEffectiveDate();
  const utils = trpc.useUtils();

  const { data: employees = [] } = trpc.employees.getAll.useQuery();
  const { data: categories = [] } = trpc.paymentCategories.getAll.useQuery();
  const { data: payslips = [] } = trpc.payslips.getAll.useQuery();

  const create = trpc.payslips.create.useMutation({
    onSuccess: () => void utils.payslips.getAll.invalidate(),
  });

  const dismiss = trpc.payslips.dismissLatestRateEdit.useMutation({
    onSuccess: () => void utils.payslips.getAll.invalidate(),
  });

  async function handleCreate(data: {
    employeeId: number;
    date: string;
    lineItems: { paymentCategoryId: number; units: number }[];
  }) {
    await create.mutateAsync(data);
  }

  function handleDismiss(payslipId: number) {
    dismiss.mutate({ payslipId });
  }

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Payslips</h1>
        <p className="text-muted-foreground text-sm">
          Rates applied as of <span className="font-medium text-foreground">{effectiveDate}</span>
        </p>
      </div>

      <CreatePayslipForm
        employees={employees}
        categories={categories}
        defaultDate={effectiveDate}
        onSave={handleCreate}
        isSaving={create.isPending}
      />

      <div className="space-y-3">
        <h2 className="font-semibold">All Payslips</h2>
        <PayslipTable
          payslips={payslips}
          onDismiss={handleDismiss}
          isDismissing={dismiss.isPending}
        />
      </div>
    </div>
  );
}
