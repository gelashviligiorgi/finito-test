"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffectiveDate } from "@/contexts/effective-date-context";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const links = [
  { href: "/rates", label: "Rates" },
  { href: "/payslips", label: "Payslips" },
];

export function Nav() {
  const { effectiveDate, setEffectiveDate } = useEffectiveDate();
  const pathname = usePathname();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Finito
          </Link>

          <nav className="flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  pathname === href
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

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
