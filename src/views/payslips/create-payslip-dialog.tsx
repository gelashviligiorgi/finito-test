"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreatePayslipForm } from "./create-form";
import type { Employee, PaymentCategory } from "@/types";

type Props = {
  employees: Employee[];
  categories: PaymentCategory[];
  defaultDate: string;
  existingPayslips: { employeeId: number; date: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    employeeId: number;
    date: string;
    lineItems: { paymentCategoryId: number; units: number }[];
  }) => Promise<void>;
  isSaving: boolean;
};

export function CreatePayslipDialog({
  employees,
  categories,
  defaultDate,
  existingPayslips,
  open,
  onOpenChange,
  onSave,
  isSaving,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Payslip
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl p-8" showCloseButton>
        <DialogHeader>
          <DialogTitle>New Payslip</DialogTitle>
        </DialogHeader>
        <CreatePayslipForm
          employees={employees}
          categories={categories}
          defaultDate={defaultDate}
          existingPayslips={existingPayslips}
          onSave={onSave}
          isSaving={isSaving}
        />
      </DialogContent>
    </Dialog>
  );
}
