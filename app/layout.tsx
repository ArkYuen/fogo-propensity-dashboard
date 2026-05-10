import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DashboardTabs } from "@/components/dashboard-tabs";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Tombras Demo · Analytics",
  description: "Propensity and TimesFM budget reallocation dashboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className={`${inter.variable} font-sans min-h-full flex flex-col bg-[#f7f8fa]`}
      >
        <DashboardTabs />
        {children}
      </body>
    </html>
  );
}
