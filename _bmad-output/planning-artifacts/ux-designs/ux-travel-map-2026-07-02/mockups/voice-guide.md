# Mapsake 語感 Voice Guide — DRAFT for Simon's arbitration

> FR28 gate: no screens are written before this guide is approved. Every zh-TW line below is a
> CANDIDATE until Simon blesses it. Simon is the arbiter; this document records his register, not mine.
> Sources: Simon's approved reference line, his v1 copy edits (2026-06-27), the LINE (TW) register
> he named as the anchor, and the anti-translationese tells he has flagged twice.

## 1. The reference tone (approved)

> **「開啟通知，重溫你的旅行」** — Simon, approved 2026-07-02.

What it teaches:
- **Imperative + benefit**, not a question. (My drafts were all 「要不要…嗎？」soft questions; his rewrite wasn't.)
- **4+4 rhythm** — compact, balanced, reads in one breath.
- **重溫** is the product's core verb: revisit-and-savor. Not 回顧 (report-flavored), not 查看 (utilitarian).

## 2. Register

- **Warm, plain, spoken Taiwan Mandarin** — the register of a good LINE message from a thoughtful friend: friendly without being cutesy, polite without 敬語 stiffness.
- **你, never 您.** A keepsake is intimate; 您 belongs to banks.
- Sentence-final particles (吧/囉/呢) sparingly — one per screen at most, only where softness is needed. LINE uses them lightly; overuse reads as customer-service chirp.
- Numbers and dates read the spoken way: 「3 年前的今天」, 「第 2 次來到」.
- No exclamation marks except genuine celebration (the save moment can carry one; errors never do).

## 3. Vocabulary — the product's words (ARBITRATED by Simon, 2026-07-08)

**Master principle (from Simon's four picks): the poetry lives in the positioning, not the UI.** 時光膠囊/封存-register is for the App Store page and brand moments; every in-app surface speaks plain, light, factual-warm Taiwan Mandarin. When in doubt, pick the lighter word.

| Concept | APPROVED | Rejected (and why it matters) | Usage |
|---|---|---|---|
| The logging/capture verb | **記錄** (Simon's word, prototype round 1) | 封存 (ceremonial), 記下 (his initial pick, superseded by his own button rewrites) | 「記錄下個地點」「不加照片，直接記錄」「你記錄了 5 個地點」 |
| Choosing the place | **選擇地點** | 在這裡記下回憶 (too wordy for a button) | The fine-tune confirm button |
| Photo action | **上傳** | 記下/加 for photos | 「下一步：上傳照片」「上傳（3 張照片）」— the button names the concrete act |
| The app's promise verb | **重溫** | — | Reference line's verb; re-live surfaces only |
| A memory | 回憶 | — | v1-established |
| A visit | **第 N 次** (pure counter) | 旅程, 造訪 | Context-scoped: pin/re-live surfaces yes; **NOT in the recap rows** (Simon: clutter there) |
| Save success | **已儲存** — everywhere | 已封存 | The save ANIMATION carries the ritual feeling, not the copy |
| The map surface | 地圖 | — | plain |
| The re-live moment | 「N 年前的今天」 | — | v1-established |
| A place (the noun, everywhere) | **地點** (Simon, round 2) | 地方 (v1's word — superseded) | 去過的地點 / 靜音的地點 / 記錄下個地點 — ONE noun app-wide, consistent with 選擇地點 |
| Browse-all surface | 去過的地點 | 我的足跡 (category jargon) | v1's 去過的地方 updated to the 地點 noun |
| Date question | **「哪一天去的呢？」** (Simon's line) | 這是哪一天的回憶？ (memory-poetry again) | Casual spoken; one 呢 is the guide's particle budget for that screen |

**Round-1 prototype lessons (Simon's corrections, binding):**
- **Buttons name the concrete action** — 選擇地點 / 上傳 / 記錄, never abstractions or sentence-buttons.
- **No reassurance copy where a function belongs**: the 「建議而已…」 line was replaced by an actual ＋其他照片 tile (pick beyond the suggestions). If the user might want to do something, give them the control, not a caption.
- **One skip affordance per screen** (先不填 chip removed; 略過 button suffices).
- **No jargon leaks**: 反查地址 ("reverse geocode") meant nothing to the arbiter — internal terms never surface.

## 4. Sentence patterns by moment

- **Invitations (buttons/CTAs):** imperative + benefit. 「開啟通知，重溫你的旅行」 「記錄下個地點」. Never 「您是否希望…」.
- **Confirmations (after an action):** short state. 「已儲存」 — one word, everywhere. The recap leads factual-warm with Simon's own pattern: 「你記錄了 N 個地點」.
- **Empty states:** an invitation, not an apology. v1's model line, with the v2 noun: 「輕觸地圖上你去過的地點，就會出現在這裡。」
- **Errors:** calm, blame-free, next-step-first. v1's register stands: 「這次沒能開啟，稍後再試一次。」 No 錯誤/失敗 nouns on user-facing surfaces.
- **Permissions pre-prompts:** context + benefit, one line, then the OS speaks. Reference line is the template.
- **Destructive confirms:** name the thing, state the consequence plainly, no guilt. v1: 「刪除「{name}」這個回憶？…此動作無法復原。」 stands.

## 5. The don'ts (Simon-flagged translationese tells)

- ❌ 「登入以在不同裝置保存」 — "in order to" syntax. → 「登入後，你的地圖就能跨裝置保存。」
- ❌ 「想讓這個回憶明年回來找你嗎？」 — English metaphor transliterated ("come back to find you").
- ❌ 「查收你的信箱」 「與其照片」 — business-letter register in a keepsake app.
- ❌ Soft-question CTAs 「要不要…？」 where an imperative belongs.
- ❌ 「已達…上限」-style system-speak. → 「每個地點最多 N 張」.
- ❌ Any line that reads like it was written in English first. The test: would LINE ship it?

## 6. Approval state — GUIDE LOCKED (2026-07-08)

- Approved: 「開啟通知，重溫你的旅行」 (reference tone); the v1 copy polished by Simon (2026-06-27) as baseline; the §3 vocabulary table (all four arbitrations resolved 2026-07-08).
- Standing rule for all future copy: draft against this guide, Simon reviews before implementation (PRD FR28). New screens' copy ships as candidates in mockups, marked until blessed.
- **The calibration lesson recorded:** Simon consistently rejected poetic register for UI surfaces (封存/已封存/都收好了 all declined for lighter alternatives). The FR10 save animation carries the ritual emotion; the words stay plain.
