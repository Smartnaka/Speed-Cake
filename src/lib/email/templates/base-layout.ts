import { getSiteBaseUrl } from '../client.ts'

export interface BaseLayoutOptions {
  title: string
  previewText?: string
  bodyHtml: string
  storeName?: string
  supportEmail?: string
  supportPhone?: string
  storeAddress?: string
}

export function renderEmailLayout(options: BaseLayoutOptions): string {
  const siteUrl = getSiteBaseUrl()
  const storeName = options.storeName || 'Instant Cakes Delivery'
  const supportEmail = options.supportEmail || 'orders@speedcake.com'
  const storeAddress = options.storeAddress || '14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0; padding: 0; width: 100% !important; min-width: 100%; background-color: #fff9f2; }
    @media only screen and (max-width: 620px) {
      .container-table { width: 100% !important; max-width: 100% !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #fff9f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #352c28; line-height: 1.6;">
  ${options.previewText ? `<div style="display: none; font-size: 1px; color: #fff9f2; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">${escapeHtml(options.previewText)}</div>` : ''}

  <!-- Header Banner -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #6f3d36;">
    <tr>
      <td align="center" style="padding: 10px 16px; font-size: 12px; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase;">
        Handcrafted with care for your sweetest celebrations
      </td>
    </tr>
  </table>

  <!-- Outer wrapper table -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #fff9f2; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container (max 600px) -->
        <table role="presentation" class="container-table" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border: 1px solid #ebdcd3; border-radius: 4px; overflow: hidden; box-shadow: 0 4px 16px rgba(111,61,54,0.06);">
          
          <!-- Brand Logo Header -->
          <tr>
            <td align="center" style="padding: 36px 32px 24px 32px; border-bottom: 1px solid #f2e8e2; background-color: #fdfbf9;">
              <a href="${siteUrl}" target="_blank" style="text-decoration: none;">
                <span style="font-family: Georgia, 'Playfair Display', serif; font-size: 28px; font-weight: normal; letter-spacing: -0.5px; color: #6f3d36;">
                  Instant Cakes Delivery<span style="color: #c28d79;">.</span>
                </span>
              </a>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td class="mobile-padding" style="padding: 36px 36px 40px 36px;">
              ${options.bodyHtml}
            </td>
          </tr>

          <!-- Footer Information -->
          <tr>
            <td style="padding: 28px 36px; background-color: #fbf7f4; border-top: 1px solid #eee4dc; text-align: center; font-size: 12px; color: #756862; line-height: 1.7;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #52443e;">
                ${escapeHtml(storeName)} · Freshly Baked Bespoke Cakes
              </p>
              <p style="margin: 0 0 6px 0;">
                ${escapeHtml(storeAddress)}
              </p>
              <p style="margin: 0 0 12px 0;">
                Questions about your order? Reach us at <a href="mailto:${escapeHtml(supportEmail)}" style="color: #6f3d36; text-decoration: underline;">${escapeHtml(supportEmail)}</a>
              </p>
              <p style="margin: 0; font-size: 11px; color: #9c8e87;">
                © ${new Date().getFullYear()} ${escapeHtml(storeName)}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function escapeHtml(str: string): string {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
