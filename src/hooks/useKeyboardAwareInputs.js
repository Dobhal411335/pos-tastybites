"use client";

import { useEffect } from "react";

function isEditableElement(element) {
  if (!element || element.disabled || element.readOnly) return false;

  return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
}

function keepElementVisible(element, behavior = "smooth") {
  if (!isEditableElement(element)) return;

  element.scrollIntoView({
    behavior,
    block: "center",
    inline: "nearest",
  });
}

/** Keep focused form controls visible above a touchscreen keyboard. */
export function useKeyboardAwareInputs() {
  useEffect(() => {
    let focusTimer;
    let viewportTimer;
    const viewport = window.visualViewport;

    const scrollFocusedInput = (behavior = "smooth", delay = 0) => {
      window.clearTimeout(viewportTimer);
      viewportTimer = window.setTimeout(() => {
        keepElementVisible(document.activeElement, behavior);
      }, delay);
    };

    const handleFocusIn = (event) => {
      if (!isEditableElement(event.target)) return;

      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        keepElementVisible(event.target, "smooth");
      }, 150);
    };

    const handleViewportChange = () => {
      if (isEditableElement(document.activeElement)) {
        scrollFocusedInput("smooth", 100);
      }
    };

    document.addEventListener("focusin", handleFocusIn);
    viewport?.addEventListener("resize", handleViewportChange);
    viewport?.addEventListener("scroll", handleViewportChange);

    return () => {
      window.clearTimeout(focusTimer);
      window.clearTimeout(viewportTimer);
      document.removeEventListener("focusin", handleFocusIn);
      viewport?.removeEventListener("resize", handleViewportChange);
      viewport?.removeEventListener("scroll", handleViewportChange);
    };
  }, []);
}
