import { organisation } from "@/lib/site";
import { appBaseUrl } from "@/lib/email/config";

export const emailColors = {
  navy: "#0c1b33",
  navyDeep: "#07101f",
  gold: "#c9a84c",
  goldLight: "#e0c878",
  cream: "#f7f3ea",
  creamWarm: "#efe8d8",
  parchment: "#e6dfd0",
  muted: "#6a7380",
  ink: "#1a2433",
  white: "#ffffff",
  alert: "#b42318",
  alertSoft: "#f8e8e6",
} as const;

const C = emailColors;

export type EmailTone = "success" | "pending" | "alert" | "neutral" | "soft";

export type EmailShellInput = {
  preheader: string;
  eyebrow: string;
  title: string;
  bodyHtml: string;
  /** Optional callout under the body (amount, pot name, etc.). */
  highlightHtml?: string;
  cta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  footnote?: string;
  tone?: EmailTone;
};

function toneAccent(tone: EmailTone): string {
  switch (tone) {
    case "success":
      return C.gold;
    case "pending":
      return "#8a9bb0";
    case "alert":
      return C.alert;
    case "soft":
      return C.goldLight;
    default:
      return C.gold;
  }
}

/**
 * Shared branded shell for giver emails — table-based for Outlook,
 * navy/gold/cream for PVN. Inline styles only.
 */
export function emailShell(input: EmailShellInput): string {
  const base = appBaseUrl();
  const year = new Date().getFullYear();
  const address = organisation.addressLines.join(" · ");
  const tone = input.tone ?? "neutral";
  const accent = toneAccent(tone);

  const highlight = input.highlightHtml
    ? `
      <tr>
        <td style="padding:8px 32px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;background:${C.navyDeep};border-radius:8px;overflow:hidden;">
            <tr>
              <td style="width:5px;background:${accent};font-size:0;line-height:0;">&nbsp;</td>
              <td style="padding:26px 28px;font-family:Georgia,'Times New Roman',serif;color:${C.cream};font-size:16px;line-height:1.5;">
                ${input.highlightHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    : "";

  const ctaRow =
    input.cta || input.secondaryCta
      ? `
      <tr>
        <td style="padding:4px 32px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              ${
                input.cta
                  ? `<td style="padding:0 10px 8px 0;">
                      <a href="${escapeAttr(input.cta.href)}" style="display:inline-block;background:${C.gold};color:${C.navy};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:15px 24px;border-radius:5px;box-shadow:0 10px 24px rgba(201,168,76,0.28);">
                        ${escapeHtml(input.cta.label)}
                      </a>
                    </td>`
                  : ""
              }
              ${
                input.secondaryCta
                  ? `<td style="padding:0 0 8px 0;">
                      <a href="${escapeAttr(input.secondaryCta.href)}" style="display:inline-block;border:1.5px solid rgba(12,27,51,0.18);color:${C.navy};font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;text-decoration:none;padding:14px 22px;border-radius:5px;background:${C.white};">
                        ${escapeHtml(input.secondaryCta.label)}
                      </a>
                    </td>`
                  : ""
              }
            </tr>
          </table>
        </td>
      </tr>`
      : "";

  const footnote = input.footnote
    ? `<p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:rgba(247,243,234,0.55);">${input.footnote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${C.parchment};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(input.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.parchment};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;border-collapse:separate;">
          <!-- Masthead -->
          <tr>
            <td align="center" style="padding:0 0 18px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:0 10px;font-size:0;line-height:0;">
                    <span style="display:inline-block;width:7px;height:7px;background:${C.gold};transform:rotate(45deg);"></span>
                  </td>
                  <td style="font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:${C.navy};">
                    Restore 5 Paulett Av
                  </td>
                  <td style="padding:0 10px;font-size:0;line-height:0;">
                    <span style="display:inline-block;width:7px;height:7px;background:${C.gold};transform:rotate(45deg);"></span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:${C.cream};border-radius:10px;overflow:hidden;box-shadow:0 28px 64px rgba(12,27,51,0.14);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <!-- Gold rule -->
                <tr>
                  <td style="height:4px;background:linear-gradient(90deg,${C.gold} 0%,${C.goldLight} 50%,${C.gold} 100%);background:${C.gold};font-size:0;line-height:0;">&nbsp;</td>
                </tr>

                <!-- Brand banner -->
                <tr>
                  <td style="background:${C.navy};padding:0;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:30px 32px 26px;">
                          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.24em;text-transform:uppercase;color:${C.gold};">
                            Place of Victory · Belfast
                          </p>
                          <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;color:${C.cream};font-weight:600;">
                            ${escapeHtml(organisation.shortName)}
                          </p>
                        </td>
                        <td align="right" valign="middle" style="padding:30px 28px 26px 0;width:72px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" style="width:52px;height:52px;border:1px solid rgba(201,168,76,0.45);border-radius:50%;">
                            <tr>
                              <td align="center" valign="middle" style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:${C.gold};line-height:1;">
                                5
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="height:1px;background:rgba(201,168,76,0.22);font-size:0;line-height:0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding:14px 32px;background:${C.navyDeep};">
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${accent};">
                            ${escapeHtml(input.eyebrow)}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:36px 32px 12px;background:${C.cream};">
                    <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.18;font-weight:600;color:${C.navy};letter-spacing:-0.01em;">
                      ${escapeHtml(input.title)}
                    </h1>
                    <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:${C.ink};">
                      ${input.bodyHtml}
                    </div>
                  </td>
                </tr>

                ${highlight}
                ${ctaRow}

                <!-- Verse -->
                <tr>
                  <td style="padding:0 32px 32px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.creamWarm};border-radius:8px;">
                      <tr>
                        <td style="padding:22px 24px;border-left:3px solid ${C.gold};">
                          <p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.5;font-style:italic;color:${C.navy};">
                            “They shall build the old wastes, they shall raise up the former desolations.”
                          </p>
                          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:${C.muted};">
                            Isaiah 61:4
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background:${C.navy};padding:28px 32px;">
                    ${footnote}
                    <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.4;color:${C.cream};">
                      ${escapeHtml(organisation.legalName)}
                    </p>
                    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:rgba(247,243,234,0.55);">
                      ${escapeHtml(address)}
                    </p>
                    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:rgba(247,243,234,0.45);">
                      <a href="${escapeAttr(base)}" style="color:${C.gold};text-decoration:none;">Open the site</a>
                      &nbsp;·&nbsp;
                      <a href="${escapeAttr(`mailto:${organisation.email}`)}" style="color:${C.gold};text-decoration:none;">${escapeHtml(organisation.email)}</a>
                      &nbsp;·&nbsp;
                      © ${year}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:22px 8px 0;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:${C.muted};">
                One fund. One house. Many stones.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function escapeAttr(value: string): string {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

export function p(text: string): string {
  return `<p style="margin:0 0 16px;">${text}</p>`;
}

/** Quote chip for a giver’s message on the receipt. */
export function quoteBlock(text: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 18px;background:${C.white};border-radius:6px;border:1px solid rgba(12,27,51,0.08);">
      <tr>
        <td style="padding:14px 16px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.55;font-style:italic;color:${C.navy};">
          “${escapeHtml(text)}”
        </td>
      </tr>
    </table>
  `;
}
