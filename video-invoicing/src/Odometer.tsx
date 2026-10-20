import React from 'react';
import {spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

/**
 * Odometer number: every digit column is a drum (HyperFrames "stat count-up with an odometer roll, easing out as it
 * lands"). Mechanical carry: a drum turns only while the drums below it pass 9 → 0, so "10" reads 9 → 10 and not
 * "0" + a popped "1" (the v12 bug). A drum that has no digit yet shows a blank where its 0 would be, so 16,000 never
 * reads "00,380" on the way up; the window is fixed-width, like a real counter. Thousands separators appear with
 * their digit. Prefix / suffix stay static. Tabular digits.
 */
export const Odometer: React.FC<{at: number; to: number; size?: number; color?: string; prefix?: string; suffix?: string; dur?: number; weight?: number}> = ({at, to, size = 120, color = C.white, prefix = '', suffix = '', weight = 800}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - at, fps, config: {damping: 26, stiffness: 50, mass: 1.3}});
  const settled = p > 0.999;
  const v = frame < at ? 0 : settled ? to : to * p; // continuous value drives the drums
  const digits = String(to).length;
  const h = size * 1.0;
  const cols: React.ReactNode[] = [];
  for (let k = digits - 1; k >= 0; k--) {
    const place = Math.pow(10, k);
    const higher = Math.floor(v / (place * 10)); // digits above this drum
    const base = Math.floor(v / place) % 10;
    const lower = v - Math.floor(v / place) * place; // 0..place, what the drums below read
    const carry = place === 1 ? v - Math.floor(v) : lower >= place - 1 ? lower - (place - 1) : 0; // 0..1
    const pos = settled ? Math.floor(to / place) % 10 : base + carry;
    const blankZero = higher === 0 && base === 0; // no digit here yet: its 0 is a blank
    cols.push(
      <span key={`d${k}`} style={{display: 'inline-block', height: h, overflow: 'hidden', verticalAlign: 'top', position: 'relative', width: size * 0.58}}>
        <span style={{display: 'block', transform: `translateY(${-pos * h}px)`}}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d, i) => (
            <span key={i} style={{display: 'block', height: h, lineHeight: `${h}px`, textAlign: 'center'}}>
              {i === 0 && blankZero ? '' : d}
            </span>
          ))}
        </span>
      </span>
    );
    if (k > 0 && k % 3 === 0) {
      const on = Math.floor(v / place) >= 1 ? 1 : carry; // the separator arrives with its digit
      cols.push(
        <span key={`c${k}`} style={{display: 'inline-block', height: h, lineHeight: `${h}px`, verticalAlign: 'top', opacity: on}}>
          ,
        </span>
      );
    }
  }
  return (
    <span style={{display: 'inline-flex', alignItems: 'flex-start', fontFamily: F.display, fontWeight: weight, fontSize: size, color, letterSpacing: -size * 0.04, fontVariantNumeric: 'tabular-nums', lineHeight: 1, opacity: frame < at ? 0 : 1}}>
      {prefix ? <span style={{lineHeight: `${h}px`}}>{prefix}</span> : null}
      {cols}
      {suffix ? <span style={{lineHeight: `${h}px`}}>{suffix}</span> : null}
    </span>
  );
};
