"""Narration-first (video-motion skill): one Edge TTS clip per scene with word boundaries for on-screen sync.
Run from the project root with the hub's Python 3.11 venv:
  "C:/Users/JJ/OneDrive/Documents/Claude/Projects/JJ Work/.claude/skills/video-learn/.venv/Scripts/python.exe" tts.py [--only s1,s3]
Outputs public/vo/<id>.mp3 + public/vo/vo.json: {voice, scenes:[{id, file, text, duration, words:[{t,d,w}]}]}.
Facts in the script are measured (PLAN_weekly-invoicing-automation.md, DRYRUN_invoices_2026-10-12_to_17.md) or Amber's own words
("two hours every Monday"). No em dashes (clean TTS phrasing)."""
import asyncio, json, os, subprocess, sys
import edge_tts

VOICE = os.environ.get("VO_VOICE", "en-US-AvaMultilingualNeural")  # warm, clear; switch to en-US-AndrewNeural for the UKW narrator

# (scene id, narration, rate, pitch)
SCRIPT = [
    ("s1", "Hi Amber. Here's your Monday morning. QuickBooks Time on one side, a blank invoice on the other. Hours, groceries, the shopping fee, the date, review and send. And again. Forty-three times last week. Two hours, every week.", "-4%", "+0Hz"),
    ("s2", "Here's the whole loop, and where every piece lives. Your chefs clock in on the Workforce app, like today. You approve the hours in QuickBooks Time, like today. Sunday at seven, the bot builds the invoices and puts them in QuickBooks, unsent. Monday morning, the NI Today app shows you the week and what needs a look. And you send them, from QuickBooks. Nothing new to learn. One chore gone.", "-3%", "+0Hz"),
    ("s3", "For the chefs, nothing changes. Pick the client, clock in, put the receipt and the grocery total in the note. Exactly like today.", "-3%", "+0Hz"),
    ("s4", "Sunday at seven, once the week's hours are approved, the bot reads them from QuickBooks and builds each invoice the way you do. Hours to the nearest half hour. Groceries from the chef's note. The twenty-five dollar shopping fee. And the three percent card fee, only for your card clients.", "-4%", "+0Hz"),
    ("s5", "They land in QuickBooks as regular invoices, with one difference: not sent. Nothing reaches a client until you say so.", "-5%", "+0Hz"),
    ("s6", "Monday, open NI Today. The Invoices card is right on your home screen: how many, the total, and the few that need a look, with the reason. A note with no grocery amount, for example. Tap Open invoices in QuickBooks, fix those two, then select all, batch actions, send. The app never sends. You do.", "-3%", "+0Hz"),
    ("s7", "We tested it on your real week of October twelfth. Thirty-seven of your forty-three invoices came out identical, to the cent. The other six were small slips the old way let through: a half hour left taxable, a total rounded up, a typo in a grocery amount. And two it flagged for you to check.", "-4%", "+0Hz"),
    ("s8", "And later, once a few clean weeks are behind us, the next step is simple. When every invoice lines up and nothing is flagged, the bot can send them for you. The flagged ones still wait for your eyes.", "-4%", "+0Hz"),
    ("s9", "Your Mondays, back. The first batch builds Sunday, October twenty-sixth, at seven. You review, you send, and we watch the first ones with you.", "-5%", "+0Hz"),
]
VO = "public/vo"


def probe(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path]).decode().strip())


async def speak(out, text, voice, rate, pitch, tries=4):
    """Edge TTS drops a stream now and then (NoAudioReceived); retry a few times before giving up."""
    last = None
    for attempt in range(tries):
        words = []
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
            with open(out, "wb") as f:
                async for chunk in comm.stream():
                    if chunk["type"] == "audio":
                        f.write(chunk["data"])
                    elif chunk["type"] == "WordBoundary":
                        words.append({"t": round(chunk["offset"] / 1e7, 3), "d": round(chunk["duration"] / 1e7, 3), "w": chunk["text"]})
            expected = len(text.split())
            if os.path.getsize(out) > 1000 and len(words) >= expected * 0.95:
                return words
            last = RuntimeError(f"truncated stream: {len(words)} of ~{expected} words")
            print(f"  retry {attempt + 1}: {last}")
        except Exception as e:  # noqa: BLE001
            last = e
            print(f"  retry {attempt + 1}: {type(e).__name__}")
            await asyncio.sleep(1.5 * (attempt + 1))
    raise last


async def main():
    os.makedirs(VO, exist_ok=True)
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    old = {}
    if os.path.exists(f"{VO}/vo.json"):
        old = {s["id"]: s for s in json.load(open(f"{VO}/vo.json", encoding="utf-8"))["scenes"]}
    scenes = []
    for sid, text, rate, pitch in SCRIPT:
        if only and sid not in only and sid in old:
            scenes.append(old[sid]); continue
        out = f"{VO}/{sid}.mp3"
        words = await speak(out, text, VOICE, rate, pitch)
        d = probe(out)
        scenes.append({"id": sid, "file": f"vo/{sid}.mp3", "text": text, "duration": round(d, 3), "words": words})
        print(f"{sid}: {d:.1f}s, {len(words)} words")
    json.dump({"voice": VOICE, "scenes": scenes}, open(f"{VO}/vo.json", "w", encoding="utf-8"), indent=1)
    print("TOTAL narration: %.1f s" % sum(s["duration"] for s in scenes))

asyncio.run(main())
