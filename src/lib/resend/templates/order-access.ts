export type OrderAccessEmailContentInput = {
  customerName: string;
  productNames: string[];
  libraryUrl: string;
  orderIdShort: string;
};

export type OrderAccessEmailContent = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Conteúdo do e-mail de acesso pós-compra.
 */
export function buildOrderAccessEmailContent(
  input: OrderAccessEmailContentInput
): OrderAccessEmailContent {
  const productsListHtml = input.productNames
    .map((name) => `<li style="margin:0 0 6px;">${escapeHtml(name)}</li>`)
    .join("");
  const productsListText = input.productNames
    .map((name) => `- ${name}`)
    .join("\n");

  const subject = "Sua compra na Criativarts foi confirmada";

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
                <h1 style="margin:12px 0 0;font-size:26px;line-height:1.25;font-weight:normal;">Compra confirmada</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 28px 24px;">
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                  Olá, ${escapeHtml(input.customerName)} —
                </p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">
                  Seu pagamento foi aprovado e os produtos abaixo já estão liberados na sua biblioteca.
                </p>
                <ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:1.5;">
                  ${productsListHtml}
                </ul>
                <p style="margin:0 0 28px;">
                  <a href="${escapeHtml(input.libraryUrl)}"
                     style="display:inline-block;background:#1a1a1a;color:#fffaf5;text-decoration:none;padding:12px 20px;font-size:15px;">
                    Acessar minha biblioteca
                  </a>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.45;color:#6b635a;">
                  Pedido ${escapeHtml(input.orderIdShort)} · Se o botão não funcionar, use:
                  <br />
                  <a href="${escapeHtml(input.libraryUrl)}" style="color:#6b635a;">${escapeHtml(input.libraryUrl)}</a>
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
    "Criativarts — Compra confirmada",
    "",
    `Olá, ${input.customerName} —`,
    "",
    "Seu pagamento foi aprovado e os produtos abaixo já estão liberados na sua biblioteca:",
    productsListText,
    "",
    `Acesse sua biblioteca: ${input.libraryUrl}`,
    "",
    `Pedido ${input.orderIdShort}`,
  ].join("\n");

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
