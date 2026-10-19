/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TourCard } from "./TourCard";
import { clampStepIndex, isOnStepRoute, startIndexForPath, targetSelectorsFor } from "./tour-navigation";
import type { TourStep } from "./tour-types";

/** Sayfa geçişinden sonra hedef öğenin çizilmesi için beklenen en uzun süre. */
const TARGET_WAIT_MS = 4000;
const TARGET_POLL_MS = 150;

function findTarget(step: TourStep): Element | null {
  for (const selector of targetSelectorsFor(step)) {
    const element = document.querySelector(selector);
    if (element && element.getBoundingClientRect().height > 0) return element;
  }
  return null;
}

function writeStatus(storageKey: string, status: "completed" | "dismissed") {
  try {
    localStorage.setItem(storageKey, status);
  } catch {
    // Depolama kapalı olabilir; tur yine kapanır.
  }
}

interface GuidedTourProps {
  steps: readonly TourStep[];
  open: boolean;
  onClose: () => void;
  storageKey: string;
  ariaLabel: string;
}

/**
 * Sayfalar arasında gezen tur. Her adımda gerekirse adımın sayfasına gider, hedef öğeyi bekler
 * (bulunamazsa sayfa başlığı, o da yoksa ortada kart) ve vurgular. Kalıcı bir iskelete (Shell,
 * AdminShell) yerleştirilir; sayfa değiştiğinde durumunu kaybetmez.
 */
export function GuidedTour({ steps, open, onClose, storageKey, ariaLabel }: GuidedTourProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [loading, setLoading] = useState(false);
  // Başlangıç adımı belirlenmeden sayfa geçişi yapılmaz; yoksa eski adımın sayfasına gidilir.
  const [started, setStarted] = useState(false);
  const step = steps[clampStepIndex(index, steps.length)];

  // Tur, başlatıldığı sayfanın adımından açılır; yalnız açılışta okunur, sayfa değişimi adımı sıfırlamaz.
  useEffect(() => {
    if (open) setIndex(startIndexForPath(window.location.pathname, steps));
    setStarted(open);
  }, [open]);

  useEffect(() => {
    if (!open || !started || !step || isOnStepRoute(location.pathname, step)) return;
    setLoading(true);
    navigate(step.route);
  }, [open, started, step, location.pathname, navigate]);

  useEffect(() => {
    if (!open || !started || !step || !isOnStepRoute(location.pathname, step)) return;
    let elapsed = 0;
    let timer: ReturnType<typeof setTimeout>;
    const poll = () => {
      const element = findTarget(step);
      if (element || elapsed >= TARGET_WAIT_MS) {
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
        timer = setTimeout(() => {
          setRect(element ? element.getBoundingClientRect() : null);
          setLoading(false);
        }, element ? 350 : 0);
        return;
      }
      elapsed += TARGET_POLL_MS;
      timer = setTimeout(poll, TARGET_POLL_MS);
    };
    poll();
    return () => clearTimeout(timer);
  }, [open, started, step, location.pathname]);

  useEffect(() => {
    if (!open || !step) return;
    const update = () => {
      const element = findTarget(step);
      setRect(element ? element.getBoundingClientRect() : null);
    };
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true, capture: true });
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [open, step]);

  const close = useCallback((status: "completed" | "dismissed") => {
    writeStatus(storageKey, status);
    onClose();
  }, [storageKey, onClose]);

  const goTo = useCallback((next: number) => {
    setRect(null);
    setLoading(true);
    setIndex(clampStepIndex(next, steps.length));
  }, [steps.length]);

  const next = useCallback(() => {
    if (index >= steps.length - 1) close("completed");
    else goTo(index + 1);
  }, [index, steps.length, close, goTo]);
  const prev = useCallback(() => { if (index > 0) goTo(index - 1); }, [index, goTo]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("dismissed");
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, close]);

  if (!open || !started || !step) return null;
  return (
    <TourCard
      ariaLabel={ariaLabel}
      step={step}
      index={clampStepIndex(index, steps.length)}
      total={steps.length}
      rect={rect}
      loading={loading}
      onPrev={prev}
      onNext={next}
      onDismiss={() => close("dismissed")}
      onJump={goTo}
    />
  );
}
