import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

/* v11 primitives (2026-10-19). House rules from the prompt-motion.com rulebook + cinetic seams:
   flat stages, one accent, one typeface, masked rises instead of fades, springs with a tiny overshoot at most,
   no glows / gradients / grain / drift / pills / cards / corner readouts. The scene transition lives in Lead.tsx. */

/** Spring with a tiny overshoot (about 2%). */
export const useIn = (delay: number, opts?: {damping?: number; stiffness?: number; mass?: number}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - delay, fps, config: {damping: opts?.damping ?? 20, stiffness: opts?.stiffness ?? 170, mass: opts?.mass ?? 1}});
};

/** Rise-in at a local frame (translate + fast opacity). `scaleFrom` is honored but damped: flat design pops little. */
export const Reveal: React.FC<{at: number; children: React.ReactNode; style?: React.CSSProperties; dy?: number; dx?: number; scaleFrom?: number; blur?: boolean}> = ({at, children, style, dy = 22, dx = 0, scaleFrom = 1}) => {
  const p = useIn(at);
  const frame = useCurrentFrame();
  const hidden = frame < at;
  const sc = 1 - (1 - scaleFrom) * 0.5;
  return (
    <div
      style={{
        opacity: hidden ? 0 : Math.min(1, p * 1.6),
        transform: `translate(${dx * (1 - p)}px, ${dy * (1 - p)}px) scale(${sc + (1 - sc) * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

const track = (size: number, font: 'display' | 'body') => (font === 'display' ? -size * 0.035 : size >= 40 ? -size * 0.015 : 0);

/** A masked word: rises out of its own line box. */
const MaskedWord: React.FC<{p: number; size: number; children: React.ReactNode; style?: React.CSSProperties; marginRight: number}> = ({p, size, children, style, marginRight}) => (
  <span style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: size * 0.14, marginBottom: -size * 0.14, marginRight}}>
    <span style={{display: 'inline-block', transform: `translateY(${(1 - p) * size * 1.15}px)`, ...style}}>{children}</span>
  </span>
);

/** Kinetic typography: words rise out of a mask one after another. `hi` = words to color/italicize. "\n" breaks a line. */
export const Words: React.FC<{text: string; at: number; stagger?: number; size?: number; font?: 'display' | 'body'; weight?: number; color?: string; hi?: Record<string, {color?: string; italic?: boolean}>; align?: 'left' | 'center'; lineHeight?: number; style?: React.CSSProperties}> = ({text, at, stagger = 3, size = 92, font = 'display', weight, color = C.charcoal, hi = {}, align = 'left', lineHeight = 1.02, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lines = text.split('\n');
  const w8 = weight ?? (font === 'display' ? 800 : 600);
  let idx = 0;
  return (
    <div style={{fontFamily: F.display, fontWeight: w8, fontSize: size, lineHeight, letterSpacing: track(size, font as 'display' | 'body'), color, textAlign: align, ...style}}>
      {lines.map((line, li) => (
        <div key={li} style={{display: 'block'}}>
          {line.split(' ').map((w, wi) => {
            const i = idx++;
            const d = at + i * stagger;
            const p = spring({frame: frame - d, fps, config: {damping: 22, stiffness: 170, mass: 1}});
            const key = w.replace(/[^a-zA-Z0-9%]/g, '').toLowerCase();
            const h = hi[key];
            return (
              <MaskedWord key={wi} p={frame < d ? 0 : p} size={size} marginRight={size * 0.24} style={{color: h?.color ?? color, fontStyle: h?.italic ? 'italic' : 'normal'}}>
                {w}
              </MaskedWord>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** The one per-letter move a scene is allowed: letters of the hero line rise out of a mask, 1 frame apart. */
export const Hero: React.FC<{text: string; at: number; size?: number; color?: string; hi?: Record<string, {color?: string}>; align?: 'left' | 'center'; lineHeight?: number; style?: React.CSSProperties; letterStagger?: number}> = ({text, at, size = 140, color = C.white, hi = {}, align = 'left', lineHeight = 0.98, style, letterStagger = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  let li = 0;
  return (
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight, letterSpacing: -size * 0.04, color, textAlign: align, ...style}}>
      {text.split('\n').map((line, ln) => (
        <div key={ln} style={{display: 'block'}}>
          {line.split(' ').map((w, wi) => {
            const key = w.replace(/[^a-zA-Z0-9%]/g, '').toLowerCase();
            const wc = hi[key]?.color ?? color;
            return (
              <span key={wi} style={{display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: size * 0.14, marginBottom: -size * 0.14, marginRight: size * 0.22}}>
                {Array.from(w).map((ch, ci) => {
                  const d = at + li++ * letterStagger;
                  const p = spring({frame: frame - d, fps, config: {damping: 24, stiffness: 190, mass: 1}});
                  return (
                    <span key={ci} style={{display: 'inline-block', color: wc, transform: `translateY(${frame < d ? size * 1.15 : (1 - p) * size * 1.15}px)`}}>
                      {ch}
                    </span>
                  );
                })}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Draws a horizontal line. */
export const Rule: React.FC<{at: number; width: number; color?: string; thickness?: number; style?: React.CSSProperties}> = ({at, width, color = C.greenLight, thickness = 3, style}) => {
  const frame = useCurrentFrame();
  const w = interpolate(frame, [at, at + 20], [0, width], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: (t) => 1 - Math.pow(1 - t, 3)});
  return <div style={{height: thickness, width: w, background: color, ...style}} />;
};

export type Stage = 'cream' | 'green' | 'accent';
export const stageColor = (bg: Stage) => (bg === 'cream' ? C.paper : bg === 'accent' ? C.stage : C.ink);

/**
 * Scene shell, v11: a flat stage. `cream` = paper, `green` = ink, `accent` = the brand-green flood stage.
 * A photo (the client's own studio) sits under a flat tint with a slow push-in; nothing else moves on its own.
 * No enter/exit here: the Lead layer floods every cut.
 */
export const Shell: React.FC<{bg: Stage; photo?: string; photoOpacity?: number; children: React.ReactNode; foot?: React.ReactNode; drift?: boolean}> = ({bg, photo, photoOpacity = 1, children, foot}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const t = frame / durationInFrames;
  const dark = bg !== 'cream';
  const base = stageColor(bg);
  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      {photo ? (
        <AbsoluteFill>
          <Img src={staticFile(photo)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + 0.05 * t})`, filter: 'grayscale(0.35)', opacity: 0.22 * photoOpacity}} />
        </AbsoluteFill>
      ) : null}
      {/* living hold: the whole scene pushes in 3% over its length, so nothing is ever a frozen slide */}
      <AbsoluteFill style={{fontFamily: F.body, color: dark ? C.white : C.charcoal, transform: `scale(${1 + 0.03 * t})`, transformOrigin: '50% 45%'}}>{children}</AbsoluteFill>
      <AbsoluteFill style={{pointerEvents: 'none'}}>{foot}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Text wordmark. */
