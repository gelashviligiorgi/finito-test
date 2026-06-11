"use client";

import { useEffectiveDate } from "@/contexts/effective-date-context";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export function Nav() {
  const { effectiveDate, setEffectiveDate } = useEffectiveDate();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Finito
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">Viewing as of:</span>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
            className="w-40"
          />
        </div>
      </div>
    </header>
  );
}
