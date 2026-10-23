# NI weekly invoicing explainer (video for Amber)

Built 2026-10-20 with the hub's `video-motion` pipeline (Remotion + Edge TTS, house style v2), cloned from the
Uni K Wax board video (`clients/Uni-K-Wax/build/video/`). 151 s (v3; v2 was 138 s, v1 89 s), 1920x1080, narrated (en-US-AvaMultilingualNeural),
music bed "Inspired" by Kevin MacLeod (CC BY 4.0, credited on the end card). Brand tokens are the NI Today app's
`:root` (cream paper, dark olive ink, sage accent, Fraunces display + Figtree body), logo from the website.

Scenes, v2 (after Jay's review on the first cut: "so the invoice sent right away, where in the app?"), one protagonist (a sage
dot = one invoice) performing every cut:
1. `s1` ink: her Monday by hand, over Amber's OWN screen recording as a tinted plate (`public/broll/`, cut from her Oct 19 WhatsApp
   video), odometer 43, "Two hours. Every week."
2. `s2` paper: the whole loop as a tracked world (camera follows the dot station to station): Workforce app (chefs, like today),
   QuickBooks Time (she approves, like today), the bot (Sunday 7 pm, new), QuickBooks (invoices land unsent, new), NI Today
   (Monday: what needs a look, new), QuickBooks (she sends, like today). Pull-back on "Nothing new to learn. One chore gone."
3. `s3` olive: nothing changes for the chefs (Workforce timesheet illustration, real Oct 12 entry).
4. `s4` ink: Sunday 7 pm, the bot builds the invoice the way she does (real dry-run invoice, Brooke P., $490.30).
5. `s5` olive: regular invoices in QuickBooks, Status "Not sent" (QuickBooks Sales page as an illustration, real rows).
6. `s6` paper: Monday. The REAL NI Today app (Playwright screenshot of the local build with the Oct 12 to 17 dry run, rendered
   in live mode: `shots.cjs` -> `public/shots/`) with sage spots on the count, the flagged rows, the reason and the
   "Open invoices in QuickBooks" button; then the QuickBooks illustration: select all, Batch actions, Send invoices.
   "The app never sends. You do."
7. `s7` ink: the test, 37 of 43 identical, the six slips, the two flags.
8. `s8` olive: Later (Jay, Oct 21): once a few clean weeks are behind us, invoices that line up with nothing flagged can be sent for her; flagged ones still wait. A future step, not built.
9. `s9` paper: your Mondays back, first batch Sunday Oct 26, 7 pm (WRONG WEEKDAY in v3: Oct 26 is a Monday; the real first run is Sunday Oct 25. Fix tts.py s9 + scenes.tsx S9 card before any re-render).

Every number on screen comes from `../DRYRUN_invoices_2026-10-12_to_17.md` (QuickBooks read only, Oct 20, 2026) or
Amber's own words (voice notes, Oct 19); each scene's footnote names the source. Illustrations (the Workforce screen,
the QuickBooks pages) are labelled as such. v1 (7 scenes, no real screens, 89 s) is kept as `NI_invoicing_explainer_v1.mp4`.

## Regenerate
```
# narration (Python 3.11 venv of the video-learn skill; edge-tts installed there)
"C:/Users/JJ/OneDrive/Documents/Claude/Projects/JJ Work/.claude/skills/video-learn/.venv/Scripts/python.exe" tts.py [--only s6]
node cues.js            # every wordFrame() cue resolves to one word (or carries nth)
node frames.js          # scene frame map for the storyboard
npx remotion still src/index.ts Main out/sb/s3_end.png --frame=1153
node shots.cjs          # real app screens (needs the local stub: node scratchpad/guide_stub.mjs, port 8789)
npx remotion render src/index.ts Main out/v3.mp4 --concurrency=4 --crf 23
py -3 master.py out/v3.mp4 NI_invoicing_explainer_v3.mp4      # -10.5 LUFS, limiter -1 dBFS
ffmpeg -i NI_invoicing_explainer_v3.mp4 -vf "fps=1/3,scale=480:-1,tile=6x5" out/contact.png
```
`npm install` first (remotion 4.0.536, react 19). Fonts are local woff2 in `public/fonts/` (Google css2 pulled with a
browser UA, latin subset). `out/`, `node_modules/`, the narration clips, the music bed (copy `bed.mp3` + `LICENSE.txt` from the UKW video project into `public/music/`) and the delivered MP4 are git-ignored; the MP4 lives next to this file and in Jay's chat with Amber.