export const Wordmark: React.FC<{size?: number; light?: boolean}> = ({size = 96, light = true}) => (
  <div style={{fontFamily: F.display, fontWeight: 400, fontSize: size, letterSpacing: -size * 0.03, color: light ? C.white : C.charcoal, display: 'flex', alignItems: 'baseline', gap: size * 0.2}}>
    <span>Uni</span>
    <span style={{fontWeight: 800, color: C.greenLight}}>K</span>
    <span>Wax</span>
  </div>
);

/** Section word. v11: no number, no rule line (kicker labels and corner readouts are AI giveaways). */
export const Eyebrow: React.FC<{children: React.ReactNode; color?: string; n?: string}> = ({children, color = C.greenLight}) => (
  <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 22, letterSpacing: 5, textTransform: 'uppercase', color}}>{children}</div>
);

export const H1: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 92, color, style}) => (
  <div style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1.02, letterSpacing: -size * 0.035, color, ...style}}>{children}</div>
);

export const Body: React.FC<{children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties}> = ({children, size = 34, color, style}) => (
  <div style={{fontFamily: F.body, fontWeight: 400, fontSize: size, lineHeight: 1.3, color, ...style}}>{children}</div>
);

/** Animated number: digits roll up and settle. No scale pop. */
export const Counter: React.FC<{at: number; to: number; suffix?: string; prefix?: string; size?: number; color?: string; dur?: number}> = ({at, to, suffix = '', prefix = '', size = 170, color = C.white}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 30, stiffness: 60, mass: 1.2}});
  const v = frame < at ? 0 : Math.round(to * p);
  return (
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1, color, letterSpacing: -size * 0.045, fontVariantNumeric: 'tabular-nums', opacity: frame < at ? 0 : 1}}>
      {prefix}
      {v.toLocaleString('en-US')}
      {suffix}
    </div>
  );
};

