"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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

  useEffect(() => {
    setIsAdmin(isAdminLoggedIn());
  }, [pathname]);

  const isAdminPage = pathname.startsWith("/admin");

  return (
    <header className="sticky top-0 z-50 border-b border-amber-100 bg-white/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-amber-900">
          AR Banquets
        </Link>

        <div className="flex items-center gap-1">
          {!isAdminPage &&
            navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-amber-100 text-amber-900"
                    : "text-gray-600 hover:bg-amber-50 hover:text-amber-800"
                }`}
              >
                {link.label}
              </Link>
            ))}

          {isAdmin && (
            <Link
              href="/admin"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                isAdminPage
                  ? "bg-amber-100 text-amber-900"
                  : "text-gray-600 hover:bg-amber-50 hover:text-amber-800"
              }`}
            >
              Admin Dashboard
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
