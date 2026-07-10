# whatsdupe — handoff notes

A **fake WhatsApp (iOS dark mode) builder** — the sibling of `instadupe/`. A
prank / mockup tool: you edit convincing Chats, Calls, Updates, Communities and
You screens and everything saves to the browser. All in **one self-contained
file: `whatsdupe/index.html`** (HTML + inline CSS + inline JS, no build step,
no dependencies). `icon.png` is the home-screen app icon (WhatsApp-style,
generated from SVG).

## Deploy workflow (same as instadupe)
- Live site is **GitHub Pages, deployed from `master`**
  (`.github/workflows/deploy.yml`).
- Dev branch: `claude/whatsapp-dupe-app-cw90m7`.
- Flow: commit to dev branch → `git checkout master` →
  `git merge --ff-only <branch>` → `git push origin master` → back to dev.
- It's a home-screen web app; iOS caches hard.

## Data model (all localStorage)
- `whatsdupe_profile` — {name, bubble, avatarUrl, tabBadge, archivedCount,
  showArchived}. tabBadge = the green number on the Chats tab (manual, since
  real WhatsApp counts chats not visible here). avatarUrl '' = silhouette.
- `whatsdupe_chats` — [{name, preview, time, unread, ticks, muted, group,
  avatarUrl}]. ticks ∈ none|sent|delivered|read (read = blue ✓✓). group=true
  + no photo → blue-grey group placeholder icon. unread>0 → green time +
  green badge (black text, matches iOS).
- `whatsdupe_calls` — [{name, type, date, avatarUrl}]. type ∈
  outgoing|incoming|missed|focus; missed & focus render the name red
  (focus shows a moon icon, as in the user's screenshots).
- `whatsdupe_presets` — [{name, profile, chats, calls}] full snapshots.

## Editing UX (all in index.html)
- **Tap any chat/call row** → edit modal (also delete). **Green +** on Chats /
  Calls → add-new modal. **Long-press then drag** a row to reorder
  (`enableReorder`, same FLIP implementation as instadupe).
- **••• button** (Chats / Calls / Updates headers) → editor bottom sheet:
  New chat, New call, Edit profile & badges, Presets, How to use, Reset.
- **You tab**: tap name/avatar (or pencil) → profile modal.
- **Photos**: shared drag-to-frame cropper (`#cropper`), square 1:1, output
  capped at 480px JPEG (list avatars are small; keeps localStorage light).
- Screens are plain divs toggled by `switchScreen`; the bottom nav is the
  iOS-26-style floating pill with the active-tab highlight. Meta AI flower
  FAB shows on Chats + Calls only.

## Seeded defaults
Chats/calls ship pre-filled with the rows from the user's real screenshots
(Crocs U10's Soccer, Harbord AL/1 - 2026 [9 unread], U18's T10 Futsal Players,
Tayler Bapstentini, U11 Satellites, Jordan Fuentes; Erin Remblance call run,
etc.) with placeholder avatars — the user imports real photos on-device.
Updates channels (CazéTV / Aussie's only / BBC News) and Communities empty
state are static markup.

## Palette
Pure-black bg `#000` (real iOS WhatsApp dark), cards `#1c1c1e`, grey text
`#8e8e93`, green `#21c063`, read-ticks `#53bdeb`, missed red `#ff453a`.
Green buttons/badges use **black** glyphs/text (current iOS design).

## Testing
Same as instadupe: drive with Playwright from
`/opt/node22/lib/node_modules/playwright`, viewport 402×874,
deviceScaleFactor 3 to match the user's 1206px iPhone screenshots.
Match real WhatsApp *exactly* — measure their screenshots, don't eyeball.
