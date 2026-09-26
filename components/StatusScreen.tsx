import type { ReactNode } from "react";

export function StatusScreen({
  kicker,
  title,
  description,
  children,
  centered = false,
}: {
  kicker: string;
  title: string;
  description: string;
  children: ReactNode;
  centered?: boolean;
}) {
  return (
    <main
      className={`relative mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20 ${
        centered ? "items-center text-center" : ""
      }`}
    >
      <p
        className={`${centered ? "" : "text-center"} font-display text-[6.5rem] leading-none font-semibold text-pvn-gold/25 sm:text-[8rem]`}
        style={{ animation: "pvn-fade 700ms ease-out both" }}
        aria-hidden
      >
        {kicker}
      </p>
      <h1
        className={`font-display mt-2 max-w-xl text-4xl font-semibold leading-tight text-pvn-navy sm:text-5xl ${
          centered ? "mx-auto" : ""
        }`}
        style={{ animation: "pvn-rise 600ms ease-out 80ms both" }}
      >
        {title}
      </h1>
      <p
        className={`mt-4 max-w-md text-pvn-navy/70 ${centered ? "mx-auto" : ""}`}
        style={{ animation: "pvn-rise 600ms ease-out 160ms both" }}
      >
        {description}
      </p>
      <div
        className={`mt-8 flex flex-wrap gap-3 ${
          centered ? "justify-center" : ""
        }`}
        style={{ animation: "pvn-rise 600ms ease-out 240ms both" }}
      >
        {children}
      </div>
    </main>
  );
}
