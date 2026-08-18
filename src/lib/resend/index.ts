export {
  getResendApiKey,
  hasResendApiKey,
  getResendFrom,
  hasResendFrom,
  getResendAppBaseUrl,
  isResendConfigured,
} from "@/lib/resend/env";
export { getResendClient } from "@/lib/resend/client";
export {
  sendOrderAccessEmailIfNeeded,
  type SendOrderAccessEmailResult,
} from "@/lib/resend/send-order-access-email";
export {
  sendWelcomeEmailIfNeeded,
  type SendWelcomeEmailResult,
} from "@/lib/resend/send-welcome-email";
export {
  sendCheckoutExpiredEmailIfNeeded,
  type SendCheckoutExpiredEmailResult,
} from "@/lib/resend/send-checkout-expired-email";
export {
  buildOrderAccessEmailContent,
  type OrderAccessEmailContentInput,
  type OrderAccessEmailContent,
} from "@/lib/resend/templates/order-access";
export {
  buildWelcomeEmailContent,
  type WelcomeEmailContentInput,
  type WelcomeEmailContent,
} from "@/lib/resend/templates/welcome";
export {
  buildCheckoutExpiredEmailContent,
  type CheckoutExpiredEmailContentInput,
  type CheckoutExpiredEmailContent,
} from "@/lib/resend/templates/checkout-expired";
