export type CheckoutExpiredEmailContentInput = {
  customerName: string;
  cartUrl: string;
  orderIdShort?: string;
};

export type CheckoutExpiredEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * E-mail quando o checkout Asaas expira ou é cancelado.
 */
export function buildCheckoutExpiredEmailContent(
  input: CheckoutExpiredEmailContentInput
): CheckoutExpiredEmailContent {
  const subject = "Seu checkout na Criativarts expirou";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f6f4f1;font-family:Georgia,'Times New Roman',serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f4f1;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#fffaf5;border:1px solid #e8e0d6;">
            <tr>
              <td style="padding:28px 28px 8px;">
                <p style="margin:0;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#8a7a68;">Criativarts</p>
                <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:normal;">Checkout expirado</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                  Olá, ${escapeHtml(input.customerName)} —
                </p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">
                  Seu checkout expirou! Mas calma, seus itens ainda podem estar com os descontos no carrinho:
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(input.cartUrl)}"
                     style="display:inline-block;background:#1a1a1a;color:#fffaf5;text-decoration:none;padding:12px 20px;font-size:15px;">
                    Voltar ao Carrinho
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.45;color:#6b635a;">
                  ${input.orderIdShort ? `Pedido ${escapeHtml(input.orderIdShort)} · ` : ""}Se o botão não funcionar, use:
                  <br />
                  <a href="${escapeHtml(input.cartUrl)}" style="color:#6b635a;">${escapeHtml(input.cartUrl)}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    "Criativarts — Checkout expirado",
    "",
    `Olá, ${input.customerName} —`,
    "",
    "Seu checkout expirou! Mas calma, seus itens ainda podem estar com os descontos no carrinho:",
    input.cartUrl,
    "",
    input.orderIdShort ? `Pedido ${input.orderIdShort}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
