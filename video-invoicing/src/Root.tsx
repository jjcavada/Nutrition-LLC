import React from 'react';
import {AbsoluteFill, Composition, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {ensureFonts} from './fonts';
import {FPS, LEAD, sceneFrames, scenes, totalFrames} from './timing';
import {S1, S2, S3, S4, S5, S6, S7} from './scenes';
import {Lead, LeadSpec} from './Lead';
import {Stage, stageColor} from './ui';

/* Audio per the Remotion 4.0.536 agent rules: `<Audio>` from `@remotion/media`, timing props on the tag, volume as a
   number computed from `useCurrentFrame()`. Delivery loudness is set by master.py after the render. */

/** The @remotion/media path renders the voice about 3 dB hotter than the old tag did (measured on the UKW video). */
const VOICE = 0.72;

const byId: Record<string, React.FC<{s: any}>> = {s1: S1, s2: S2, s3: S3, s4: S4, s5: S5, s6: S6, s7: S7};

/** Stage per scene (must match each scene's <Shell bg>): the protagonist dot floods the NEXT stage colour on every cut. */
export const STAGE: Record<string, Stage> = {s1: 'green', s2: 'cream', s3: 'green', s4: 'accent', s5: 'cream', s6: 'green', s7: 'cream'};
/** Where the dot sits in each scene (frame px): beside the section word. */
const HOME: Record<string, {x: number; y: number}> = {
  s1: {x: 92, y: 128}, // logo row
  s2: {x: 92, y: 104},
  s3: {x: 92, y: 104},
  s4: {x: 92, y: 104},
  s5: {x: 92, y: 104},
  s6: {x: 92, y: 104},
  s7: {x: 92, y: 128}, // logo row
};
const leadSpecs = (): LeadSpec[] => {
  const specs: LeadSpec[] = [];
  let f = 0;
  for (const s of scenes) {
    const len = sceneFrames(s);
    specs.push({id: s.id, start: f, len, color: stageColor(STAGE[s.id] ?? 'green'), home: HOME[s.id] ?? {x: 92, y: 104}});
    f += len;
  }
  return specs;
};

/** Narration windows in global frames, for music ducking. */
const windows = (() => {
  const w: {a: number; b: number}[] = [];
  let f = 0;
  for (const s of scenes) {
    w.push({a: f + Math.round(LEAD * FPS), b: f + Math.round((LEAD + s.duration) * FPS)});
    f += sceneFrames(s);
  }
  return w;
})();

/** Music bed level at a global frame: fade in, duck under speech, lift in the gaps and the close, fade out. */
const musicLevel = (frame: number) => {
  const total = totalFrames();
  const BED = 0.2; // in the gaps (bed normalized to -20 LUFS)
  const DUCK = 0.11; // under the voice: about 19 dB below it
  const fadeIn = Math.min(1, frame / (1.2 * FPS));
  const fadeOut = Math.min(1, Math.max(0, (total - frame) / (2.2 * FPS)));
  let level = BED;
  for (const w of windows) {
    if (frame >= w.a - 6 && frame <= w.b + 4) {
      level = DUCK;
      break;
    }
  }
  return level * fadeIn * fadeOut;
};

const Bed: React.FC = () => {
  const frame = useCurrentFrame();
  return <Audio name="Music bed" src={staticFile('music/bed.mp3')} volume={musicLevel(frame)} />;
};

export const Main: React.FC = () => {
  ensureFonts();
  let from = 0;
  const specs = leadSpecs();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <Bed />
      {scenes.map((s) => {
        const Comp = byId[s.id];
        const len = sceneFrames(s);
        const start = from;
        from += len;
        return (
          <Sequence key={s.id} from={start} durationInFrames={len} name={s.id}>
            <Comp s={s} />
            <Audio name={s.id} src={staticFile(s.file)} from={Math.round(LEAD * FPS)} durationInFrames={Math.ceil(s.duration * FPS) + 2} volume={VOICE} />
          </Sequence>
        );
      })}
      {/* the protagonist: one sage dot = one invoice, every cut */}
      <Lead specs={specs} />
    </AbsoluteFill>
  );
};

export const Root: React.FC = () => {
  return <Composition id="Main" component={Main} durationInFrames={totalFrames()} fps={FPS} width={1920} height={1080} />;
};
