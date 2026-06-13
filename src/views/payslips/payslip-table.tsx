"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type PayslipRow = {
  id: number;
  date: string;
  employee: { name: string };
  snapshotTotal: number;
  currentTotal: number;
  isRetroactivelyChanged: boolean;
};

type Props = {
  payslips: PayslipRow[];
  onDismiss: (payslipId: number) => void;
  isDismissing: boolean;
};

export function PayslipTable({ payslips, onDismiss, isDismissing }: Props) {
  if (payslips.length === 0) {
    return <p className="text-muted-foreground text-sm">No payslips yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Original Total</TableHead>
          <TableHead>Current Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-28" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {payslips.map((payslip) => {
          const changed = payslip.isRetroactivelyChanged;

          return (
            <TableRow key={payslip.id} className={cn(changed && "bg-amber-50 hover:bg-amber-100")}>
              <TableCell className="font-medium">{payslip.employee.name}</TableCell>
              <TableCell>{payslip.date}</TableCell>
              <TableCell className="font-mono">${payslip.snapshotTotal.toFixed(2)}</TableCell>
              <TableCell className={cn("font-mono", changed && "font-semibold text-amber-700")}>
                ${payslip.currentTotal.toFixed(2)}
              </TableCell>
              <TableCell>
                {changed ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                    Rate changed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    OK
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-right">
                {changed && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDismiss(payslip.id)}
                    disabled={isDismissing}
                  >
                    Dismiss
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
