# instadupe — handoff notes

A **fake Instagram profile builder** (a prank / mockup tool). You edit a
convincing Instagram profile and it saves to the browser. Everything lives in
**one self-contained file: `instadupe/index.html`** (HTML + inline CSS + inline
JS, no build step, no dependencies).

Assets in this folder: `avatar.jpg`, `illustration.png` + `illustration2.png`
(the two "create your first post" illustrations, transparent bg), `icon.jpg` /
`icon.png` (home-screen app icon).

## Deploy workflow (important)
- The live site is **GitHub Pages, deployed from `master`** (see
  `.github/workflows/deploy.yml`). Changes only go live once merged to `master`.
- Dev branch: `claude/insta-prank-dupe-editor-a4cug5`.
- Flow used every time: commit to the dev branch → `git checkout master` →
  `git merge --ff-only <branch>` → `git push origin master` → checkout back to
  the dev branch. (Pages rebuilds in ~1–2 min; user pulls-to-refresh in the app.)
- It's a home-screen web app, so iOS caches hard — pull-to-refresh reloads it.

## Data model (all localStorage)
- `instadupe_profile` — {username, displayName, note, bio, followers, following,
  avatarUrl, dmBadge}. (Display name & note text are the user's to fill in.)
- `instadupe_highlights` — [{imgUrl, name}] (name is emoji or text).
- Content collections: `instadupe_posts`, `instadupe_videos`,
  `instadupe_reposts`, `instadupe_mentions` — each an array of cropped image
  dataURLs. In JS these live in the `collections` object.
- `instadupe_presets` — [{name, profile, highlights, collections}]. A preset is
  a full snapshot; save/load/delete via the modal opened by the header
  username / lock / chevron.

## Key features & where they are (all in index.html)
- **Profile edit**: "Edit profile" button → `#modal` (`showModal` /
  `saveProfileFromModal`). Also `resetProfile` and `resetEverything`.
- **Presets**: `openPresets`, `saveCurrentAsPreset`, `loadPreset`, `deletePreset`.
- **Interactive tabs**: Posts / Videos / Reposts / Mentions. `switchTab`,
  `renderContent`. Active icon is the filled (`.ic-filled`) variant; inactive is
  outline (`.ic-outline`). Reposts tab only appears when
  `collections.reposts.length > 0`.
- **+ create menu**: header `+` opens `#create-sheet` bottom sheet (Post, Reel,
  Repost, Highlight, Mention) → `createFromMenu` → `openImport(tab)` or the
  highlight modal.
- **Import + cropper**: all imports go through the shared drag-to-frame cropper
  (`#cropper`). `cropMode` ∈ avatar | highlight | content; `cropAspect` = 1
  (circle), 3/4 (posts/reposts/mentions), or 9/16 (videos). Multiple files are
  cropped one-by-one (`importQueue`, `cropNextImport`). Output capped at 1080px.
- **Highlights**: `renderHighlights`, `openNewHighlightModal` /
  `openEditHighlightModal`. Covers have a grey ring + gap (`.circle.filled`).
- **Drag-to-reorder**: long-press a tile or highlight, then drag (`enableReorder`,
  wired for `#content-grid` and `#highlights-row`).
- **Tab underline**: single sliding bar `#tab-underline` (`positionUnderline`).
  Per-tab widths `UNDERLINE_W = {posts:50, videos:80, reposts:64, mentions:64}`,
  centered on the **icon glyph** (first svg of the active icon, so the videos
  dropdown chevron doesn't offset it). Slide duration scales with
  `sqrt(distance)`, ease `cubic-bezier(0.35,0,0.15,1)`, width morphs too.
- **Empty states** are raw (no buttons) except Posts, which keeps a "Create"
  button.
- **Palette** is deliberately blue-tinted to match real IG dark mode:
  `--bg:#0c0f14`, `--btn:#2b2f35` (do NOT change to pure black/neutral grey —
  verified against screenshots).

## Testing
No test framework in-repo. Verify by driving the page with Playwright:
`/opt/node22/lib/node_modules/playwright` (chromium is pre-installed; do not run
`playwright install`). Render at **viewport 402×874, deviceScaleFactor 3** to
match the phone (→ 1206px-wide screenshots, same scale as the user's shots).
Import flow in tests: click the trigger → `waitForEvent('filechooser')` →
`setFiles` → wait for `#cropper:not(.hidden)` → click `#cropper .use`.

## Style of work the user likes
Match real Instagram *exactly* — they send screenshots; measure them (e.g. with
PIL) rather than eyeballing, and match pixel values. Commit + deploy each change.
