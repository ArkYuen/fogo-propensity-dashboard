"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Customer Propensity" },
  { href: "/budget-reallocation", label: "TimesFM Budget Reallocation" },
] as const;

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#e5e7eb] bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center gap-1 px-6">
        {TABS.map((tab) => {
          const active =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={[
                "relative -mb-px flex h-9 items-center px-3 text-[11px] font-medium tracking-tight transition-colors",
                active
                  ? "border-b-2 border-[#1f2937] text-[#1f2937]"
                  : "border-b-2 border-transparent text-[#6b7280] hover:text-[#1f2937]",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