export const Check: React.FC<{size?: number; color?: string; at?: number}> = ({size = 44, color = C.greenLight, at = 0}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ring = interpolate(frame, [at - 4, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke={color} strokeWidth="3" strokeDasharray={138.2} strokeDashoffset={138.2 * (1 - ring)} transform="rotate(-90 24 24)" />
      <path d="M14 25l7 7 13-15" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={32} strokeDashoffset={32 * (1 - p)} />
    </svg>
  );
};

export const IconChat: React.FC<{size?: number; color?: string}> = ({size = 56, color = C.green}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H20l-9 7v-7H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
    <path d="M14 20h20M14 26h12" stroke={color} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconPhone: React.FC<{size?: number; color?: string}> = ({size = 56, color = C.green}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M14 6h8l4 10-5 3a24 24 0 0 0 8 8l3-5 10 4v8a4 4 0 0 1-4 4C21 38 10 27 10 10a4 4 0 0 1 4-4z" stroke={color} strokeWidth="3" strokeLinejoin="round" />
  </svg>
);

export const IconLoop: React.FC<{size?: number; color?: string}> = ({size = 56, color = C.green}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <path d="M38 20a15 15 0 0 0-27-6M10 28a15 15 0 0 0 27 6" stroke={color} strokeWidth="3" strokeLinecap="round" />
    <path d="M11 8v7h7M37 40v-7h-7" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Provenance line. Kept (it carries information), quieter. */
export const Footnote: React.FC<{children: React.ReactNode; light?: boolean; at?: number}> = ({children, light, at = 0}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', left: 120, right: 120, bottom: 44, fontFamily: F.body, fontSize: 18, lineHeight: 1.3, color: light ? 'rgba(255,255,255,0.45)' : 'rgba(28,34,28,0.5)', opacity: o}}>{children}</div>;
};

/** A fact fragment: an accent dot and bold words. No pill, no border. */
export const Chip: React.FC<{at: number; children: React.ReactNode; dark?: boolean}> = ({at, children, dark}) => (
  <Reveal at={at} dy={10}>
    <div style={{display: 'inline-flex', alignItems: 'center', gap: 12, color: dark ? C.white : C.charcoal, fontFamily: F.body, fontWeight: 700, fontSize: 26, letterSpacing: -0.3, paddingRight: 10}}>
      <i style={{width: 11, height: 11, borderRadius: 999, background: C.greenLight, display: 'inline-block', flexShrink: 0}} />
      {children}
    </div>
  </Reveal>
);

/** Animated voice bars. */
export const Waveform: React.FC<{bars?: number; width?: number; height?: number; color?: string; active?: boolean}> = ({bars = 56, width = 760, height = 180, color = C.greenLight, active = true}) => {
  const frame = useCurrentFrame();
  const gap = 6;
  const bw = (width - gap * (bars - 1)) / bars;
  return (
    <div style={{display: 'flex', alignItems: 'center', gap, width, height}}>
      {Array.from({length: bars}).map((_, i) => {
        const env = Math.exp(-Math.pow((i - bars / 2) / (bars / 2.6), 2));
        const s = active ? Math.abs(Math.sin(frame * 0.35 + i * 0.7) * 0.6 + Math.sin(frame * 0.21 + i * 1.9) * 0.4) : 0.08;
        const h = Math.max(6, height * (0.12 + 0.88 * s * env));
        return <div key={i} style={{width: bw, height: h, background: color, opacity: 0.55 + 0.45 * env}} />;
      })}
    </div>
  );
};
