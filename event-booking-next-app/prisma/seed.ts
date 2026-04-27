import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "AR Banquets";

async function main() {
  const existingHero = await prisma.heroSection.findFirst();
  if (!existingHero) {
    await prisma.heroSection.create({
      data: {
        subtitle: "Premium Event Venue \u2022 Tolichowki, Hyderabad",
        heading: "Welcome to",
        headingHighlight: APP_NAME,
        description:
          "Your premier destination for weddings, nikah, receptions, engagements, birthdays, and corporate events. Centrally air-conditioned halls accommodating up to 600 guests with in-house catering, d\u00e9cor, and entertainment.",
        logoUrl: "/images/logo.png",
      },
    });
    console.log("Seeded HeroSection");
  } else {
    console.log("HeroSection already exists, skipping");
  }

  const existingSettings = await prisma.siteSettings.findUnique({
    where: { id: "default" },
  });
  if (!existingSettings) {
    await prisma.siteSettings.create({
      data: {
        id: "default",
        themeMode: "PRESET",
        themePreset: "amber",
        instagramEnabled: true,
        instagramUrl: "https://www.instagram.com/arbanquets",
        mapsEnabled: true,
        mapsEmbedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(
          `${APP_NAME} Tolichowki Hyderabad`
        )}&t=&z=15&ie=UTF8&iwloc=&output=embed`,
        mapsLinkUrl: "https://maps.app.goo.gl/kqXpY5EQDHS1eNVN8",
        whatsappEnabled: false,
        whatsappPhone: null,
        addressLine1: "9-4-86/227, AR Center, 5th & 6th Floor",
        addressLine2: "Tolichowki Road, Hyderabad, Telangana 500008",
        contactPhone: "+91 70757 51754",
        contactEmail: "info@arbanquet.com",
        aboutBlurb:
          "Hyderabad's premier banquet hall for weddings, receptions, engagements, and celebrations. Elegant interiors, exceptional catering, and world-class service on the 5th & 6th floors of AR Center, Tolichowki.",
        metaDescription: `${APP_NAME} \u2014 Hyderabad's premier banquet hall for weddings, nikah, receptions, engagements, corporate events, and celebrations. Accommodating up to 600 guests with in-house catering, DJ, and d\u00e9cor.`,
      },
    });
    console.log("Seeded SiteSettings");
  } else {
    console.log("SiteSettings already exists, skipping");
  }

  const statCount = await prisma.statItem.count();
  if (statCount === 0) {
    await prisma.statItem.createMany({
      data: [
        { value: 600, suffix: "+", label: "Guest Capacity", order: 1 },
        { value: 500, suffix: "+", label: "Events Hosted", order: 2 },
        { value: 2, suffix: "", label: "Banquet Floors", order: 3 },
        { value: 10, suffix: "+", label: "Years Experience", order: 4 },
      ],
    });
    console.log("Seeded 4 StatItems");
  } else {
    console.log(`${statCount} StatItems already exist, skipping`);
  }

  const serviceCount = await prisma.serviceItem.count();
  if (serviceCount === 0) {
    await prisma.serviceItem.createMany({
      data: [
        {
          title: "Event Planning & D\u00e9cor",
          desc: "End-to-end event coordination with on-site decorators for custom themes.",
          iconSvg:
            "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7",
          order: 1,
        },
        {
          title: "Premium AC Venue",
          desc: "Centrally air-conditioned halls across two floors with lifts and parking.",
          iconSvg: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
          order: 2,
        },
        {
          title: "In-house DJ & Entertainment",
          desc: "Professional sound, lighting, and stage arrangements with DJ services.",
          iconSvg:
            "M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z",
          order: 3,
        },
        {
          title: "Multi-cuisine Catering",
          desc: "In-house Hyderabadi, North Indian, and multicuisine menus \u2014 veg & non-veg.",
          iconSvg:
            "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
          order: 4,
        },
      ],
    });
    console.log("Seeded 4 ServiceItems");
  } else {
    console.log(`${serviceCount} ServiceItems already exist, skipping`);
  }
}

main()
  .then(() => {
    console.log("Seed complete");
    process.exit(0);
  })
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  });
