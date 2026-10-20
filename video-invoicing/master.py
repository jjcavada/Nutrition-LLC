"""Master a rendered cut for phone and laptop playback. Jay, 2026-10-19: "why is the volume so low?" (-20 LUFS render),
then "louder, still can't hear it" at -14 LUFS. Delivery level is now about -10.5 LUFS integrated with a true-peak
limiter at -1 dBFS: measure the render, apply the gain that lands on the target, limit the peaks, re-measure.
Video stream copied, AAC 192k.
    python3 master.py in.mp4 out.mp4 [target_lufs] [limiter_ceiling 0..1]  (music-only cut: -13 0.75, the bed needs +20 dB and the limiter overshoots at 0.83)
Prints before / after integrated loudness and peak."""
import re, subprocess, sys

src, dst = sys.argv[1], sys.argv[2]
TARGET = float(sys.argv[3]) if len(sys.argv) > 3 else -10.5
LIMIT = float(sys.argv[4]) if len(sys.argv) > 4 else 0.83  # -1.4 dBFS sample ceiling, lands the true peak at about -1 dBTP (v19: 0.891 measured -0.6 dBTP)


def measure(path):
    r = subprocess.run(['ffmpeg', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    i = re.findall(r'I:\s+(-?[0-9.]+) LUFS', r.stderr)[-1]
    p = re.findall(r'Peak:\s+(-?[0-9.]+) dBFS', r.stderr)[-1]
    return float(i), float(p)


before = measure(src)
gain = TARGET - before[0] + 1.0  # the limiter takes about 1 dB back at this level
af = f'volume={gain:.2f}dB,alimiter=limit={LIMIT}:attack=4:release=80:level=false'
subprocess.check_call(['ffmpeg', '-y', '-v', 'error', '-i', src, '-af', af, '-ar', '48000', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', dst])
after = measure(dst)
print(f'{src}: {before[0]:.1f} LUFS / {before[1]:.1f} dBFS  ->  {dst}: {after[0]:.1f} LUFS / {after[1]:.1f} dBFS  (gain {gain:+.1f} dB, limiter -1 dBFS)')
