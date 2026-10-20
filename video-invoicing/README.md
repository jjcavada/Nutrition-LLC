# NI weekly invoicing explainer (video for Amber)

Built 2026-10-20 with the hub's `video-motion` pipeline (Remotion + Edge TTS, house style v2), cloned from the
Uni K Wax board video (`clients/Uni-K-Wax/build/video/`). 89 s, 1920x1080, narrated (en-US-AvaMultilingualNeural),
music bed "Inspired" by Kevin MacLeod (CC BY 4.0, credited on the end card). Brand tokens are the NI Today app's
`:root` (cream paper, dark olive ink, sage accent, Fraunces display + Figtree body), logo from the website.

Scenes (one protagonist: a sage dot = one invoice, performing every cut):
1. `s1` ink: Monday by hand, 43 invoices, the clock, "Two hours. Every week."
2. `s2` paper: nothing changes for the chefs (Workforce timesheet illustration, real Oct 12 entry).
3. `s3` ink: Sunday 7 pm, the bot builds the invoice the way she would (real dry-run invoice, Brooke P., $490.30).
4. `s4` olive: unsent, nothing goes out until she says so.
5. `s5` paper: Monday in the app, what needs a look (real dry run: 43 invoices, $23,039.11, 2 flagged), select all + send.
6. `s6` ink: the test, 37 of 43 identical, the six slips, the two flags.
7. `s7` paper: your Mondays back, first batch Sunday Oct 26, 7 pm.

Every number on screen comes from `../DRYRUN_invoices_2026-10-12_to_17.md` (QuickBooks read only, Oct 20, 2026) or
Amber's own words (voice notes, Oct 19); each scene's footnote names the source. Illustrations (the Workforce screen,
the QuickBooks list) are labelled as such.

## Regenerate
```
# narration (Python 3.11 venv of the video-learn skill; edge-tts installed there)
"C:/Users/JJ/OneDrive/Documents/Claude/Projects/JJ Work/.claude/skills/video-learn/.venv/Scripts/python.exe" tts.py [--only s6]
node cues.js            # every wordFrame() cue resolves to one word (or carries nth)
node frames.js          # scene frame map for the storyboard
npx remotion still src/index.ts Main out/sb/s3_end.png --frame=1153
npx remotion render src/index.ts Main out/v1.mp4 --concurrency=4 --crf 23
py -3 master.py out/v1.mp4 out/NI_invoicing_explainer_v1.mp4      # -10.5 LUFS, limiter -1 dBFS
ffmpeg -i out/NI_invoicing_explainer_v1.mp4 -vf "fps=1/3,scale=480:-1,tile=6x5" out/contact.png
```
`npm install` first (remotion 4.0.536, react 19). Fonts are local woff2 in `public/fonts/` (Google css2 pulled with a
browser UA, latin subset). `out/`, `node_modules/`, the narration clips, the music bed (copy `bed.mp3` + `LICENSE.txt` from the UKW video project into `public/music/`) and the delivered MP4 are git-ignored; the MP4 lives next to this file and in Jay's chat with Amber.
