import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const sections = [
  {
    href: "/rates",
    title: "Rates",
    description: "Manage employee payment rates and view rate history.",
  },
  {
    href: "/payslips",
    title: "Payslips",
    description: "Create payslips, view totals, and track retroactive changes.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome to Finito</h1>
        <p className="text-muted-foreground mt-1 text-sm">Select a section to get started.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:bg-accent h-full cursor-pointer transition-colors">
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
