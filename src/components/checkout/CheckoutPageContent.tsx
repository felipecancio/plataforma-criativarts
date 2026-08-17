"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { getCheckoutMode, isHostedCheckoutMode } from "@/lib/payments/checkout-mode";
import { CheckoutProPanel } from "@/components/checkout/CheckoutProPanel";
import { CheckoutAsaasPanel } from "@/components/checkout/CheckoutAsaasPanel";
import {
  createPaymentSessionRequest,
  type CreatePaymentResponse,
  type ProcessPaymentResponse,
} from "@/lib/payments/client";

const PaymentBrick = dynamic(
  () =>
    import("@/components/checkout/PaymentBrick").then((mod) => mod.PaymentBrick),
  {
    ssr: false,
    loading: () => (
      <div className="checkout-brick-loading" aria-busy="true">
        Carregando checkout seguro…
      </div>
    ),
  }
);

type SessionSuccess = Extract<CreatePaymentResponse, { ok: true }>;

function PaymentResultPanel({
  result,
  onRetry,
}: {
  result: ProcessPaymentResponse;
  onRetry: () => void;
}) {
  if (!result.ok) {
    return (
      <div className="checkout-payment-status is-rejected" role="alert">
        <p className="checkout-payment-status-title">Pagamento não concluído</p>
        <p>{result.message}</p>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (result.status === "approved") {
    return (
      <div className="checkout-payment-status is-approved" role="status">
        <p className="checkout-payment-status-title">Pagamento aprovado</p>
        <p>
          Pagamento {result.paymentId} confirmado no valor de{" "}
          {formatPrice(result.amount)}.
        </p>
        <p className="checkout-payment-status-hint">
          Os produtos já foram liberados na sua biblioteca.
        </p>
        <Link href="/biblioteca" className="btn btn-primary">
          Ir para a biblioteca
        </Link>
      </div>
    );
  }

  if (result.status === "rejected") {
    return (
      <div className="checkout-payment-status is-rejected" role="alert">
        <p className="checkout-payment-status-title">Pagamento recusado</p>
        <p>
          {result.statusDetail
            ? `Motivo: ${result.statusDetail}`
            : "O Mercado Pago recusou esta tentativa. Verifique os dados ou use outro cartão de teste."}
        </p>
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Tentar novamente
        </button>
      </div>
    );
  }

  if (result.status === "in_process") {
    return (
      <div className="checkout-payment-status is-pending" role="status">
        <p className="checkout-payment-status-title">Pagamento em análise</p>
        <p>
          Seu pagamento {result.paymentId} está em processamento. Assim que for
          concluído, o status será atualizado.
        </p>
      </div>
    );
  }

  // pending (PIX / boleto)
  return (
    <div className="checkout-payment-status is-pending" role="status">
      <p className="checkout-payment-status-title">Pagamento pendente</p>
      <p>
        Conclua o pagamento no Mercado Pago
        {result.paymentMethodId ? ` (${result.paymentMethodId})` : ""}.
      </p>

      {result.qrCodeBase64 && (
        <div className="checkout-pix-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${result.qrCodeBase64}`}
            alt="QR Code PIX"
            width={180}
            height={180}
          />
        </div>
      )}

      {result.qrCode && (
        <p className="checkout-pix-copy">
          <span>Copia e cola PIX</span>
          <code>{result.qrCode}</code>
        </p>
      )}

      {result.ticketUrl && (
        <a
          href={result.ticketUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          Abrir comprovante / boleto
        </a>
      )}

      <p className="checkout-payment-status-hint">
        Status: {result.statusDetail ?? "pending_waiting_payment"}
      </p>
    </div>
  );
}

export function CheckoutPageContent() {
  const checkoutMode = getCheckoutMode();
  const isPro = checkoutMode === "pro";
  const isAsaas = checkoutMode === "asaas";
  const isHosted = isHostedCheckoutMode();
  const { cartProducts, itemCount, clearCart } = useCart();
  const router = useRouter();
  const [session, setSession] = useState<SessionSuccess | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(!isHosted);
  const [paymentResult, setPaymentResult] = useState<ProcessPaymentResponse | null>(
    null
  );
  const startedRef = useRef(false);
  const clearedRef = useRef(false);

  useEffect(() => {
    if (itemCount === 0 && !paymentResult && !isHosted) {
      router.replace("/carrinho");
    }
    if (itemCount === 0 && isHosted) {
      router.replace("/carrinho");
    }
  }, [itemCount, paymentResult, router, isHosted]);

  // Brick: cria sessão de pedido no mount (comportamento original).
  useEffect(() => {
    if (isHosted) return;
    if (itemCount === 0 || startedRef.current) return;
    startedRef.current = true;

    const productIds = cartProducts.map((product) => product.id);
    const cacheKey = `criativarts-payment-session:${[...productIds].sort().join(",")}`;

    async function startSession() {
      setLoadingSession(true);
      setSessionError(null);

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached) as SessionSuccess;
          if (parsed?.ok && parsed.orderId && parsed.amount > 0) {
            setSession(parsed);
            setLoadingSession(false);
            return;
          }
        }
      } catch {
        // ignore cache
      }

      const result = await createPaymentSessionRequest(productIds);

      if (!result.ok) {
        if (result.code === "unauthenticated") {
          router.replace(`/entrar?next=${encodeURIComponent("/checkout")}`);
          return;
        }
        setSessionError(result.message);
        setLoadingSession(false);
        return;
      }

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(result));
      } catch {
        // ignore quota
      }

      setSession(result);
      setLoadingSession(false);
    }

    void startSession();
  }, [cartProducts, itemCount, router, isHosted]);

  useEffect(() => {
    if (
      paymentResult?.ok &&
      paymentResult.status === "approved" &&
      !clearedRef.current
    ) {
      clearedRef.current = true;
      clearCart();
      try {
        const keys = Object.keys(sessionStorage).filter((key) =>
          key.startsWith("criativarts-payment-session:")
        );
        keys.forEach((key) => sessionStorage.removeItem(key));
      } catch {
        // ignore
      }
    }
  }, [paymentResult, clearCart]);

  function handleRetry() {
    setPaymentResult(null);
  }

  if (itemCount === 0 && !paymentResult) {
    return (
      <div className="checkout-page">
        <div className="container checkout-empty">
          <p>Seu carrinho está vazio. Redirecionando…</p>
          <Link href="/carrinho" className="btn btn-primary">
            Voltar ao carrinho
          </Link>
        </div>
      </div>
    );
  }

  const cartTotal = cartProducts.reduce((sum, p) => sum + p.price, 0);
  const displayTotal = isHosted ? cartTotal : (session?.amount ?? 0);
  const brickVisible =
    !isHosted && Boolean(session) && !loadingSession && !paymentResult;
  const productIds = cartProducts.map((p) => p.id);

  const headCopy =
    checkoutMode === "asaas"
      ? null
      : checkoutMode === "pro"
        ? "Finalize com o Checkout Pro do Mercado Pago."
        : "Finalize com o checkout seguro do Mercado Pago.";

  return (
    <div className="checkout-page">
      <div className="container">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Início</Link>
          <span>/</span>
          <Link href="/carrinho">Carrinho</Link>
          <span>/</span>
          <span>Pagamento</span>
        </nav>

        <div className="checkout-page-head">
          <h1>Pagamento</h1>
          {headCopy ? <p>{headCopy}</p> : null}
        </div>

        <div className="checkout-layout">
          <div className="checkout-payment-panel">
            <h2>Forma de pagamento</h2>

            {isPro && (
              <CheckoutProPanel
                productIds={productIds}
                displayTotal={displayTotal}
              />
            )}

            {isAsaas && (
              <CheckoutAsaasPanel
                productIds={productIds}
                displayTotal={displayTotal}
              />
            )}

            {!isHosted && loadingSession && (
              <div className="checkout-brick-loading" aria-busy="true">
                Preparando pedido seguro…
              </div>
            )}

            {!isHosted && !loadingSession && sessionError && (
              <div className="checkout-brick-fallback" role="alert">
                <p className="checkout-brick-fallback-title">
                  Não foi possível iniciar o pagamento
                </p>
                <p>{sessionError}</p>
                <Link href="/carrinho" className="btn btn-secondary">
                  Voltar ao carrinho
                </Link>
              </div>
            )}

            {!isHosted && paymentResult && (
              <PaymentResultPanel result={paymentResult} onRetry={handleRetry} />
            )}

            {brickVisible && session && (
              <PaymentBrick
                amount={session.brick.amount}
                orderId={session.orderId}
                externalReference={session.externalReference}
                preferenceId={session.brick.preferenceId}
                onResult={setPaymentResult}
              />
            )}
          </div>

          <aside className="checkout-summary">
            <h2>Resumo do pedido</h2>
            <ul className="checkout-summary-list">
              {(
                (!isHosted ? session?.items : null) ??
                cartProducts.map((p) => ({
                  productId: p.id,
                  name: p.name,
                  slug: p.slug,
                  unitPrice: p.price,
                  quantity: 1,
                }))
              ).map((item) => (
                <li key={item.productId} className="checkout-summary-item">
                  <div className="checkout-summary-media">
                    <Image
                      src={
                        cartProducts.find((p) => p.id === item.productId)?.image ??
                        "/products/animes.webp"
                      }
                      alt={item.name}
                      width={64}
                      height={64}
                    />
                  </div>
                  <div className="checkout-summary-info">
                    <span>{item.name}</span>
                    <strong>{formatPrice(item.unitPrice)}</strong>
                  </div>
                </li>
              ))}
            </ul>
            <div className="checkout-summary-total">
              <span>Total</span>
              <strong>
                {isHosted || session ? formatPrice(displayTotal) : "—"}
              </strong>
            </div>
            <p className="checkout-summary-note">
              {checkoutMode === "asaas"
                ? "O valor será confirmado novamente no checkout da etapa seguinte."
                : checkoutMode === "pro"
                  ? "Valores confirmados no servidor ao criar a Preference."
                  : "Valores confirmados no servidor. Pagamentos via Mercado Pago Checkout Bricks."}
            </p>
            {!isHosted &&
              !(paymentResult?.ok && paymentResult.status === "approved") && (
                <Link href="/carrinho" className="btn btn-secondary btn-block">
                  Voltar ao carrinho
                </Link>
              )}
          </aside>
        </div>
      </div>
    </div>
  );
}
