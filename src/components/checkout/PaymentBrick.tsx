"use client";

import { useEffect, useMemo, useState } from "react";
import { Payment } from "@mercadopago/sdk-react";
import {
  ensureMercadoPagoBrowserSdk,
  hasMercadoPagoPublicKey,
} from "@/lib/mercadopago";
import {
  processPaymentRequest,
  type ProcessPaymentResponse,
} from "@/lib/payments/client";

type BrickErrorLike = {
  type?: "non_critical" | "critical" | string;
  cause?: string;
  message?: string;
};

type PaymentBrickProps = {
  /** Valor oficial recalculado no servidor */
  amount: number;
  orderId: string;
  externalReference: string;
  preferenceId?: string | null;
  onResult?: (result: ProcessPaymentResponse) => void;
};

type LocalPhase = "idle" | "processing";

/**
 * Payment Brick: envia formData para /api/payments/process (SDK Node no servidor).
 */
export function PaymentBrick({
  amount,
  orderId,
  externalReference,
  preferenceId,
  onResult,
}: PaymentBrickProps) {
  const [readySdk, setReadySdk] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [phase, setPhase] = useState<LocalPhase>("idle");

  useEffect(() => {
    try {
      const ok = ensureMercadoPagoBrowserSdk();
      if (!ok) {
        setFatalError(
          "Configure NEXT_PUBLIC_MP_PUBLIC_KEY no .env.local para exibir o Payment Brick."
        );
        return;
      }
      setReadySdk(true);
    } catch (error) {
      setFatalError(
        error instanceof Error ? error.message : "Falha ao iniciar o Mercado Pago."
      );
    }
  }, []);

  const initialization = useMemo(() => {
    const base: { amount: number; preferenceId?: string } = {
      amount: Number(amount.toFixed(2)),
    };
    if (preferenceId) {
      base.preferenceId = preferenceId;
    }
    return base;
  }, [amount, preferenceId]);

  const customization = useMemo(
    () => ({
      paymentMethods: {
        creditCard: "all" as const,
        debitCard: "all" as const,
        ticket: "all" as const,
        bankTransfer: "all" as const,
        ...(preferenceId ? { mercadoPago: "all" as const } : {}),
      },
      visual: {
        style: {
          theme: "default" as const,
        },
      },
    }),
    [preferenceId]
  );

  function handleBrickError(error: BrickErrorLike) {
    console.warn("[MercadoPago] Payment Brick error", error);
    if (error.type !== "critical") return;
    setFatalError(
      error.message ||
        "Não foi possível carregar o Payment Brick. Verifique a Public Key de teste."
    );
  }

  if (fatalError) {
    return (
      <div className="checkout-brick-fallback" role="alert">
        <p className="checkout-brick-fallback-title">Payment Brick indisponível</p>
        <p>{fatalError}</p>
        <p className="checkout-brick-fallback-hint">
          Confira a Public Key de teste no painel Developers e recarregue a página.
        </p>
      </div>
    );
  }

  if (!readySdk || !hasMercadoPagoPublicKey()) {
    return (
      <div className="checkout-brick-loading" aria-busy="true">
        Carregando checkout seguro…
      </div>
    );
  }

  if (amount <= 0 || !orderId) {
    return (
      <div className="checkout-brick-fallback" role="status">
        <p>Pedido inválido para iniciar o pagamento.</p>
      </div>
    );
  }

  return (
    <div className="checkout-brick">
      {phase === "processing" && (
        <div className="checkout-payment-status is-processing" role="status" aria-live="polite">
          <p className="checkout-payment-status-title">Processando pagamento…</p>
          <p>Aguarde a confirmação do Mercado Pago.</p>
        </div>
      )}

      {!brickReady && phase === "idle" && (
        <div className="checkout-brick-loading" aria-busy="true">
          Preparando formulário de pagamento…
        </div>
      )}

      <div className={phase === "processing" ? "checkout-brick-dimmed" : undefined}>
        <Payment
          initialization={initialization}
          customization={customization}
          onReady={() => setBrickReady(true)}
          onError={handleBrickError}
          onSubmit={async ({ formData, selectedPaymentMethod }) => {
            setPhase("processing");

            try {
              const result = await processPaymentRequest({
                orderId,
                formData: formData as unknown as Record<string, unknown>,
                selectedPaymentMethod,
                idempotencyKey: crypto.randomUUID(),
              });

              onResult?.(result);

              if (!result.ok) {
                setPhase("idle");
                return Promise.reject(new Error(result.message));
              }

              // Brick considera submit concluído; UI de status fica no parent.
              setPhase("idle");
              return;
            } catch (error) {
              setPhase("idle");
              onResult?.({
                ok: false,
                code: "network_error",
                message:
                  error instanceof Error
                    ? error.message
                    : "Falha de rede ao processar o pagamento.",
              });
              return Promise.reject(error);
            }
          }}
        />
      </div>

      <p className="checkout-brick-ref">
        Pedido {externalReference.slice(0, 8)}…
      </p>
    </div>
  );
}
