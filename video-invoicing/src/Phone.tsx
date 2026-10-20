import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

export type Msg = {at: number; side: 'in' | 'out'; text: string; typing?: number; status?: string};

const Typing: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{display: 'flex', gap: 7, padding: '16px 20px', background: '#e9ebe6', borderRadius: 22, borderBottomLeftRadius: 6, alignSelf: 'flex-start'}}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{width: 11, height: 11, borderRadius: 999, background: '#9aa09a', transform: `translateY(${Math.sin((frame + i * 4) * 0.45) * 3}px)`}} />
      ))}
    </div>
  );
};

/** iPhone-style mockup with a timed chat. Messages are anchored to the bottom and push older ones up. */
export const Phone: React.FC<{msgs: Msg[]; time: string; title: string; subtitle?: string; scale?: number; style?: React.CSSProperties; unanswered?: boolean}> = ({msgs, time, title, subtitle, scale = 1, style, unanswered}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const W = 440;
  const H = 900;
  const typingNow = msgs.find((m) => m.typing && frame >= m.at - m.typing && frame < m.at);
  return (
    <div style={{width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center', position: 'relative', ...style}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 64, background: '#121512', boxShadow: '0 40px 90px rgba(20,30,20,0.35), inset 0 0 0 3px #2a2e2a'}} />
      <div style={{position: 'absolute', inset: 14, borderRadius: 52, background: '#fbfcf9', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        {/* status bar */}
        <div style={{height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontFamily: F.body, fontWeight: 600, fontSize: 19, color: '#111'}}>
          <span>{time}</span>
          <span style={{letterSpacing: 2}}>●●●● ▮</span>
        </div>
        <div style={{position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 20, background: '#121512'}} />
        {/* header */}
        <div style={{display: 'flex', alignItems: 'center', gap: 14, padding: '10px 24px 16px', borderBottom: '1px solid #e8eae4'}}>
          <div style={{width: 48, height: 48, borderRadius: 999, background: C.green, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: F.body, fontSize: 20}}>K</div>
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <div style={{fontFamily: F.body, fontWeight: 700, fontSize: 21, color: '#111'}}>{title}</div>
            {subtitle ? <div style={{fontFamily: F.body, fontSize: 16, color: '#7a807a'}}>{subtitle}</div> : null}
          </div>
        </div>
        {/* messages: a bottom-anchored stack in a clipped pane, so a new message pushes the older ones up and out, like a real phone */}
        <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 18px 26px'}}>
          {msgs
            .filter((m) => frame >= m.at)
            .map((m, i) => {
              const p = spring({frame: frame - m.at, fps, config: {damping: 14, stiffness: 170, mass: 0.7}});
              const isIn = m.side === 'in';
              const faded = unanswered ? interpolate(frame, [m.at + 40, m.at + 70], [1, 0.45], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
              return (
                <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: isIn ? 'flex-start' : 'flex-end', maxHeight: 400 * p, opacity: Math.min(p, faded), transform: `translateY(${(1 - p) * 18}px) scale(${0.92 + 0.08 * p})`, transformOrigin: isIn ? 'left bottom' : 'right bottom'}}>
                  <div style={{maxWidth: 330, padding: '14px 18px', borderRadius: 24, borderBottomLeftRadius: isIn ? 6 : 24, borderBottomRightRadius: isIn ? 24 : 6, background: isIn ? '#e9ebe6' : C.green, color: isIn ? '#111' : '#fff', fontFamily: F.body, fontSize: 21, lineHeight: 1.3}}>{m.text}</div>
                  {m.status ? <div style={{fontFamily: F.body, fontSize: 14, color: '#9aa09a', marginTop: 4, marginRight: 6}}>{m.status}</div> : null}
                </div>
              );
            })}
          {typingNow ? <Typing /> : null}
        </div>
        </div>
        {/* input bar */}
        <div style={{height: 64, borderTop: '1px solid #e8eae4', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 12}}>
          <div style={{flex: 1, height: 38, borderRadius: 999, border: '1px solid #d9dcd5', background: '#fff'}} />
          <div style={{width: 38, height: 38, borderRadius: 999, background: C.green}} />
        </div>
      </div>
    </div>
  );
};
