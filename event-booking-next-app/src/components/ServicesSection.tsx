"use client";

import HorizontalScroller from "./HorizontalScroller";
import AnimateOnScroll from "./AnimateOnScroll";

interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  iconSvg: string;
}

export default function ServicesSection({
  services,
}: {
  services: ServiceItem[];
}) {
  if (services.length === 0) return null;

  return (
    <section className="bg-brand-50/50 px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl">
        <AnimateOnScroll variant="fadeUp">
          <div className="mb-10 text-center sm:mb-12">
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-brand-600">
              What We Offer
            </p>
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Our Services
            </h2>
          </div>
        </AnimateOnScroll>
        <AnimateOnScroll variant="fadeIn">
          <HorizontalScroller
            ariaLabel="Services"
            className="gap-4 sm:gap-6 lg:gap-8"
          >
            {services.map((service) => (
              <div
                key={service.id}
                className="w-[78%] shrink-0 snap-start sm:w-[calc((100%-1.5rem)/2)] lg:w-[calc((100%-6rem)/4)]"
              >
                <div className="group flex h-full flex-col rounded-2xl border border-brand-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className="mb-4 inline-flex self-start rounded-xl bg-brand-100 p-3 text-brand-700 transition-transform group-hover:scale-110">
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
                  <p className="flex-1 text-sm leading-relaxed text-gray-600">
                    {service.desc}
                  </p>
                </div>
              </div>
            ))}
          </HorizontalScroller>
        </AnimateOnScroll>
      </div>
    </section>
  );
}
