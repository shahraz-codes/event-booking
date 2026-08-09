import { getSiteSettings } from "@/services/site-settings.service";
import { orgInfoFromSettings } from "@/lib/org-info";

export const revalidate = 60;

// Public, read-only org info (name/address/phone/email) — the same data already
// shown in the site footer. Used by client components (booking-status page,
// booking success page) to stamp the receipt/quotation PDFs. Contains no
// sensitive or per-booking data.
export async function GET() {
  try {
    const settings = await getSiteSettings();
    return Response.json({ success: true, data: orgInfoFromSettings(settings) });
  } catch (error) {
    console.error("Get public settings error:", error);
    return Response.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 }
    );
  }
}
