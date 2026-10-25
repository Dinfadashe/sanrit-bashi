/**
 * Escapes text for safe inclusion in HTML. Anything a user (or admin) typed
 * — names, rejection reasons — must go through this before being placed in
 * an email. Without it, someone could register with a "name" containing
 * HTML and have a convincing, phishing-ready email delivered, from our real
 * sending domain, to ANY address they choose.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function emailLayout({ title, bodyHtml }: { title: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:#1a56c4;padding:24px 32px;">
                <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">SANRIT<span style="color:#a3e635;">BASHI</span></span>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;background:#f1f5f9;">
                <p style="margin:0;font-size:12px;color:#64748b;">SANRIT BASHI — a product of SANRIT Business Consult.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
