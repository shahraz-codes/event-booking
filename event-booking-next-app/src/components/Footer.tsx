export default function Footer() {
  return (
    <footer className="border-t border-amber-100 bg-amber-950 text-amber-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <h3 className="mb-3 text-lg font-semibold text-white">
              Grand Banquet Hall
            </h3>
            <p className="text-sm leading-relaxed text-amber-200/70">
              The perfect venue for your special occasions. Elegant spaces,
              exceptional service, and unforgettable memories.
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
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">
              Contact
            </h4>
            <ul className="space-y-2 text-sm text-amber-200/70">
              <li>123 Celebration Avenue</li>
              <li>City, State 12345</li>
              <li>Phone: (555) 123-4567</li>
              <li>Email: info@grandbanquet.com</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-amber-800 pt-8 text-center text-sm text-amber-200/50">
          &copy; {new Date().getFullYear()} Grand Banquet Hall. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
