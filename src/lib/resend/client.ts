import { Resend } from "resend";
import { getResendApiKey } from "@/lib/resend/env";

let client: Resend | null = null;

/**
 * Cliente Resend singleton — somente servidor.
 */
export function getResendClient(): Resend {
  if (!client) {
    client = new Resend(getResendApiKey());
  }
  return client;
}
