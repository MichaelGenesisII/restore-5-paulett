"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const messages = [
  {
    title: "Take your part of the wall",
    subtitle:
      "We cannot build this alone. Every gift — into a pot or straight to the fund — lands in the same house.",
    citation: "This is our moment",
  },
  {
    title: "They shall build the old wastes, they shall raise up the former desolations.",
    subtitle: "Isaiah 61:4",
    citation: "What God does",
  },
  {
    title: "Let us rise up and build.",
    subtitle: "Nehemiah 2:18",
    citation: "What we do",
  },
  {
    title: "God loves a cheerful giver.",
    subtitle: "2 Corinthians 9:7",
    citation: "The heart of giving",
  },
  {
    title: "Honour the Lord with your wealth.",
    subtitle: "Proverbs 3:9",
    citation: "The gift becomes worship",
  },
  {
    title: "We are God's fellow workers.",
    subtitle: "1 Corinthians 3:9",
    citation: "The work we share",
  },
  {
    title: "Go up into the hills and bring down timber; build the house.",
    subtitle: "Haggai 1:8",
    citation: "The call to build",
  },
] as const;

export function StoryFinalCta() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let timeout: number | undefined;
    const interval = window.setInterval(() => {
      setVisible(false);
      timeout = window.setTimeout(() => {
        setActiveIndex((index) => (index + 1) % messages.length);
        setVisible(true);
      }, 350);
    }, 6000);

    return () => {
      window.clearInterval(interval);
      if (timeout) window.clearTimeout(timeout);
    };
  }, []);

  const message = messages[activeIndex];

  return (
    <section className="relative overflow-hidden border-t border-pvn-navy/5 bg-pvn-cream pb-14 sm:pb-20">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pvn-gold/50 to-transparent"
        aria-hidden
      />

      <Image
        src="/dove-left.png"
        alt=""
        aria-hidden
        width={500}
        height={500}
        className="pvn-dove pvn-dove-left pointer-events-none absolute -left-10 bottom-2 w-40 opacity-[0.07] sm:left-2 sm:w-56 lg:w-72 lg:opacity-[0.09]"
      />
      <Image
        src="/dove-right.png"
        alt=""
        aria-hidden
        width={499}
        height={499}
        className="pvn-dove pvn-dove-right pointer-events-none absolute -right-10 top-2 w-40 opacity-[0.07] sm:right-2 sm:w-56 lg:w-72 lg:opacity-[0.09]"
      />

      <div className="relative mx-auto max-w-2xl px-4 pt-14 text-center sm:px-6 sm:pt-16">
        <div
          className={`transition-opacity duration-[350ms] ${visible ? "opacity-100" : "opacity-0"}`}
          aria-live="polite"
        >
          <p className="font-nav text-xs font-semibold tracking-[0.28em] text-pvn-gold uppercase">
            {message.citation}
          </p>
          <h2 className="font-display mt-3 text-3xl leading-tight font-semibold text-pvn-navy sm:text-4xl">
            {message.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-pvn-navy/70 text-pretty sm:text-lg">
            {message.subtitle}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/give"
            className="font-nav inline-flex rounded-md bg-pvn-gold px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:bg-pvn-gold-light"
          >
            Give now
          </Link>
          <Link
            href="/fundraisers/create"
            className="font-nav inline-flex rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
          >
            Start a pot
          </Link>
          <Link
            href="/our-new-home"
            className="font-nav inline-flex rounded-md border border-pvn-navy/25 px-5 py-3 text-xs font-bold tracking-[0.14em] text-pvn-navy uppercase transition hover:border-pvn-gold hover:text-pvn-gold"
          >
            See the house
          </Link>
        </div>
      </div>
    </section>
  );
}
