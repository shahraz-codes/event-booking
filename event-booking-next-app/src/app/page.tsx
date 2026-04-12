import Image from "next/image";
import Link from "next/link";
import GalleryImage from "@/components/GalleryImage";
import HeroCarousel from "@/components/HeroCarousel";
import InstagramFeed from "@/components/InstagramFeed";
import {
  getHero,
  getVisibleCarouselImages,
  getVisibleGalleryItems,
  getVisibleServiceItems,
} from "@/services/homepage.service";

const DEFAULT_HERO = {
  subtitle: "Premium Event Venue \u2022 Tolichowki, Hyderabad",
  heading: "Welcome to",
  headingHighlight: "AR Banquets",
  description:
    "Your premier destination for weddings, nikah, receptions, engagements, birthdays, and corporate events. Centrally air-conditioned halls accommodating up to 600 guests with in-house catering, décor, and entertainment.",
  logoUrl: "/images/logo.png",
};


const FALLBACK_SERVICES = [
  {
    id: "1",
    title: "Event Planning & Décor",
    desc: "End-to-end event coordination with on-site decorators for custom themes.",
    iconSvg:
      "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
  },
  {
    id: "2",
    title: "Premium AC Venue",
    desc: "Centrally air-conditioned halls across two floors with lifts and parking.",
    iconSvg: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
  },
  {
    id: "3",
    title: "In-house DJ & Entertainment",
    desc: "Professional sound, lighting, and stage arrangements with DJ services.",
    iconSvg:
      "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
  },
  {
    id: "4",
    title: "Multi-cuisine Catering",
    desc: "In-house Hyderabadi, North Indian, and multicuisine menus — veg & non-veg.",
    iconSvg:
      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
  },
];

export default async function HomePage() {
  const [hero, carouselImages, galleryItems, serviceItems] = await Promise.all([
    getHero(),
    getVisibleCarouselImages(),
    getVisibleGalleryItems(),
    getVisibleServiceItems(),
  ]);

  const h = hero
    ? {
        ...hero,
        logoUrl: hero.logoMedia?.url ?? hero.logoUrl,
      }
    : DEFAULT_HERO;
  const gallery = galleryItems.map((item) => ({
    ...item,
    imageUrl: item.mediaFile?.url ?? item.imageUrl,
  }));
  const services = serviceItems.length > 0 ? serviceItems : FALLBACK_SERVICES;
  const carouselWithUrls = carouselImages.map((img) => ({
    ...img,
    imageUrl: img.mediaFile?.url ?? img.imageUrl,
  }));
  const hasCarousel = carouselWithUrls.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[520px] overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-6 py-28 text-center text-white">
        {hasCarousel ? (
          <HeroCarousel images={carouselWithUrls} />
        ) : (
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        )}
        <div className="relative z-10 mx-auto max-w-4xl">
          {h.logoUrl && (
            <Image
              src={h.logoUrl}
              alt="AR Banquets logo"
              width={120}
              height={120}
              className="mx-auto mb-6 rounded-full border-2 border-amber-400/30 shadow-2xl"
              priority
            />
          )}
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-amber-300">
            {h.subtitle}
          </p>
          <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
            {h.heading}
            <br />
            <span className="text-amber-300">{h.headingHighlight}</span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-amber-100/80">
            {h.description}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/booking"
              className="rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-amber-900 shadow-lg transition-all hover:bg-amber-50 hover:shadow-xl"
            >
              Check Availability
            </Link>
            <Link
              href="/booking-status"
              className="rounded-xl border-2 border-amber-300/40 px-8 py-3.5 text-sm font-semibold text-amber-100 transition-all hover:border-amber-300 hover:bg-amber-300/10"
            >
              Track Your Booking
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
              Our Venue
            </p>
            <h2 className="text-3xl font-bold text-gray-900">
              A Glimpse of AR Banquets
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {gallery.map((img) => (
              <div
                key={img.id}
                className={`group relative flex h-64 flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${img.gradient} p-6 shadow-lg transition-transform hover:-translate-y-1`}
              >
                <GalleryImage src={img.imageUrl} alt={img.title} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                <div className="relative">
                  <h3 className="text-lg font-semibold text-white">
                    {img.title}
                  </h3>
                  <p className="text-sm text-white/70">{img.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Services */}
      <section className="bg-amber-50/50 px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
              What We Offer
            </p>
            <h2 className="text-3xl font-bold text-gray-900">Our Services</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.id}
                className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
                  <svg
                    className="h-8 w-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d={service.iconSvg}
                    />
                  </svg>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {service.title}
                </h3>
                <p className="text-sm leading-relaxed text-gray-600">
                  {service.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram */}
      <InstagramFeed />

      {/* Location */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
            Find Us
          </p>
          <h2 className="text-3xl font-bold text-gray-900">Our Location</h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
          <iframe
            src="https://maps.google.com/maps?q=AR+Banquets+Tolichowki+Hyderabad&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="AR Banquets Location"
          />
        </div>
        <div className="mt-6 text-center text-gray-600">
          <p className="font-medium text-gray-900">AR Banquets</p>
          <p className="text-sm">
            9-4-86/227, AR Center, 5th &amp; 6th Floor, Tolichowki Road,
            Hyderabad, Telangana 500008
          </p>
          <p className="mt-1 text-sm">
            <a
              href="https://maps.app.goo.gl/kqXpY5EQDHS1eNVN8"
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-700 underline underline-offset-2 hover:text-amber-900"
            >
              Get Directions
            </a>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-amber-800 to-amber-900 px-6 py-16 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-4 text-3xl font-bold text-white">
            Ready to Book Your Event?
          </h2>
          <p className="mb-8 text-amber-100/80">
            Check our availability calendar and reserve your preferred date at
            AR Banquets. Our team will get back to you within 24 hours.
          </p>
          <Link
            href="/booking"
            className="inline-block rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-amber-900 shadow-lg transition-all hover:bg-amber-50 hover:shadow-xl"
          >
            Check Availability &amp; Book
          </Link>
        </div>
      </section>
    </>
  );
}
