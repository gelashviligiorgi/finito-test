import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import clsx from "clsx";
import { TRPCProvider } from "@/contexts/trpc-provider";
import { EffectiveDateProvider } from "@/contexts/effective-date-context";
import { Nav } from "./_components/nav";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Finito",
  description: "Payroll management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={clsx(inter.variable, ibmPlexMono.variable, "h-full antialiased")}>
      <body className="min-h-full flex flex-col">
        <TRPCProvider>
          <EffectiveDateProvider>
            <Nav />
            <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
          </EffectiveDateProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
