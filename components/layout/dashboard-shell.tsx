"use client";

import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

interface DashboardShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardShell({ sidebar, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* Close drawer on route change (when a link inside sidebar is clicked) */
  useEffect(() => {
    setSidebarOpen(false);
  }, []);

  /* Prevent body scroll while mobile drawer is open */
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Desktop sidebar (always visible ≥ md) ── */}
      <div className="hidden md:flex h-full">
        {sidebar}
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          aria-hidden="true"
          style={{ background: "rgba(0,0,0,0.45)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {/* [&_aside]:w-60 forces full-width sidebar inside the mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 md:hidden [&_aside]:w-60 transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebar}
      </div>

      {/* ── Content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header
          className="flex md:hidden items-center gap-3 px-4 py-3 flex-shrink-0"
          style={{ background: "var(--sidebar-bg)", borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <button
            type="button"
            aria-label="Abrir menú"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: "rgba(255,255,255,0.70)" }}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/20">
              <span className="text-white font-bold text-xs">D</span>
            </div>
            <span className="text-sm font-semibold text-white">DentApp</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
