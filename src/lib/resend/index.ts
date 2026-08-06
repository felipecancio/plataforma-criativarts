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
  buildOrderAccessEmailContent,
  type OrderAccessEmailContentInput,
  type OrderAccessEmailContent,
} from "@/lib/resend/templates/order-access";
