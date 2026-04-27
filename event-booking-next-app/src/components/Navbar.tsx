"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/booking", label: "Book Now" },
  { href: "/booking-status", label: "Check Status" },
];

function isAdminLoggedIn(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c === "admin_logged_in=1");
}

export default function Navbar() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setIsAdmin(isAdminLoggedIn());
  }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    closeMobile();
  }, [pathname, closeMobile]);

  const isAdminPage = pathname.startsWith("/admin");

  const allLinks = [
    ...(!isAdminPage ? navLinks : []),
    ...(isAdmin ? [{ href: "/admin", label: "Admin Dashboard" }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-brand-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 text-base font-bold tracking-tight text-brand-900 sm:gap-2.5 sm:text-xl"
        >
          <Image
            src="/images/logo.png"
            alt={`${APP_NAME} logo`}
            width={36}
            height={36}
            className="shrink-0 rounded-full"
          />
          <span className="truncate">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {allLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === link.href
                  ? "bg-brand-100 text-brand-900"
                  : "text-gray-600 hover:bg-brand-50 hover:text-brand-800"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-brand-900 transition-colors hover:bg-brand-50 sm:hidden"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="border-t border-brand-100 bg-white/95 backdrop-blur-md sm:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {allLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-brand-100 text-brand-900"
                    : "text-gray-600 hover:bg-brand-50 hover:text-brand-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
