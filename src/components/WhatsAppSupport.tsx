"use client";

import { useEffect, useRef, useState } from "react";

const WHATSAPP_URL =
  "https://wa.me/5522998455928?text=" +
  encodeURIComponent("Olá! Gostaria de saber mais das artes Halfone");

export function WhatsAppSupport() {
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  function openWhatsApp() {
    clearTimer();
    setOpen(false);
    window.open(WHATSAPP_URL, "_blank", "noopener,noreferrer");
  }

  function handleClick() {
    if (open) {
      openWhatsApp();
      return;
    }

    setOpen(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      setOpen(false);
      timerRef.current = null;
    }, 5000);
  }

  return (
    <div className={`whatsapp-support ${open ? "is-open" : ""}`}>
      {open && (
        <button
          type="button"
          className="whatsapp-bubble"
          onClick={openWhatsApp}
        >
          Falar com suporte!
        </button>
      )}

      <button
        type="button"
        className="whatsapp-fab"
        onClick={handleClick}
        aria-label="Suporte no WhatsApp"
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" aria-hidden>
          <path
            fill="currentColor"
            d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.25-4.38c0-4.54 3.7-8.23 8.24-8.23 4.54 0 8.24 3.69 8.24 8.23 0 4.54-3.7 8.24-8.24 8.24z"
          />
          <path
            fill="currentColor"
            d="M16.36 13.98c-.19-.1-1.12-.55-1.3-.62-.17-.06-.3-.1-.42.1-.13.19-.49.62-.6.74-.11.13-.22.14-.41.05-.19-.1-.8-.29-1.53-.94-.56-.5-.94-1.12-1.05-1.31-.11-.19-.01-.3.08-.39.09-.09.19-.22.29-.33.1-.11.13-.19.19-.32.06-.13.03-.24-.02-.33-.05-.1-.42-1.02-.58-1.4-.15-.36-.31-.31-.42-.32h-.36c-.13 0-.33.05-.51.24-.17.19-.67.65-.67 1.59s.68 1.84.78 1.97c.1.13 1.34 2.05 3.25 2.87.45.2.81.31 1.09.4.46.14.87.12 1.2.07.37-.06 1.12-.46 1.28-.9.16-.45.16-.83.11-.9-.05-.08-.17-.13-.36-.23z"
          />
        </svg>
      </button>
    </div>
  );
}
