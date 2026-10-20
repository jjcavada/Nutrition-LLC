import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';

/* QuickBooks Online, as an ILLUSTRATION (no login to capture the real thing; the footnote says so). The layout follows
   the Sales > Invoices page Amber uses: green bar, left nav, "Batch actions" above a table with a Status column.
   Rows are the real dry-run invoices (first name + initial, real totals). Nothing here claims to be a screenshot. */

export const QBO_ROWS = [
  {who: 'Alexandria S.', amt: '$1,084.47'},
  {who: 'Anastasia O.', amt: '$514.49'},
  {who: 'Annie T.', amt: '$553.47'},
  {who: 'Ashley S.', amt: '$610.23'},
  {who: 'Brooke P.', amt: '$490.30'},
  {who: 'Cindy P.', amt: '$535.53'},
  {who: 'Danielle M.', amt: '$378.90'},
  {who: 'Danielle S.', amt: '$428.77'},
  {who: 'Dara C.', amt: '$557.51'},
];

const GREEN = '#2d9e26';
const CL = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};

/** A browser window (1100 x 680 at scale 1). */
export const BrowserFrame: React.FC<{scale?: number; url?: string; children: React.ReactNode; style?: React.CSSProperties}> = ({scale = 1, url = 'app.qbo.intuit.com/app/invoices', children, style}) => (
  <div style={{width: 1100, height: 680, transform: `scale(${scale})`, transformOrigin: 'top left', borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 30px 70px rgba(20,30,20,0.28)', fontFamily: F.body, ...style}}>
    <div style={{height: 40, background: '#e9ebe6', display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px'}}>
      {['#e5655a', '#e9b94a', '#5fc46a'].map((c) => (
        <i key={c} style={{width: 11, height: 11, borderRadius: 999, background: c, display: 'inline-block'}} />
      ))}
      <div style={{marginLeft: 14, flex: 1, height: 24, borderRadius: 6, background: '#fff', fontSize: 13, color: '#6b726b', display: 'flex', alignItems: 'center', padding: '0 10px'}}>{url}</div>
    </div>
    <div style={{position: 'absolute', left: 0, right: 0, top: 40, bottom: 0}}>{children}</div>
  </div>
);

/**
 * The invoice list. `select`: frame the header checkbox is clicked (rows tick one by one); `batch`: the Batch actions
 * menu opens; `send`: "Send invoices" is pressed, the toast appears 14 frames later and statuses flip to Sent.
 */
export const QboList: React.FC<{select?: number; batch?: number; send?: number; statusAt?: number; rows?: {who: string; amt: string}[]}> = ({select, batch, send, statusAt = 0, rows = QBO_ROWS}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const checked = (i: number) => select != null && frame >= select + 6 + i * 2;
  const allChecked = select != null && frame >= select + 6 + rows.length * 2;
  const menu = batch != null && frame >= batch && (send == null || frame < send + 4);
  const pressed = send != null && frame >= send && frame < send + 6;
  const sent = send != null && frame >= send + 14;
  const toast = send != null && frame >= send + 14 ? spring({frame: frame - send - 14, fps, config: {damping: 16, stiffness: 180}}) : 0;
  const statusGlow = interpolate(frame, [statusAt, statusAt + 10], [0, 1], CL);
  const Box: React.FC<{on: boolean}> = ({on}) => <div style={{width: 16, height: 16, borderRadius: 3, border: `2px solid ${on ? GREEN : '#9aa09a'}`, background: on ? GREEN : '#fff', flexShrink: 0, position: 'relative'}}>{on ? <div style={{position: 'absolute', left: 4, top: 1, width: 4, height: 8, borderRight: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(45deg)'}} /> : null}</div>;
  return (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', color: '#1d2219'}}>
      <div style={{height: 46, background: GREEN, display: 'flex', alignItems: 'center', padding: '0 18px', color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: 0.2, gap: 18}}>
        <span style={{fontWeight: 800, fontSize: 17}}>QuickBooks</span>
        <span style={{opacity: 0.85, fontWeight: 500}}>Nutrition Intuition LLC</span>
        <span style={{marginLeft: 'auto', opacity: 0.85, fontWeight: 500, fontSize: 13}}>Illustration of the Sales page</span>
      </div>
      <div style={{flex: 1, display: 'flex', minHeight: 0}}>
        <div style={{width: 170, background: '#f3f4f1', padding: '14px 0', fontSize: 14, color: '#3b4136'}}>
          {['Dashboard', 'Transactions', 'Sales', 'Expenses', 'Customers', 'Payroll', 'Time', 'Reports'].map((n) => (
            <div key={n} style={{padding: '9px 18px', fontWeight: n === 'Sales' ? 700 : 500, background: n === 'Sales' ? '#e4efe2' : 'transparent', borderLeft: n === 'Sales' ? `3px solid ${GREEN}` : '3px solid transparent'}}>
              {n}
            </div>
          ))}
        </div>
        <div style={{flex: 1, padding: '16px 22px', position: 'relative', minWidth: 0}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 16}}>
            <div style={{fontSize: 24, fontWeight: 700}}>Invoices</div>
            <div style={{fontSize: 13, color: '#6b726b'}}>Last 365 days</div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, position: 'relative'}}>
            <div style={{padding: '7px 12px', borderRadius: 4, border: `1px solid ${allChecked ? GREEN : '#c7cbc1'}`, color: allChecked ? GREEN : '#6b726b', fontSize: 13, fontWeight: 700, background: menu ? '#eaf4e8' : '#fff'}}>Batch actions ▾</div>
            <div style={{padding: '7px 12px', borderRadius: 4, border: '1px solid #c7cbc1', color: '#6b726b', fontSize: 13}}>Filter ▾</div>
            {allChecked ? <div style={{fontSize: 13, color: '#3b4136', marginLeft: 6}}>{rows.length === QBO_ROWS.length ? '43' : rows.length} selected</div> : null}
            {menu ? (
              <div style={{position: 'absolute', left: 0, top: 40, width: 220, background: '#fff', borderRadius: 6, boxShadow: '0 14px 36px rgba(0,0,0,0.18)', border: '1px solid #e2e5de', zIndex: 3, fontSize: 14, overflow: 'hidden'}}>
                {['Send invoices', 'Send reminders', 'Print or download'].map((m, i) => (
                  <div key={m} style={{padding: '10px 14px', fontWeight: i === 0 ? 700 : 500, background: i === 0 ? (pressed ? '#cfe6cb' : '#eaf4e8') : '#fff', color: i === 0 ? '#1d2219' : '#3b4136'}}>
                    {m}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <table style={{width: '100%', borderCollapse: 'collapse', marginTop: 14, fontSize: 14}}>
            <thead>
              <tr style={{color: '#6b726b', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6}}>
                <th style={{width: 30, padding: '8px 6px', textAlign: 'left'}}>
                  <Box on={select != null && frame >= select} />
                </th>
                <th style={{padding: '8px 6px', textAlign: 'left', fontWeight: 600}}>Date</th>
                <th style={{padding: '8px 6px', textAlign: 'left', fontWeight: 600}}>Customer</th>
                <th style={{padding: '8px 6px', textAlign: 'right', fontWeight: 600}}>Amount</th>
                <th style={{padding: '8px 6px', textAlign: 'left', fontWeight: 600}}>Status</th>
                <th style={{padding: '8px 6px', textAlign: 'left', fontWeight: 600}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{borderTop: '1px solid #e9ebe6', background: checked(i) ? '#f1f8f0' : 'transparent'}}>
                  <td style={{padding: '9px 6px'}}>
                    <Box on={checked(i)} />
                  </td>
                  <td style={{padding: '9px 6px', color: '#3b4136'}}>10/19/2026</td>
                  <td style={{padding: '9px 6px', fontWeight: 600}}>{r.who}</td>
                  <td style={{padding: '9px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600}}>{r.amt}</td>
                  <td style={{padding: '9px 6px'}}>
                    <span style={{display: 'inline-block', padding: '3px 9px', borderRadius: 4, fontSize: 12.5, fontWeight: 700, background: sent ? '#e4efe2' : `rgba(217,180,90,${0.18 + 0.22 * statusGlow})`, color: sent ? GREEN : '#7a5d12', outline: !sent && statusGlow > 0 ? `2px solid rgba(217,180,90,${statusGlow})` : 'none'}}>{sent ? 'Sent' : 'Not sent'}</span>
                  </td>
                  <td style={{padding: '9px 6px', color: GREEN, fontWeight: 700}}>{sent ? 'View' : 'Send'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{marginTop: 10, fontSize: 13, color: '#6b726b'}}>1 to {rows.length} of 43</div>
          {toast > 0 ? (
            <div style={{position: 'absolute', left: '50%', bottom: 18, transform: `translateX(-50%) translateY(${(1 - toast) * 20}px)`, opacity: toast, background: '#1d2219', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap'}}>43 invoices sent</div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
