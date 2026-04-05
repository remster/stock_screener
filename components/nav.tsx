"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const navItems = [
  { label: "Dashboard", href: "/" },
  { label: "Strategies", href: "/strategies" },
  { label: "  Elliot's", href: "/strategies/elliots" },
  { label: "  Breakout", href: "/strategies/sector-breakout" },
  { label: "  Compare", href: "/strategies/compare" },
  { label: "Glossary", href: "/glossary" },
];

export function Nav() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`flex flex-col border-r bg-muted/40 transition-all ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      <div className="flex h-14 items-center border-b px-4">
        {!collapsed && (
          <span className="text-lg font-semibold">Stock Screener</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={collapsed ? "mx-auto" : "ml-auto"}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? ">>" : "<<"}
        </Button>
      </div>
      <ScrollArea className="flex-1 px-2 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent ${
                pathname === item.href
                  ? "bg-accent font-medium"
                  : "text-muted-foreground"
              } ${collapsed ? "text-center" : ""}`}
            >
              {collapsed ? item.label[0] : item.label}
            </Link>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
