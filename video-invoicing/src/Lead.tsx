import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C} from './theme';

/**
 * The protagonist: ONE green dot = one lead. It sits at a "home" in every scene and performs every cut
 * (prompt-motion.com rulebook: "every scene grows out of the one before", "the dot connects every scene").
 *
 * Cut between stages of different colour: the dot swells into a circle of the NEXT stage colour over the last
 * FLOOD frames of the outgoing scene (covers the frame exactly on the cut), then contracts over the first FLOOD
 * frames of the incoming scene while its centre travels to the new home. The contraction reveals the new scene
 * from the edges in. Cut between same-colour stages: no flood, the dot just travels across the hard cut
 * (cinetic "anchored overlay, background swap").
 */
export type LeadSpec = {
  id: string;
  start: number; // global frame
  len: number;
  color: string; // stage colour of this scene
  home: {x: number; y: number};
  homeEnd?: {x: number; y: number}; // where the dot is when the scene ends (defaults to home); the next flood grows from here
  r?: number; // dot radius at home
  hideAfter?: number; // local frame after which the dot leaves the frame (e.g. it joins the funnel particles)
  appearAt?: number; // local frame the dot first appears (first scene only)
};

const FLOOD = 12;
const RMAX = 2300;
const easeIn = (t: number) => t * t * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export const Lead: React.FC<{specs: LeadSpec[]}> = ({specs}) => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  let i = specs.findIndex((s) => f >= s.start && f < s.start + s.len);
  if (i < 0) i = f < specs[0].start ? 0 : specs.length - 1;
  const cur = specs[i];
  const prev = i > 0 ? specs[i - 1] : null;
  const next = i < specs.length - 1 ? specs[i + 1] : null;
  const local = f - cur.start;
  const r0 = cur.r ?? 11;

  const end = cur.homeEnd ?? cur.home;
  const prevEnd = prev ? prev.homeEnd ?? prev.home : cur.home;
  // the dot moves from home to homeEnd over the scene's last 40 frames (before the flood), if they differ
  const travel = cur.homeEnd ? easeOut(interpolate(local, [cur.len - FLOOD - 40, cur.len - FLOOD - 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : 0;
  let x = cur.home.x + (end.x - cur.home.x) * travel;
  let y = cur.home.y + (end.y - cur.home.y) * travel;
  let r = r0;
  let color = C.greenLight;
  let opacity = 1;

  // first appearance
  if (!prev) {
    const a = cur.appearAt ?? 10;
    const p = spring({frame: f - a, fps, config: {damping: 18, stiffness: 160}});
    r = f < a ? 0 : r0 * p;
  }

  // outgoing: swell into the next stage colour (or travel toward the next home on a same-colour cut)
  if (next && local >= cur.len - FLOOD) {
    const t = (local - (cur.len - FLOOD)) / FLOOD; // 0..1
    if (next.color !== cur.color) {
      r = r0 + (RMAX - r0) * easeIn(t);
      color = next.color;
      x = end.x;
      y = end.y;
    } else {
      const e = easeOut(Math.min(1, t * 0.5)); // first half of the travel
      x = end.x + (next.home.x - end.x) * e;
      y = end.y + (next.home.y - end.y) * e;
    }
  }
  // incoming: contract from the full-frame circle to the dot at the new home
  else if (prev && local < FLOOD) {
    const t = local / FLOOD;
    if (prev.color !== cur.color) {
      const e = easeOut(t);
      r = RMAX + (r0 - RMAX) * e;
      x = prevEnd.x + (cur.home.x - prevEnd.x) * e;
      y = prevEnd.y + (cur.home.y - prevEnd.y) * e;
      // the circle is the stage colour while it is big, and becomes the accent dot as it lands
      color = e < 0.985 ? cur.color : C.greenLight;
    } else {
      const e = easeOut(0.5 + Math.min(1, t) * 0.5);
      x = prevEnd.x + (cur.home.x - prevEnd.x) * e;
      y = prevEnd.y + (cur.home.y - prevEnd.y) * e;
    }
  }

  // leaving the frame mid-scene (the dot becomes the first funnel particle), then back in time for the cut
  if (cur.hideAfter != null && local >= cur.hideAfter) {
    const back = cur.len - FLOOD - 8;
    opacity = local < back ? interpolate(local, [cur.hideAfter, cur.hideAfter + 8], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : interpolate(local, [back, back + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
    if (local >= back) {
      x = end.x;
      y = end.y;
    }
  }

  // a flood circle must be a hard disc; the dot is the same element at r0
  return <AbsoluteFill style={{pointerEvents: 'none', background: color, clipPath: `circle(${Math.max(0, r)}px at ${x}px ${y}px)`, opacity}} />;
};
