import { APP_NAME } from "@/lib/config";

const HIGHLIGHTS = [
  { label: "Weddings", icon: "💒" },
  { label: "Receptions", icon: "🎊" },
  { label: "Birthdays", icon: "🎂" },
  { label: "Corporate", icon: "🏢" },
  { label: "Engagements", icon: "💍" },
  { label: "Nikah", icon: "🕌" },
];

function extractHandle(profileUrl: string): string {
  try {
    const u = new URL(profileUrl);
    const segment = u.pathname.split("/").filter(Boolean)[0];
    if (segment) return `@${segment}`;
  } catch {
    // Fallthrough — bad URL.
  }
  return "Instagram";
}

interface InstagramFeedProps {
  profileUrl: string;
}

export default function InstagramFeed({ profileUrl }: InstagramFeedProps) {
  const handle = extractHandle(profileUrl);

  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg">
          <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-6 py-8 text-center text-white sm:px-10">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/80 bg-white/20 backdrop-blur-sm">
              <svg className="h-10 w-10" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold sm:text-3xl">{handle}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/80">
              Follow us for the latest events, stunning décor setups, and
              behind-the-scenes moments at {APP_NAME}.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10">
            <p className="mb-5 text-center text-xs font-semibold uppercase tracking-widest text-gray-400">
              Events We Host
            </p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {HIGHLIGHTS.map((h) => (
                <div key={h.label} className="flex flex-col items-center gap-1.5">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-2xl shadow-sm ring-2 ring-brand-200/60">
                    {h.icon}
                  </span>
                  <span className="text-[11px] font-medium text-gray-600">
                    {h.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 px-6 py-6 text-center sm:px-10">
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 px-7 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg hover:brightness-110"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
              Follow {handle} on Instagram
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
