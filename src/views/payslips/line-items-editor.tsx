"use client";

import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaymentCategory } from "@/types";

export type LineItem = { id: number; paymentCategoryId: string; units: string };

type Props = {
  lineItems: LineItem[];
  availableCategories: PaymentCategory[];
  employeeId: number | null;
  date: string;
  hasNoRates: boolean;
  onUpdate: (id: number, field: "paymentCategoryId" | "units", value: string) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
};

export function LineItemsEditor({
  lineItems,
  availableCategories,
  employeeId,
  date,
  hasNoRates,
  onUpdate,
  onRemove,
  onAdd,
}: Props) {
  if (employeeId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Select an employee to see available categories.
      </p>
    );
  }

  if (hasNoRates) {
    return (
      <p className="text-sm text-amber-600">
        No rates configured for this employee on {date}. Set rates first.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-0.5">
        <span className="w-48 text-xs text-muted-foreground">Category</span>
        <span className="w-28 text-xs text-muted-foreground">Units</span>
      </div>

      {lineItems.map((item) => {
        const usedIds = new Set(
          lineItems
            .filter((li) => li.id !== item.id && li.paymentCategoryId !== "")
            .map((li) => li.paymentCategoryId)
        );
        const rowCategories = availableCategories.filter((c) => !usedIds.has(c.id.toString()));
        const rowItems = Object.fromEntries(rowCategories.map((c) => [c.id.toString(), c.name]));

        return (
          <div key={item.id} className="flex items-center gap-2">
            <Select
              value={item.paymentCategoryId}
              onValueChange={(val) => val && onUpdate(item.id, "paymentCategoryId", val)}
              items={rowItems}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {rowCategories.map((cat) => (
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
              onChange={(e) => onUpdate(item.id, "units", e.target.value)}
              className="w-28"
            />

            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Remove row"
              onClick={() => onRemove(item.id)}
              disabled={lineItems.length === 1}
            >
              <X />
            </Button>
          </div>
        );
      })}

      <Button size="sm" variant="outline" onClick={onAdd} className="mt-1">
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add row
      </Button>
    </div>
  );
}
