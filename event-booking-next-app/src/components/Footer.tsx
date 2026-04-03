export default function Footer() {
  return (
    <footer className="border-t border-amber-100 bg-amber-950 text-amber-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              AR Banquets
            </h3>
            <p className="text-sm leading-relaxed text-amber-200/70">
              Hyderabad&apos;s premier banquet hall for weddings, receptions,
              engagements, and celebrations. Elegant interiors, exceptional
              catering, and world-class service on the 5th &amp; 6th floors of
              AR Center, Tolichowki.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-amber-200/70">
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
              <li>
                <a
                  href="https://www.instagram.com/arbanquets"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Instagram
                </a>
              </li>
              <li>
                <a
                  href="https://maps.app.goo.gl/kqXpY5EQDHS1eNVN8"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Google Maps
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-amber-200/70">
              <li>9-4-86/227, AR Center, 5th &amp; 6th Floor</li>
              <li>Tolichowki Road, Hyderabad, Telangana 500008</li>
              <li>Phone: +91 70757 51754</li>
              <li>Email: info@arbanquet.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-amber-800 pt-8 text-center text-sm text-amber-200/50">
          &copy; {new Date().getFullYear()} AR Banquets. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
