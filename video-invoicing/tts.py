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
    ("s1", "Hi Amber. Every Monday morning you open QuickBooks and type around fifty invoices by hand. Two hours, every week. Here's how that stops.", "-4%", "+0Hz"),
    ("s2", "Nothing changes for your chefs. They clock in on the Workforce app, pick the client, and put the receipt and the grocery total in the note, exactly like today.", "-3%", "+0Hz"),
    ("s3", "Sunday at seven, once the week's hours are in, the bot reads them from QuickBooks and builds every invoice the way you would. Chef hours to the nearest half hour. Groceries from the chef's note. The twenty-five dollar shopping fee. And the card fee where it applies.", "-4%", "+0Hz"),
    ("s4", "They land in QuickBooks, unsent. Nothing goes to a client until you say so.", "-5%", "+0Hz"),
    ("s5", "Monday, your app shows what's ready and what needs a look: a note with no grocery amount, a note with two. You check those few, then select all and send. Minutes, not two hours.", "-3%", "+0Hz"),
    ("s6", "We tested it on your real week of October twelfth. Thirty-seven of your forty-three invoices came out identical, to the cent. The other six were small slips the old way let through: a half hour left taxable, a total rounded up, a typo in a grocery amount. And two it flagged for you to check.", "-4%", "+0Hz"),
    ("s7", "Your Mondays, back. The first batch runs Sunday, October twenty-sixth. You review, you send, and we watch the first ones with you.", "-5%", "+0Hz"),
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
            if os.path.getsize(out) > 1000 and len(words) >= expected * 0.8:
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
