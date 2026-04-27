import { APP_NAME } from "@/lib/config";
import type { SiteSettingsRecord } from "@/services/site-settings.service";

interface FooterProps {
  settings: SiteSettingsRecord;
}

export default function Footer({ settings }: FooterProps) {
  const showInstagram = settings.instagramEnabled && !!settings.instagramUrl;
  const mapsHref = settings.mapsLinkUrl ?? settings.mapsEmbedUrl;
  const showMaps = settings.mapsEnabled && !!mapsHref;

  const aboutBlurb = settings.aboutBlurb?.trim();
  const addressLine1 = settings.addressLine1?.trim();
  const addressLine2 = settings.addressLine2?.trim();
  const contactPhone = settings.contactPhone?.trim();
  const contactEmail = settings.contactEmail?.trim();
  const hasContactInfo = !!(
    addressLine1 ||
    addressLine2 ||
    contactPhone ||
    contactEmail
  );

  return (
    <footer className="border-t border-brand-100 bg-brand-950 text-brand-100">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div
          className={`grid gap-8 ${hasContactInfo ? "md:grid-cols-3" : "md:grid-cols-2"}`}
        >
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              {APP_NAME}
            </h3>
            {aboutBlurb && (
              <p className="text-sm leading-relaxed text-brand-200/70">
                {aboutBlurb}
              </p>
            )}
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-300">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-brand-200/70">
              <li>
                <a href="/booking" className="hover:text-white transition-colors">
                  Book Now
                </a>
              </li>
              <li>
                <a href="/booking-status" className="hover:text-white transition-colors">
                  Check Booking Status
                </a>
              </li>
              {showInstagram && (
                <li>
                  <a
                    href={settings.instagramUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {showMaps && (
                <li>
                  <a
                    href={mapsHref!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Google Maps
                  </a>
                </li>
              )}
            </ul>
          </div>

          {hasContactInfo && (
            <div>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-300">
                Contact
              </h4>
              <ul className="space-y-2 text-sm text-brand-200/70">
                {addressLine1 && <li>{addressLine1}</li>}
                {addressLine2 && <li>{addressLine2}</li>}
                {contactPhone && (
                  <li>
                    Phone:{" "}
                    <a
                      href={`tel:${contactPhone.replace(/\s+/g, "")}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactPhone}
                    </a>
                  </li>
                )}
                {contactEmail && (
                  <li>
                    Email:{" "}
                    <a
                      href={`mailto:${contactEmail}`}
                      className="hover:text-white transition-colors"
                    >
                      {contactEmail}
                    </a>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 border-t border-brand-800 pt-8 text-center text-sm text-brand-200/50">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
