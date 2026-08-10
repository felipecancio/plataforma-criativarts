/**
 * Camada de dados tipada — ponto único para a app consumir o Supabase.
 * No Mercado Pago, reutilize estes módulos em vez de consultar tabelas soltas.
 */

export {
  createClient as createBrowserSupabaseClient,
} from "@/lib/supabase/client";
export {
  createClient as createServerSupabaseClient,
} from "@/lib/supabase/server";
export { createPublicClient } from "@/lib/supabase/public";

export {
  getProducts,
  getProductBySlug,
  getProductById,
  getAllProductSlugs,
  getRelatedProducts,
} from "@/lib/products/queries";
export { productHasStorageFile } from "@/lib/products/mappers";
export { PRODUCT_COLUMNS } from "@/lib/products/columns";

export {
  getCurrentProfile,
  getProfileByUserId,
  updateCurrentProfile,
} from "@/lib/profiles/queries";

export {
  getCurrentUserOrders,
  getOrderById,
  createPendingOrder,
  attachPaymentReferences,
} from "@/lib/orders/queries";

export {
  getCurrentUserLibrary,
  userOwnsProduct,
  getLibraryEntry,
} from "@/lib/library/queries";

export { prepareCheckoutOrder } from "@/lib/checkout/prepare-order";
export { createPaymentSession } from "@/lib/payments/create-payment-session";
export { processPayment } from "@/lib/payments/process-payment";
export { handleMercadoPagoWebhook } from "@/lib/payments/handle-webhook";
export { createCheckoutPreference } from "@/lib/payments/create-checkout-preference";
export {
  getCheckoutMode,
  isCheckoutProEnabled,
} from "@/lib/payments/checkout-mode";
export {
  createPaymentSessionRequest,
  processPaymentRequest,
  createCheckoutPreferenceRequest,
} from "@/lib/payments/client";

export { sendOrderAccessEmailIfNeeded } from "@/lib/resend/send-order-access-email";

export {
  getR2Client,
  hasR2Env,
  createPresignedDownloadUrl,
} from "@/lib/r2";
