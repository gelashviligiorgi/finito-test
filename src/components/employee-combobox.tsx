"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import type { Employee } from "@/types";

type Props = {
  employees: Employee[];
  value: number | null;
  onChange: (id: number) => void;
};

export function EmployeeCombobox({ employees, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = employees.find((e) => e.id === value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-64">
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="employee-combobox-listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between")}
      >
        {selected ? selected.name : "Select an employee…"}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border bg-popover shadow-md ring-1 ring-foreground/10">
          <Command>
            <CommandInput placeholder="Search employees…" />
            <CommandList>
              <CommandEmpty>No employee found.</CommandEmpty>
              <CommandGroup>
                {employees.map((emp) => (
                  <CommandItem
                    key={emp.id}
                    value={emp.name}
                    onSelect={() => {
                      onChange(emp.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", value === emp.id ? "opacity-100" : "opacity-0")}
                    />
                    {emp.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
