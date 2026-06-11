"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaymentCategory, Rate } from "@/types";

type Props = {
  categories: PaymentCategory[];
  rates: Rate[];
  effectiveDate: string;
  onSave: (categoryId: number, amount: number) => Promise<void>;
  isSaving: boolean;
};

export function RateTable({ categories, rates, effectiveDate, onSave, isSaving }: Props) {
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [inputAmount, setInputAmount] = useState("");

  const ratesByCategoryId = new Map(rates.map((r) => [r.paymentCategoryId, r]));

  function startEdit(categoryId: number, currentAmount?: number) {
    setEditingCategoryId(categoryId);
    setInputAmount(currentAmount?.toString() ?? "");
  }

  function cancelEdit() {
    setEditingCategoryId(null);
    setInputAmount("");
  }

  async function handleSave(categoryId: number) {
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) return;
    await onSave(categoryId, amount);
    setEditingCategoryId(null);
    setInputAmount("");
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Payment Category</TableHead>
          <TableHead>Rate Amount</TableHead>
          <TableHead>Effective From</TableHead>
          <TableHead className="w-40" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((category) => {
          const rate = ratesByCategoryId.get(category.id);
          const isEditing = editingCategoryId === category.id;

          return (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>

              <TableCell>
                {isEditing ? (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="w-32"
                    autoFocus
                  />
                ) : rate ? (
                  <span className="font-mono">${rate.amount.toFixed(2)}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell>
                {isEditing ? (
                  <span className="text-muted-foreground text-sm">{effectiveDate}</span>
                ) : rate ? (
                  <span className="text-sm">{rate.effectiveFrom}</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>

              <TableCell className="text-right">
                {isEditing ? (
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      onClick={() => void handleSave(category.id)}
                      disabled={isSaving}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant={rate ? "outline" : "default"}
                    onClick={() => startEdit(category.id, rate?.amount)}
                  >
                    {rate ? "Edit" : "Add rate"}
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
