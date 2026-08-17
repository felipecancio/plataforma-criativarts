"use client";

import { useEffect, useRef } from "react";
import { trackPurchase } from "@/lib/analytics";
import { consumePendingPurchase } from "@/lib/analytics/pending-purchase";

/**
 * Dispara Meta Pixel Purchase uma vez ao voltar do checkout hospedado.
 */
export function CheckoutPurchaseTracker() {
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;

    const payload = consumePendingPurchase();
    if (!payload) return;

    trackPurchase(payload);
  }, []);

  return null;
}
