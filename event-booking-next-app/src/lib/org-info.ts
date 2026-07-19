// Fix 3: a small, serialisable "organisation info" shape used to drive the
// address/phone shown on the booking receipt and quotation PDFs from Homepage
// Manager (SiteSettings) instead of hardcoding them.

import { APP_NAME } from "@/lib/config";

export interface OrgInfo {
  name: string;
  addressLine1: string | null;
  addressLine2: string | null;
  phone: string | null;
  email: string | null;
}

export const EMPTY_ORG: OrgInfo = {
  name: APP_NAME,
  addressLine1: null,
  addressLine2: null,
  phone: null,
  email: null,
};

/** Build OrgInfo from a SiteSettings-like object (server or fetched JSON). */
export function orgInfoFromSettings(s: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}): OrgInfo {
  return {
    name: APP_NAME,
    addressLine1: s.addressLine1 ?? null,
    addressLine2: s.addressLine2 ?? null,
    phone: s.contactPhone ?? null,
    email: s.contactEmail ?? null,
  };
}

/** Single-line address string (skips empty parts). */
export function formatOrgAddress(org: OrgInfo): string {
  return [org.addressLine1, org.addressLine2].filter(Boolean).join(", ");
}
