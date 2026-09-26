/**
 * Renders every giving email template into a single preview HTML page.
 *
 *   npx tsx scripts/render-email-preview.ts
 *
 * Then open public/email-preview.html in a browser (or visit /email-preview.html
 * while `next dev` is running).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PaymentMethod } from "@prisma/client";
import { allGivingEmailPreviews } from "../lib/email/giving-templates";

process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

const sample = {
  donorName: "Aoife Murphy",
  donorEmail: "aoife@example.com",
  amountPence: 5000,
  giftAid: true,
  isRecurring: false,
  paymentMethod: PaymentMethod.CARD,
  potTitle: "Restore 5 Paulett",
  potSlug: "example-pot",
  message:
    "Sat under that rose window as a teenager. Glad to put something toward getting the light back in.",
};

const previews = allGivingEmailPreviews(sample);

const nav = previews
  .map(
    (item, index) => `
    <button type="button" class="nav-btn${index === 0 ? " active" : ""}" data-target="${item.id}">
      <span class="nav-index">${String(index + 1).padStart(2, "0")}</span>
      <span class="nav-label">${item.label}</span>
      <span class="nav-subject">${escape(item.subject)}</span>
    </button>`,
  )
  .join("");

const panels = previews
  .map(
    (item, index) => `
    <section class="panel${index === 0 ? " active" : ""}" id="panel-${item.id}"${index === 0 ? "" : " hidden"}>
      <header class="panel-head">
        <div>
          <p class="kicker">${escape(item.label)}</p>
          <h2>${escape(item.subject)}</h2>
        </div>
        <p class="hint">Sample data · Aoife · £50 · Gift Aid · pot gift</p>
      </header>
      <div class="frame-wrap">
        <iframe title="${escape(item.label)}" srcdoc="${escapeAttr(item.html)}"></iframe>
      </div>
    </section>`,
  )
  .join("");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Giving email previews · Restore 5 Paulett</title>
  <style>
    :root {
      --navy: #0c1b33;
      --gold: #c9a84c;
      --cream: #f7f3ea;
      --parchment: #e6dfd0;
      --muted: #6a7380;
      --line: rgba(12, 27, 51, 0.12);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; }
    body {
      font-family: "Segoe UI", system-ui, Arial, sans-serif;
      background: var(--parchment);
      color: var(--navy);
      display: grid;
      grid-template-columns: minmax(240px, 300px) 1fr;
      min-height: 100vh;
    }
    aside {
      background: var(--navy);
      color: var(--cream);
      padding: 28px 18px 24px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-right: 1px solid rgba(201, 168, 76, 0.25);
    }
    .brand {
      padding: 0 10px 8px;
      border-bottom: 1px solid rgba(247, 243, 234, 0.1);
    }
    .brand p {
      margin: 0 0 6px;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: var(--gold);
    }
    .brand h1 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.35rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .brand .sub {
      margin-top: 8px;
      font-size: 0.78rem;
      line-height: 1.45;
      color: rgba(247, 243, 234, 0.55);
    }
    nav {
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: auto;
      flex: 1;
      padding-right: 4px;
    }
    .nav-btn {
      appearance: none;
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      text-align: left;
      padding: 12px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: grid;
      grid-template-columns: auto 1fr;
      grid-template-rows: auto auto;
      column-gap: 10px;
      row-gap: 4px;
      transition: background 160ms ease, border-color 160ms ease;
    }
    .nav-btn:hover { background: rgba(247, 243, 234, 0.06); }
    .nav-btn.active {
      background: rgba(201, 168, 76, 0.12);
      border-color: rgba(201, 168, 76, 0.45);
    }
    .nav-index {
      grid-row: 1 / span 2;
      align-self: start;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--gold);
      padding-top: 2px;
    }
    .nav-label {
      font-size: 0.86rem;
      font-weight: 650;
    }
    .nav-subject {
      grid-column: 2;
      font-size: 0.72rem;
      line-height: 1.35;
      color: rgba(247, 243, 234, 0.5);
    }
    .regen {
      margin-top: auto;
      padding: 12px;
      border-radius: 8px;
      background: rgba(247, 243, 234, 0.05);
      font-size: 0.72rem;
      line-height: 1.45;
      color: rgba(247, 243, 234, 0.55);
    }
    .regen code {
      color: var(--gold);
      font-size: 0.68rem;
    }
    main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      min-height: 100vh;
    }
    .panel { display: none; flex: 1; flex-direction: column; min-height: 0; }
    .panel.active { display: flex; }
    .panel-head {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
      align-items: end;
      padding: 22px 28px 16px;
      border-bottom: 1px solid var(--line);
      background: rgba(247, 243, 234, 0.65);
    }
    .kicker {
      margin: 0 0 4px;
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: var(--gold);
    }
    .panel-head h2 {
      margin: 0;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 1.25rem;
      font-weight: 600;
      max-width: 40rem;
      line-height: 1.3;
    }
    .hint {
      margin: 0;
      font-size: 0.78rem;
      color: var(--muted);
    }
    .frame-wrap {
      flex: 1;
      min-height: 0;
      padding: 20px 20px 28px;
    }
    iframe {
      width: 100%;
      height: calc(100vh - 140px);
      min-height: 640px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      box-shadow: 0 18px 50px rgba(12, 27, 51, 0.1);
    }
    @media (max-width: 860px) {
      body { grid-template-columns: 1fr; }
      aside { max-height: none; }
      iframe { height: 70vh; min-height: 520px; }
    }
  </style>
</head>
<body>
  <aside>
    <div class="brand">
      <p>Developer preview</p>
      <h1>Giving emails</h1>
      <p class="sub">Every payment email a giver can receive — rendered from the live templates.</p>
    </div>
    <nav aria-label="Email templates">
      ${nav}
    </nav>
    <div class="regen">
      Regenerate after template edits:<br />
      <code>npx tsx scripts/render-email-preview.ts</code>
    </div>
  </aside>
  <main>
    ${panels}
  </main>
  <script>
    const buttons = [...document.querySelectorAll(".nav-btn")];
    const panels = [...document.querySelectorAll(".panel")];
    function show(id) {
      buttons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === id));
      panels.forEach((panel) => {
        const on = panel.id === "panel-" + id;
        panel.classList.toggle("active", on);
        panel.hidden = !on;
      });
      history.replaceState(null, "", "#" + id);
    }
    buttons.forEach((btn) => btn.addEventListener("click", () => show(btn.dataset.target)));
    const fromHash = location.hash.replace(/^#/, "");
    if (fromHash && document.getElementById("panel-" + fromHash)) show(fromHash);
  </script>
</body>
</html>
`;

function escape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string) {
  return escape(value).replace(/'/g, "&#39;");
}

const out = join(process.cwd(), "public", "email-preview.html");
writeFileSync(out, html, "utf8");
console.log(`Wrote ${out} (${previews.length} templates)`);
