"use client";

import { useState } from "react";

/**
 * India-only phone input: a locked "+91" prefix plus a 10-digit national number.
 *
 * Fix 2: the previous implementation derived the editable value from the
 * canonical (91-prefixed) value on every render, but only stripped the "91"
 * when the string was exactly 12 digits long. During partial entry the "91"
 * leaked into the field and each keystroke re-prepended it, which produced the
 * "typing does nothing / a 1 appears at the start on delete" bug.
 *
 * This version keeps the 10 national digits in local state and only *composes*
 * the canonical value inside onChange, so the displayed value never re-parses a
 * prefixed string. It stays correct even when the national number itself starts
 * with "91" (e.g. +91 9102345678).
 *
 * `storageFormat` controls the canonical value passed to onChange:
 *   - "digits" -> "91XXXXXXXXXX"    (WhatsApp; wa.me wants digits only)
 *   - "pretty" -> "+91 XXXXX XXXXX" (contact phone shown in the footer)
 */
export interface PhoneFieldProps {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  required?: boolean;
  storageFormat?: "digits" | "pretty";
  id?: string;
  placeholder?: string;
}

/** Extract the 10 national digits from any stored canonical value. */
function toNationalDigits(value: string | null): string {
  const digits = (value ?? "").replace(/\D+/g, "");
  // The canonical value always begins with the country code "91", so strip the
  // first two characters whenever present; never scan for "91" elsewhere.
  const national = digits.startsWith("91") ? digits.slice(2) : digits;
  return national.slice(0, 10);
}

/** Compose the canonical value in the requested storage format. */
function toCanonical(
  national: string,
  storageFormat: "digits" | "pretty"
): string | null {
  if (national.length === 0) return null;
  if (storageFormat === "digits") return `91${national}`;
  return national.length === 10
    ? `+91 ${national.slice(0, 5)} ${national.slice(5)}`
    : `+91 ${national}`;
}

export default function PhoneField({
  label,
  value,
  onChange,
  required,
  storageFormat = "digits",
  id,
  placeholder = "9876543210",
}: PhoneFieldProps) {
  // Local state holds ONLY the national digits the user typed.
  const [national, setNational] = useState<string>(() => toNationalDigits(value));
  const [prevValue, setPrevValue] = useState(value);

  // Resync when the value changes from outside (e.g. switching records / reset).
  // Guard so we don't clobber in-progress typing when the parent echoes back the
  // same canonical value we just emitted.
  if (value !== prevValue) {
    setPrevValue(value);
    const incoming = toNationalDigits(value);
    if (incoming !== national) setNational(incoming);
  }

  const handleChange = (next: string) => {
    const digits = next.replace(/\D+/g, "").slice(0, 10);
    setNational(digits);
    onChange(toCanonical(digits, storageFormat));
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      <div className="flex items-stretch overflow-hidden rounded-lg border border-gray-300 transition-colors focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500/20">
        <span
          aria-hidden="true"
          className="flex select-none items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-medium text-gray-600"
        >
          +91
        </span>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          value={national}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          maxLength={10}
          pattern="\d{10}"
          required={required}
          aria-label={label}
          className="w-full bg-transparent px-3 py-2 text-sm tracking-wider outline-none"
        />
      </div>
    </div>
  );
}
