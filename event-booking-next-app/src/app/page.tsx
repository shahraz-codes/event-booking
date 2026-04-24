import Image from "next/image";
import Link from "next/link";
import GallerySection from "@/components/GallerySection";
import HeroCarousel from "@/components/HeroCarousel";
import InstagramFeed from "@/components/InstagramFeed";
import ServicesSection from "@/components/ServicesSection";
import AnimateOnScroll, {
  StaggerContainer,
  StaggerItem,
} from "@/components/AnimateOnScroll";
import {
  HeroContent,
  HeroItem,
  FloatingLogo,
  ShimmerText,
  FloatingParticles,
  CounterAnimation,
} from "@/components/HeroAnimations";
import {
  getHero,
  getVisibleCarouselImages,
  getVisibleGalleryItems,
  getVisibleServiceItems,
} from "@/services/homepage.service";
import { APP_NAME } from "@/lib/config";

const DEFAULT_HERO = {
  subtitle: "Premium Event Venue \u2022 Tolichowki, Hyderabad",
  heading: "Welcome to",
  headingHighlight: APP_NAME,
  description:
    "Your premier destination for weddings, nikah, receptions, engagements, birthdays, and corporate events. Centrally air-conditioned halls accommodating up to 600 guests with in-house catering, d\u00e9cor, and entertainment.",
  logoUrl: "/images/logo.png",
};


const STATS = [
  { value: 600, suffix: "+", label: "Guest Capacity" },
  { value: 500, suffix: "+", label: "Events Hosted" },
  { value: 2, suffix: "", label: "Banquet Floors" },
  { value: 10, suffix: "+", label: "Years Experience" },
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
  const services = serviceItems;
  const carouselWithUrls = carouselImages.map((img) => ({
    ...img,
    imageUrl: img.mediaFile?.url ?? img.imageUrl,
  }));
  const hasCarousel = carouselWithUrls.length > 0;

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[480px] overflow-hidden bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 px-4 py-20 text-center text-white sm:min-h-[520px] sm:px-6 sm:py-28">
        {hasCarousel ? (
          <HeroCarousel images={carouselWithUrls} />
        ) : (
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNCI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        )}
        <FloatingParticles />
        <HeroContent>
          <HeroItem>
            {h.logoUrl && (
              <FloatingLogo>
                <Image
                  src={h.logoUrl}
                  alt={`${APP_NAME} logo`}
                  width={120}
                  height={120}
                  className="mx-auto mb-6 h-20 w-20 rounded-full border-2 border-amber-400/30 shadow-2xl sm:h-[120px] sm:w-[120px]"
                  priority
                />
              </FloatingLogo>
            )}
          </HeroItem>
          <HeroItem>
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-amber-300">
              {h.subtitle}
            </p>
          </HeroItem>
          <HeroItem>
            <h1 className="mb-6 text-3xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
              {h.heading}
              <br />
              <ShimmerText>{h.headingHighlight}</ShimmerText>
            </h1>
          </HeroItem>
          <HeroItem>
            <p className="mx-auto mb-10 max-w-2xl text-base leading-relaxed text-amber-100/80 sm:text-lg">
              {h.description}
            </p>
          </HeroItem>
          <HeroItem>
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center sm:gap-4">
              <Link
                href="/booking"
                className="rounded-xl bg-white px-6 py-3 text-sm font-semibold text-amber-900 shadow-lg transition-all hover:bg-amber-50 hover:shadow-xl hover:scale-105 sm:px-8 sm:py-3.5"
              >
                Check Availability
              </Link>
              <Link
                href="/booking-status"
                className="rounded-xl border-2 border-amber-300/40 px-6 py-3 text-sm font-semibold text-amber-100 transition-all hover:border-amber-300 hover:bg-amber-300/10 sm:px-8 sm:py-3.5"
              >
                Track Your Booking
              </Link>
            </div>
          </HeroItem>
        </HeroContent>
      </section>

      {/* Stats */}
      <section className="bg-white px-4 py-12 sm:px-6 sm:py-16">
        <StaggerContainer className="mx-auto grid max-w-5xl grid-cols-2 gap-6 sm:gap-8 md:grid-cols-4">
          {STATS.map((stat) => (
            <StaggerItem key={stat.label} variant="scaleUp">
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-800 sm:text-4xl">
                  <CounterAnimation value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-1 text-xs font-medium text-gray-600 sm:text-sm">
                  {stat.label}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* Gallery */}
      {gallery.length > 0 && (
        <AnimateOnScroll variant="fadeIn">
          <GallerySection gallery={gallery} />
        </AnimateOnScroll>
      )}

      {/* Services */}
      <ServicesSection services={services} />

      {/* Instagram */}
      <AnimateOnScroll variant="fadeUp">
        <InstagramFeed />
      </AnimateOnScroll>

      {/* Location */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <AnimateOnScroll variant="fadeUp">
          <div className="mb-10 text-center sm:mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-amber-600">
              Find Us
            </p>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Our Location</h2>
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll variant="scaleUp" delay={0.2}>
          <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
            <iframe
              src={`https://maps.google.com/maps?q=${encodeURIComponent(
                `${APP_NAME} Tolichowki Hyderabad`
              )}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
              width="100%"
              height="400"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`${APP_NAME} Location`}
              className="h-[280px] w-full sm:h-[400px]"
            />
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll variant="fadeUp" delay={0.3}>
          <div className="mt-6 text-center text-gray-600">
            <p className="font-medium text-gray-900">{APP_NAME}</p>
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
        </AnimateOnScroll>
      </section>

      {/* CTA */}
      <AnimateOnScroll variant="fadeIn">
        <section className="bg-gradient-to-r from-amber-800 to-amber-900 px-4 py-12 text-center sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl">
            <h2 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
              Ready to Book Your Event?
            </h2>
            <p className="mb-8 text-sm text-amber-100/80 sm:text-base">
              Check our availability calendar and reserve your preferred date at
              {" "}
              {APP_NAME}. Our team will get back to you within 24 hours.
            </p>
            <Link
              href="/booking"
              className="inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-amber-900 shadow-lg transition-all hover:bg-amber-50 hover:shadow-xl hover:scale-105 sm:px-8 sm:py-3.5"
            >
              Check Availability &amp; Book
            </Link>
          </div>
        </section>
      </AnimateOnScroll>
    </>
  );
}
