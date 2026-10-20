import vo from '../public/vo/vo.json';

export const FPS = 30;
export const TAIL = 0.6; // seconds of visual hold after the narration ends (Jay: 0.8 s gaps total)
export const LEAD = 0.2; // seconds before the narration starts

type Word = {t: number; d: number; w: string};
/** One audio clip inside a composite scene. `at` is seconds after the scene's LEAD. A `fadeAt` (scene seconds)
 *  starts a linear fade to silence over `fadeLen` seconds (used for the phone call in scene 4). */
export type Part = {file: string; at: number; duration: number; kind: 'vo' | 'call'; fadeAt?: number; fadeLen?: number; silent?: boolean};
// silent: the part also plays in the music-only cut (the real recorded call is evidence, not narration)
/** A spoken line of the call, for caption sync. `t` is seconds after the scene's LEAD. */
export type Line = {who: 'Mia' | 'Guest'; text: string; t: number};
export type Scene = {id: string; file: string; text: string; duration: number; words: Word[]; parts?: Part[]; lines?: Line[]};

export const scenes: Scene[] = (vo as any).scenes;

export const sceneFrames = (s: Scene) => Math.ceil((LEAD + s.duration + TAIL) * FPS);

export const sceneStart = (id: string) => {
  let f = 0;
  for (const s of scenes) {
    if (s.id === id) return f;
    f += sceneFrames(s);
  }
  return f;
};

export const totalFrames = () => scenes.reduce((a, s) => a + sceneFrames(s), 0);

const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, '');

/** Local frame (within the scene) at which a spoken word starts. Falls back to a proportional
 *  estimate when the TTS engine returned no word boundaries. */
export const wordFrame = (s: Scene, word: string, nth = 0): number => {
  const target = norm(word);
  if (s.words && s.words.length) {
    let seen = 0;
    for (const w of s.words) {
      if (norm(w.w).startsWith(target)) {
        if (seen === nth) return Math.round((LEAD + w.t) * FPS);
        seen++;
      }
    }
  }
  // fallback: position of the word in the script text, proportional to duration
  const tokens = s.text.split(/\s+/);
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (norm(tokens[i]).startsWith(target)) {
      if (seen === nth) return Math.round((LEAD + (i / tokens.length) * s.duration) * FPS);
      seen++;
    }
  }
  return Math.round(LEAD * FPS);
};
