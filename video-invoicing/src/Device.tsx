import React from 'react';
import {C, F} from './theme';

/** Phone frame with an arbitrary screen (NI Today card, a Workforce timesheet). Same chrome as Phone.tsx, no chat logic. */
export const Device: React.FC<{time: string; scale?: number; children: React.ReactNode; style?: React.CSSProperties; dark?: boolean}> = ({time, scale = 1, children, style, dark}) => {
  const W = 440;
  const H = 900;
  return (
    <div style={{width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'center', position: 'relative', ...style}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: 64, background: '#121512', boxShadow: '0 40px 90px rgba(20,30,20,0.35), inset 0 0 0 3px #2a2e2a'}} />
      <div style={{position: 'absolute', inset: 14, borderRadius: 52, background: dark ? C.ink : '#fbfcf9', overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
        <div style={{height: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 30px', fontFamily: F.body, fontWeight: 600, fontSize: 19, color: dark ? C.headDark : '#111', flexShrink: 0}}>
          <span>{time}</span>
          <span style={{letterSpacing: 2}}>●●●● ▮</span>
        </div>
        <div style={{position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', width: 120, height: 34, borderRadius: 20, background: '#121512'}} />
        <div style={{flex: 1, position: 'relative', overflow: 'hidden'}}>{children}</div>
      </div>
    </div>
  );
};
