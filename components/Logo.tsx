import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  variant?: "light" | "dark";
  showTagline?: boolean;
};

export function Logo({ variant = "dark", showTagline = true }: LogoProps) {
  const isLight = variant === "light";

  return (
    <Link
      href="/"
      className="group flex items-center gap-3 no-underline"
      aria-label="Restore 5 Paulett Ave — home"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-pvn-gold p-1.5 transition group-hover:bg-pvn-gold-light">
        <Image
          src="/pvnlogo.png"
          alt=""
          width={40}
          height={40}
          className="h-full w-full object-contain"
          priority
        />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span
          className={`font-display text-lg font-semibold tracking-tight sm:text-xl ${
            isLight ? "text-pvn-cream" : "text-pvn-navy"
          }`}
        >
          Restore 5 Paulett Ave
        </span>
        {showTagline ? (
          <span
            className={`font-nav text-[0.7rem] font-semibold uppercase tracking-[0.22em] ${
              isLight ? "text-pvn-gold-light" : "text-pvn-stone"
            }`}
          >
            PVN Belfast
          </span>
        ) : null}
      </span>
    </Link>
  );
}
