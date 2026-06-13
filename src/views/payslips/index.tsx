"use client";

import { useState } from "react";
import { trpc } from "@/contexts/trpc-provider";
import { useEffectiveDate } from "@/contexts/effective-date-context";
import { CreatePayslipDialog } from "./create-payslip-dialog";
import { PayslipTable } from "./payslip-table";

export function PayslipsView() {
  const { effectiveDate } = useEffectiveDate();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: employees = [] } = trpc.employees.getAll.useQuery();
  const { data: categories = [] } = trpc.paymentCategories.getAll.useQuery();
  const { data: payslips = [] } = trpc.payslips.getAll.useQuery();

  const create = trpc.payslips.create.useMutation({
    onSuccess: () => {
      void utils.payslips.getAll.invalidate();
      setDialogOpen(false);
    },
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Payslips</h1>
          <p className="text-muted-foreground text-sm">
            Rates applied as of <span className="font-medium text-foreground">{effectiveDate}</span>
          </p>
        </div>

        <CreatePayslipDialog
          employees={employees}
          categories={categories}
          defaultDate={effectiveDate}
          existingPayslips={payslips}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleCreate}
          isSaving={create.isPending}
        />
      </div>

      <PayslipTable
        payslips={payslips}
        onDismiss={handleDismiss}
        isDismissing={dismiss.isPending}
      />
    </div>
  );
}
