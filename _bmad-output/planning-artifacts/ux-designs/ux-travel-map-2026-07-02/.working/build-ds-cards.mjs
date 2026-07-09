// Split the 14-frame prototype into self-contained Claude Design preview cards.
// Each card: <!-- @dsCard group="…" --> first line, shared styles, ONE screen forced visible,
// no phone chrome (the card IS the 390pt viewport).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "..", "mockups", "capture-flow-prototype.html"), "utf8");

const style = src.match(/<style>([\s\S]*?)<\/style>/)[1];
const fonts = src.match(/<link href="https:\/\/fonts[^>]+>/)[0];

const screens = {
  home:      { name: "地圖（首頁）",       group: "Screens · Core",     sub: "Region-count clusters · search pill · tab bar" },
  places:    { name: "去過的地點",         group: "Screens · Core",     sub: "Geographic hierarchy: continent → country → region" },
  settings:  { name: "設定",               group: "Screens · Core",     sub: "Profile · notifications · map · data · FR26/FR30" },
  search:    { name: "搜尋地點",           group: "Screens · Capture",  sub: "Names + pasted addresses · visited hints" },
  finetune:  { name: "確認位置",           group: "Screens · Capture",  sub: "Draggable fine-tune pin · address preview · 選擇地點" },
  date:      { name: "哪一天去的呢",       group: "Screens · Capture",  sub: "上個地點 + 今天 chips · iOS wheel" },
  photos:    { name: "上傳照片",           group: "Screens · Capture",  sub: "Date-suggested grid · ＋其他照片 tile" },
  saved:     { name: "儲存瞬間",           group: "Screens · Capture",  sub: "Pin settles + ripple + haptic · 已儲存 · loop choice" },
  recap:     { name: "記錄總結",           group: "Screens · Capture",  sub: "你記錄了 N 個地點 · session payoff" },
  notif:     { name: "鎖定畫面通知",       group: "Screens · Re-live",  sub: "Photo-rich APNs push · the tap-earner (FR14)" },
  relive:    { name: "重溫（著陸）",       group: "Screens · Re-live",  sub: "Glowing pin · that date's visit · N-more chip" },
  notifask:  { name: "通知詢問",           group: "Screens · Re-live",  sub: "Pre-prompt with own-memory preview · 開啟通知，重溫你的旅行" },
  intro:     { name: "開場",               group: "Screens · First-run", sub: "Brand moment — the one poetic surface" },
  signin:    { name: "登入",               group: "Screens · First-run", sub: "Apple / Google / Email · returning-web steering" },
};

const outDir = join(here, "ds-cards", "screens");
mkdirSync(outDir, { recursive: true });

const manifest = [];
for (const [id, meta] of Object.entries(screens)) {
  const re = new RegExp(`<section class="screen[^"]*" id="${id}"[\\s\\S]*?<\\/section>`);
  const m = src.match(re);
  if (!m) { console.error("MISSING section:", id); process.exit(1); }
  const section = m[0].replace(/class="screen[^"]*"/, 'class="screen active"');
  const html = `<!-- @dsCard group="${meta.group}" -->
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mapsake v2 — ${meta.name}</title>
${fonts}
<style>${style}
/* card overrides: the card IS the phone viewport */
body{background:var(--parchment);padding:0;display:block}
.phone{width:100%;height:100vh;border:none;border-radius:0;box-shadow:none}
.kbd{display:none}
</style>
</head>
<body>
<div class="phone">
${section}
</div>
</body>
</html>
`;
  writeFileSync(join(outDir, `${id}.html`), html);
  manifest.push({ id, ...meta });
}
console.log(JSON.stringify(manifest.map(m => m.id)));
console.log(`built ${manifest.length} cards → ds-cards/screens/`);
