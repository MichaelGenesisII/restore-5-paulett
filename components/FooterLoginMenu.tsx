"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { loginNav } from "@/lib/navigation";

/**
 * Next keeps the scroll position when the new page is still partly in view,
 * which the short login pages always are from the footer. Jump to the top and
 * hand focus to the page so the visitor is not left sitting in the footer.
 */
function revealPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  document.getElementById("main-content")?.focus({ preventScroll: true });
}

export function FooterLoginMenu({ linkClass }: { linkClass: string }) {
  const pathname = usePathname();
  const pendingReveal = useRef(false);

  useEffect(() => {
    if (!pendingReveal.current) return;
    pendingReveal.current = false;
    revealPageTop();
  }, [pathname]);

  return (
    <div className="group/login relative">
      <button
        type="button"
        className={`${linkClass} gap-1.5`}
        aria-haspopup="menu"
        aria-controls="footer-login-menu"
      >
        Login
        <span
          aria-hidden
          className="inline-block text-[0.55rem] text-pvn-cream/45 transition duration-300 ease-out group-hover/login:translate-y-0.5 group-hover/login:text-pvn-gold-light group-focus-within/login:translate-y-0.5 group-focus-within/login:text-pvn-gold-light"
        >
          ▾
        </span>
      </button>
      <div
        id="footer-login-menu"
        role="menu"
        className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-300 ease-out group-hover/login:grid-rows-[1fr] group-hover/login:opacity-100 group-focus-within/login:grid-rows-[1fr] group-focus-within/login:opacity-100"
      >
        <ul className="min-h-0 overflow-hidden pl-3">
          {loginNav.map((item) => (
            <li key={item.href} role="none">
              <Link
                href={item.href}
                role="menuitem"
                onNavigate={() => {
                  if (item.href === pathname) {
                    revealPageTop();
                  } else {
                    pendingReveal.current = true;
                  }
                }}
                className={`${linkClass} translate-y-1 opacity-0 transition duration-300 ease-out delay-75 group-hover/login:translate-y-0 group-hover/login:opacity-100 group-focus-within/login:translate-y-0 group-focus-within/login:opacity-100`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
