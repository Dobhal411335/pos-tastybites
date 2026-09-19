"use client";

import { useEffect } from "react";

function scrollToId(id, behavior = "smooth") {
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({
    behavior: prefersReduced ? "auto" : behavior,
    block: "start",
  });
}

/**
 * Enables smooth scrolling on the landing page for wheel/keyboard scroll
 * and for hash links (#browse-menu, #reservations, etc.).
 */
export default function SmoothScroll() {
  useEffect(() => {
    document.documentElement.classList.add("smooth-scroll");
    return () => {
      document.documentElement.classList.remove("smooth-scroll");
    };
  }, []);

  useEffect(() => {
    const goToHash = () => {
      const id = window.location.hash?.replace(/^#/, "");
      if (!id) return;
      // Wait a tick so layout/images settle
      requestAnimationFrame(() => {
        setTimeout(() => scrollToId(id), 40);
      });
    };

    goToHash();
    window.addEventListener("hashchange", goToHash);

    const onClick = (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.includes("#")) return;

      let url;
      try {
        url = new URL(href, window.location.origin);
      } catch {
        return;
      }

      const id = url.hash?.replace(/^#/, "");
      if (!id) return;

      // Same-page hash links (/, /#section, #section)
      const onHome =
        window.location.pathname === "/" || window.location.pathname === "";
      const linkIsHome =
        url.pathname === "/" || url.pathname === "" || href.startsWith("#");

      if (!onHome || !linkIsHome) return;

      const target = document.getElementById(id);
      if (!target) return;

      event.preventDefault();
      if (window.location.hash !== `#${id}`) {
        history.pushState(null, "", `#${id}`);
      }
      scrollToId(id);
    };

    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", goToHash);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}
