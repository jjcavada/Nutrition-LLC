import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from './theme';
import {Scene, wordFrame, FPS, LEAD} from './timing';
import {Body, Check, Chip, Counter, Eyebrow, Footnote, Hero, Reveal, Shell, Words} from './ui';
import {Device} from './Device';
import {Camera} from './Camera';

/* Seven scenes, one protagonist (a sage dot = one invoice, performed by Lead.tsx on every cut), three flat stages:
   ink (s1, s3, s6), paper (s2, s5, s7), olive flood (s4). Every number on screen is from the Oct 20, 2026 dry run
   (DRYRUN_invoices_2026-10-12_to_17.md) or Amber's own words; footnotes carry the provenance. */

const lead = Math.round(LEAD * FPS);
const clamp = {extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const};
const PAD: React.CSSProperties = {padding: '96px 140px'};

/** The NI logo (public/logo.png, dark marks on transparent). `light` recolours it cream for the dark stages. */
const Logo: React.FC<{height?: number; light?: boolean; style?: React.CSSProperties}> = ({height = 64, light, style}) => (
  <Img src={staticFile('logo.png')} style={{height, width: 'auto', filter: light ? 'brightness(0) invert(0.93)' : 'none', ...style}} />
);

/** A line that appears on its cue with a check mark. */
const Item: React.FC<{at: number; children: React.ReactNode; dark?: boolean; size?: number}> = ({at, children, dark, size = 34}) => (
  <Reveal at={at} dx={-20} dy={0}>
    <div style={{display: 'flex', gap: 18, alignItems: 'center'}}>
      <Check size={40} color={dark ? C.sage : C.head} at={at} />
      <Body size={size} color={dark ? C.textDark : C.text}>
        {children}
      </Body>
    </div>
  </Reveal>
);

const money = (n: number) => '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

/* ───────────── S1 · Cold open: Monday, by hand ───────────── */
export const S1: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const monday = wordFrame(s, 'Monday');
  const fifty = wordFrame(s, 'fifty');
  const two = wordFrame(s, 'Two');
  const heres = wordFrame(s, 'Here');
  const dim = interpolate(frame, [two - 8, two + 6], [1, 0], clamp);
  const lift = interpolate(frame, [two - 8, two + 6], [0, -60], clamp);
  // the clock runs 7:00 to 9:00 while she types
  const mins = Math.round(interpolate(frame, [monday + 14, two - 12], [7 * 60, 9 * 60], clamp));
  const clock = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')} AM`;
  return (
    <Shell
      bg="green"
      foot={
        <Footnote light at={fifty + 20}>
          43 invoices in your Monday, Oct 19 batch; about 50 a week across the QuickBooks history pulled Oct 20, 2026. "Two hours" is your own estimate (voice note, Oct 19).
        </Footnote>
      }
    >
      <AbsoluteFill style={PAD}>
        <Reveal at={lead} dy={10}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <Logo height={72} light />
            <div style={{width: 2, height: 44, background: 'rgba(242,237,225,0.3)'}} />
            <Eyebrow color={C.sage}>For Amber · weekly invoices</Eyebrow>
          </div>
        </Reveal>
        {/* phase A: Monday, by hand */}
        <div style={{position: 'absolute', left: 140, right: 140, top: 250, display: 'flex', gap: 80, opacity: frame < monday ? 0 : dim, transform: `translateY(${lift}px)`}}>
          <div style={{flex: 1}}>
            <Words at={monday} text={'Every Monday morning,\nby hand.'} size={88} color={C.headDark} hi={{hand: {color: C.sage, italic: true}}} />
            <Reveal at={monday + 14}>
              <div style={{marginTop: 44, fontFamily: F.display, fontWeight: 800, fontSize: 128, lineHeight: 1, color: C.headDark, letterSpacing: -5, fontVariantNumeric: 'tabular-nums'}}>{clock}</div>
            </Reveal>
          </div>
          <div style={{width: 600}}>
            <Counter at={fifty} to={43} size={300} color={C.headDark} />
            <Reveal at={fifty + 8}>
              <Body size={36} color={C.textDark}>
                invoices typed into QuickBooks
                <br />
                on Monday, October 19
              </Body>
            </Reveal>
          </div>
        </div>
        {/* phase B: the hero line */}
        <div style={{position: 'absolute', left: 140, right: 140, top: 330, opacity: frame >= two ? 1 : 0}}>
          <Hero at={two} text={'Two hours.\nEvery week.'} size={170} color={C.headDark} hi={{hours: {color: C.sage}}} letterStagger={1.5} />
          <div style={{marginTop: 44}}>
            <Words at={heres} text={"Here's how that stops."} size={64} color={C.sage} stagger={3} />
          </div>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S2 · Nothing changes for the chefs (Workforce timesheet) ───────────── */
const Row: React.FC<{label: string; value: string; at: number; filled: boolean}> = ({label, value, at, filled}) => (
  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderTop: '1px solid #e8eae4'}}>
    <div style={{fontSize: 19, color: '#7a807a', fontWeight: 600}}>{label}</div>
    {filled ? (
      <Reveal at={at} dy={8}>
        <div style={{fontSize: 21, color: '#111', fontWeight: 700}}>{value}</div>
      </Reveal>
    ) : (
      <div style={{width: 120, height: 14, borderRadius: 7, background: '#eceee9'}} />
    )}
  </div>
);

const Timesheet: React.FC<{clock: number; pick: number; receipt: number}> = ({clock, pick, receipt}) => {
  const frame = useCurrentFrame();
  const running = frame >= clock + 4;
  const mins = Math.round(interpolate(frame, [clock + 4, receipt + 30], [0, 205], clamp)); // 3 h 25 min, the real Oct 12 entry
  return (
    <div style={{position: 'absolute', inset: 0, padding: '6px 22px 22px', fontFamily: F.body, color: '#111', display: 'flex', flexDirection: 'column', gap: 14}}>
      <div style={{fontWeight: 700, fontSize: 22}}>
        Time <span style={{color: '#7a807a', fontWeight: 500}}>· Mon, Oct 12</span>
      </div>
      <div style={{background: '#f1f3ee', borderRadius: 18, padding: '18px 20px'}}>
        <div style={{fontSize: 14, color: '#7a807a', fontWeight: 700, letterSpacing: 1.5}}>{running ? 'CLOCKED IN' : 'NOT CLOCKED IN'}</div>
        <div style={{fontSize: 58, fontWeight: 700, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums', color: running ? C.head : '#b4b9b2'}}>
          {Math.floor(mins / 60)}:{String(mins % 60).padStart(2, '0')}
          <span style={{fontSize: 22, marginLeft: 8, fontWeight: 600}}>h</span>
        </div>
      </div>
      <div>
        <Row label="Customer" value="Brooke P." at={pick} filled={frame >= pick} />
        <Row label="Service" value="Chef Hours" at={pick + 6} filled={frame >= pick + 6} />
        <Row label="Notes" value="$136.02" at={receipt} filled={frame >= receipt} />
      </div>
      <Reveal at={receipt + 12} dy={8}>
        <div style={{display: 'flex', gap: 14, alignItems: 'center'}}>
          <div style={{width: 58, height: 76, borderRadius: 8, background: '#e9ebe6', border: '1px solid #d9dcd5'}} />
          <div style={{fontSize: 17, color: '#7a807a', lineHeight: 1.3}}>
            receipt.jpg
            <br />
            attached
          </div>
        </div>
      </Reveal>
      <div style={{marginTop: 'auto', height: 56, borderRadius: 14, background: running ? C.head : '#d9dcd5', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20}}>{running ? 'Clock out' : 'Clock in'}</div>
    </div>
  );
};

export const S2: React.FC<{s: Scene}> = ({s}) => {
  const nothing = wordFrame(s, 'Nothing');
  const clock = wordFrame(s, 'clock');
  const pick = wordFrame(s, 'pick');
  const receipt = wordFrame(s, 'receipt');
  const exactly = wordFrame(s, 'exactly');
  return (
    <Shell bg="cream" foot={<Footnote at={clock + 10}>The Workforce screen is an illustration. The entry is a real one from Monday, Oct 12, 2026: 3 h 25 min, groceries $136.02 in the note.</Footnote>}>
      <AbsoluteFill style={{...PAD, display: 'flex', flexDirection: 'row', gap: 90}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.head}>Your chefs</Eyebrow>
          </Reveal>
        </div>
        <div style={{flex: 1.15, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30}}>
          <Words at={nothing} text={'Nothing changes\nfor your chefs.'} size={92} color={C.head} hi={{nothing: {italic: true}}} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 6}}>
            <Item at={clock}>Clock in on the Workforce app</Item>
            <Item at={pick}>Pick the client</Item>
            <Item at={receipt}>Receipt and grocery total in the note</Item>
          </div>
          <Reveal at={exactly}>
            <Body size={34} color={C.gray}>
              Exactly like today.
            </Body>
          </Reveal>
        </div>
        <div style={{flex: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Device time="9:02" scale={0.86}>
            <Timesheet clock={clock} pick={pick} receipt={receipt} />
          </Device>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S3 · Sunday 7 pm: the bot builds the invoice the way she would ───────────── */
const Line: React.FC<{at: number; name: string; qty?: string; amount: string; note?: string}> = ({at, name, qty, amount, note}) => (
  <Reveal at={at} dy={14}>
    <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 24px', padding: '15px 0', borderTop: '1px solid #e3e6dd', fontFamily: F.body}}>
      <div style={{fontWeight: 600, fontSize: 25, color: '#1d2219'}}>
        {name}
        {qty ? <span style={{color: '#7a807a', fontWeight: 500, marginLeft: 12}}>{qty}</span> : null}
      </div>
      <div style={{fontSize: 25, fontWeight: 700, color: '#1d2219', fontVariantNumeric: 'tabular-nums', textAlign: 'right'}}>{amount}</div>
      {note ? <div style={{gridColumn: '1 / -1', fontSize: 19, color: C.head, fontWeight: 600}}>{note}</div> : null}
    </div>
  </Reveal>
);

export const S3: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const sunday = wordFrame(s, 'Sunday');
  const reads = wordFrame(s, 'reads');
  const builds = wordFrame(s, 'builds');
  const nearest = wordFrame(s, 'nearest');
  const groc = wordFrame(s, 'Groceries');
  const fee = wordFrame(s, 'twenty');
  const card = wordFrame(s, 'card');
  const total = card + 34;
  const dim = interpolate(frame, [builds - 8, builds + 4], [1, 0], clamp);
  return (
    <Shell
      bg="green"
      foot={
        <Footnote light at={reads + 10}>
          A real invoice from the dry run of your week of Oct 12 to 17 (Brooke P.: 3 h 25 min billed as 3.5 h, groceries $136.02, card client), identical to the one you typed. Rates are your QuickBooks items: Chef Hours $90, Half Hour $45, Shopping/Menu Fee $25, card fee 3%.
        </Footnote>
      }
    >
      <Camera keys={[{at: nearest, scale: 1.04, dur: 40, ease: 'out'}, {at: total + 10, scale: 1, dur: 40, ease: 'out'}]}>
        <AbsoluteFill style={{...PAD, display: 'flex', flexDirection: 'row', gap: 70}}>
          <div style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28, position: 'relative'}}>
            <div style={{position: 'relative', minHeight: 290}}>
              <div style={{position: 'absolute', left: 0, top: 0, opacity: frame < sunday ? 0 : dim}}>
                <Words at={sunday} text={'Once the hours are in,\nthe bot reads them\nfrom QuickBooks.'} size={58} color={C.textDark} hi={{reads: {color: C.sage, italic: true}}} stagger={2} />
              </div>
              <div style={{position: 'absolute', left: 0, top: 0, opacity: frame >= builds ? 1 : 0}}>
                <Hero at={builds} text={'Built the way\nyou would.'} size={118} color={C.headDark} hi={{you: {color: C.sage}, would: {color: C.sage}}} letterStagger={1.5} />
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
              <Item at={nearest} dark>
                Hours to the nearest half hour
              </Item>
              <Item at={groc} dark>
                Groceries from the chef's note
              </Item>
              <Item at={fee} dark>
                $25 shopping fee per visit
              </Item>
              <Item at={card} dark>
                3% card fee where it applies
              </Item>
            </div>
          </div>
          {/* the invoice assembling itself */}
          <div style={{width: 760, display: 'flex', alignItems: 'center'}}>
            <Reveal at={reads} dy={30} style={{width: '100%'}}>
              <div style={{background: '#fbfcf9', borderRadius: 18, padding: '40px 44px 34px', width: '100%', boxSizing: 'border-box'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline'}}>
                  <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 40, color: '#1d2219', letterSpacing: -1}}>Invoice</div>
                  <div style={{fontFamily: F.body, fontSize: 19, color: '#7a807a', fontWeight: 600}}>Oct 19, 2026 · Due on receipt</div>
                </div>
                <div style={{fontFamily: F.body, fontSize: 22, color: '#3b4136', marginTop: 6, marginBottom: 18}}>Brooke P. · visit 10/12</div>
                <Line at={nearest} name="Chef Hours" qty="3 × $90.00" amount="$270.00" note="3 h 25 min, rounded to 3.5 h" />
                <Line at={nearest + 10} name="Half Hour" qty="1 × $45.00" amount="$45.00" />
                <Line at={groc} name="Groceries" amount="$136.02" note="from the chef's note" />
                <Line at={fee} name="Shopping / Menu Fee" qty="1 × $25.00" amount="$25.00" />
                <Line at={card} name="Credit Card Fee" qty="3%" amount="$14.28" />
                <Reveal at={total} dy={10}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '3px solid #1d2219', marginTop: 6, paddingTop: 16, fontFamily: F.body}}>
                    <div style={{fontWeight: 700, fontSize: 26, color: '#1d2219'}}>Total</div>
                    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 44, color: '#1d2219', fontVariantNumeric: 'tabular-nums'}}>$490.30</div>
                  </div>
                </Reveal>
              </div>
            </Reveal>
          </div>
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.sage}>Sunday, 7 pm</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S4 · Unsent. Nothing goes out until she says so ───────────── */
const Tile: React.FC = () => (
  <div style={{width: 286, height: 250, borderRadius: 14, background: '#fbfcf9', padding: '22px 24px', boxSizing: 'border-box', position: 'relative', fontFamily: F.body}}>
    <div style={{position: 'absolute', right: 20, top: 20, fontSize: 15, fontWeight: 800, letterSpacing: 1.2, color: '#9a7a1f', textTransform: 'uppercase'}}>Not sent</div>
    <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 22, color: '#1d2219'}}>Invoice</div>
    {[180, 120, 150, 90].map((w, i) => (
      <div key={i} style={{height: 12, width: w, borderRadius: 6, background: '#e3e6dd', marginTop: i === 0 ? 24 : 16}} />
    ))}
    <div style={{position: 'absolute', left: 24, right: 24, bottom: 22, height: 2, background: '#1d2219'}} />
  </div>
);

export const S4: React.FC<{s: Scene}> = ({s}) => {
  const land = wordFrame(s, 'land');
  const unsent = wordFrame(s, 'unsent');
  const nothing = wordFrame(s, 'Nothing');
  return (
    <Shell bg="accent">
      <AbsoluteFill style={PAD}>
        <Reveal at={lead}>
          <Eyebrow color={C.headDark}>In QuickBooks</Eyebrow>
        </Reveal>
        <div style={{position: 'absolute', left: 140, top: 214, display: 'flex', gap: 28}}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Reveal key={i} at={land + i * 4} dy={46}>
              <Tile />
            </Reveal>
          ))}
        </div>
        <div style={{position: 'absolute', left: 140, right: 140, top: 520}}>
          <Hero at={unsent} text="Unsent." size={190} color={C.headDark} letterStagger={2} />
          <div style={{marginTop: 20}}>
            <Words at={nothing} text={'Nothing goes to a client\nuntil you say so.'} size={62} color={C.headDark} hi={{you: {color: C.sage, italic: true}, say: {color: C.sage, italic: true}, so: {color: C.sage, italic: true}}} stagger={2} />
          </div>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S5 · Monday: the app shows what is ready and what needs a look ───────────── */
const InvoicesCard: React.FC<{look: number; grocery: number}> = ({look, grocery}) => (
  <div style={{position: 'absolute', inset: 0, padding: '4px 20px 20px', fontFamily: F.body, color: C.textDark, display: 'flex', flexDirection: 'column'}}>
    <div style={{display: 'flex', alignItems: 'baseline', justifyContent: 'space-between'}}>
      <div style={{fontFamily: F.display, fontWeight: 700, fontSize: 30, color: C.headDark}}>Invoices</div>
      <div style={{fontSize: 15, color: '#a9ae9f'}}>Week of Oct 12 to 17</div>
    </div>
    <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 10}}>
      <div style={{fontFamily: F.display, fontWeight: 300, fontSize: 44, lineHeight: 1, color: C.headDark}}>43</div>
      <div style={{fontSize: 16, lineHeight: 1.3, color: '#cfcabb'}}>
        invoices for $23,039.11,
        <br />2 need a look
      </div>
    </div>
    <div style={{alignSelf: 'flex-start', marginTop: 12, fontSize: 13, fontWeight: 700, letterSpacing: 0.6, padding: '6px 11px', borderRadius: 999, border: `1px solid ${C.sage}`, color: C.sage}}>Created in QuickBooks, not sent</div>
    <div style={{marginTop: 18, fontSize: 13, fontWeight: 800, letterSpacing: 1.4, color: C.amber, textTransform: 'uppercase'}}>Need a look</div>
    {[
      {who: 'Darin G.', amt: '$860.00', why: '10/13: no amount in the note (".")', at: look},
      {who: 'Mike J.', amt: '$407.23', why: '10/14: no amount in the note ("Grocery")', at: grocery},
    ].map((r, i) => (
      <Reveal key={i} at={r.at} dy={10}>
        <div style={{display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px', padding: '12px 0', borderTop: '1px solid rgba(233,228,214,0.14)'}}>
          <div style={{fontSize: 17, fontWeight: 700, color: C.headDark}}>{r.who}</div>
          <div style={{fontSize: 17, fontWeight: 700, color: C.headDark, fontVariantNumeric: 'tabular-nums'}}>{r.amt}</div>
          <div style={{gridColumn: '1 / -1', fontSize: 14, color: C.amber, fontWeight: 600}}>{r.why}</div>
        </div>
      </Reveal>
    ))}
    <div style={{marginTop: 'auto'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 15, color: '#cfcabb', padding: '10px 0', borderTop: '1px solid rgba(233,228,214,0.14)'}}>
        <span>All 43 invoices</span>
        <span>▾</span>
      </div>
      <div style={{marginTop: 10, height: 50, borderRadius: 12, border: `1.5px solid ${C.sage}`, color: C.sage, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16}}>Open invoices in QuickBooks</div>
    </div>
  </div>
);

const QboList: React.FC<{select: number; send: number}> = ({select, send}) => {
  const frame = useCurrentFrame();
  const rows = ['Alexandria S.', 'Anastasia O.', 'Annie T.', 'Ashley S.', 'Brooke P.', 'Cindy P.', 'Danielle M.', 'Danielle S.'];
  const checked = (i: number) => frame >= select + 8 + i * 2;
  const sent = frame >= send + 10;
  return (
    <div style={{position: 'absolute', inset: 0, padding: '4px 20px 20px', fontFamily: F.body, color: '#111', display: 'flex', flexDirection: 'column', background: '#fbfcf9'}}>
      <div style={{fontWeight: 700, fontSize: 24}}>Invoices</div>
      <div style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, padding: '10px 12px', borderRadius: 10, background: '#eef1ea', fontSize: 16, fontWeight: 600}}>
        <div style={{width: 22, height: 22, borderRadius: 5, background: checked(0) ? C.head : '#fff', border: `2px solid ${C.head}`}} />
        {checked(7) ? '43 selected' : 'Select all'}
      </div>
      <div style={{marginTop: 8}}>
        {rows.map((r, i) => (
          <div key={i} style={{display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderBottom: '1px solid #eceee9', fontSize: 16, opacity: sent ? 0.5 : 1}}>
            <div style={{width: 20, height: 20, borderRadius: 5, background: checked(i) ? C.head : '#fff', border: `2px solid ${checked(i) ? C.head : '#c7cbc1'}`}} />
            <span style={{flex: 1}}>{r}</span>
            <span style={{color: '#7a807a', fontSize: 14}}>{sent ? 'Sent' : 'Not sent'}</span>
          </div>
        ))}
      </div>
      <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 12}}>
        {sent ? (
          <Reveal at={send + 10} dy={10}>
            <div style={{padding: '12px 14px', borderRadius: 12, background: C.ink, color: C.headDark, fontSize: 15, fontWeight: 600, textAlign: 'center'}}>43 invoices sent</div>
          </Reveal>
        ) : null}
        <div style={{height: 54, borderRadius: 12, background: C.head, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18, transform: `scale(${frame >= send && frame < send + 6 ? 0.96 : 1})`}}>Send</div>
      </div>
    </div>
  );
};

export const S5: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const ready = wordFrame(s, 'ready');
  const look = wordFrame(s, 'look');
  const grocery = wordFrame(s, 'grocery');
  const two = wordFrame(s, 'two', 0);
  const select = wordFrame(s, 'select');
  const send = wordFrame(s, 'send');
  const minutes = wordFrame(s, 'Minutes');
  const swap = interpolate(frame, [select - 4, select + 12], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <Shell bg="cream" foot={<Footnote at={ready + 10}>The app card shows your real dry run of Oct 12 to 17 (43 invoices, $23,039.11, 2 flagged). The QuickBooks list is an illustration; the bot never sends, you do.</Footnote>}>
      <AbsoluteFill style={{...PAD, display: 'flex', flexDirection: 'row', gap: 90}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.head}>Monday</Eyebrow>
          </Reveal>
        </div>
        <div style={{flex: 1.15, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 28}}>
          <Words at={ready} text={"What's ready.\nWhat needs a look."} size={84} color={C.head} hi={{look: {italic: true}}} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <Item at={grocery}>A note with no grocery amount</Item>
            <Item at={two}>A note with two amounts</Item>
          </div>
          <Words at={select} text={'Select all. Send.'} size={64} color={C.head} hi={{send: {italic: true}}} stagger={4} />
          <Reveal at={minutes}>
            <Body size={34} color={C.gray}>
              Minutes, not two hours.
            </Body>
          </Reveal>
        </div>
        <div style={{flex: 0.85, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Device time="7:48" scale={0.86} dark>
            <div style={{position: 'absolute', inset: 0, opacity: 1 - swap}}>
              <InvoicesCard look={look} grocery={grocery} />
            </div>
            <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - swap) * 100}%)`}}>
              <QboList select={select} send={send} />
            </div>
          </Device>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S6 · The test: 37 of 43 identical ───────────── */
export const S6: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const tested = wordFrame(s, 'tested');
  const thirty = wordFrame(s, 'Thirty');
  const identical = wordFrame(s, 'identical');
  const six = wordFrame(s, 'six');
  const half = wordFrame(s, 'half');
  const rounded = wordFrame(s, 'rounded');
  const typo = wordFrame(s, 'typo');
  const two = wordFrame(s, 'two');
  const shift = interpolate(frame, [six - 6, six + 14], [0, 1], {...clamp, easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <Shell
      bg="green"
      foot={
        <Footnote light at={thirty + 20}>
          Dry run on Oct 20, 2026 against the 43 invoices you typed on Oct 19, from the 51 time entries of that week. QuickBooks was read only; nothing was created. Jay has the line-by-line report.
        </Footnote>
      }
    >
      <AbsoluteFill style={PAD}>
        <Reveal at={lead}>
          <Eyebrow color={C.sage}>The test</Eyebrow>
        </Reveal>
        <div style={{position: 'absolute', left: 140, top: 180}}>
          <Words at={tested} text={'Your real week of October 12.'} size={54} color={C.textDark} stagger={2} />
        </div>
        {/* the number slides left to make room for the list */}
        <div style={{position: 'absolute', left: 140, top: 330, transform: `scale(${1 - 0.22 * shift})`, transformOrigin: '0 0'}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
            <Counter at={thirty} to={37} size={320} color={C.headDark} />
            <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 120, color: C.gray, letterSpacing: -4, opacity: frame >= thirty + 10 ? 1 : 0}}>/ 43</div>
          </div>
          <div style={{marginTop: 10}}>
            <Words at={identical} text={'identical, to the cent.'} size={64} color={C.sage} stagger={3} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 1000, top: 330, width: 800, display: 'flex', flexDirection: 'column', gap: 18, opacity: shift}}>
          <Reveal at={six}>
            <Body size={30} color={C.gray}>
              The other six were small slips the old way let through:
            </Body>
          </Reveal>
          <Item at={half} dark size={32}>
            3 half hours left taxable, +$3.60 each
          </Item>
          <Item at={rounded} dark size={32}>
            2 totals rounded up, 4.68 h billed as 5
          </Item>
          <Item at={typo} dark size={32}>
            1 grocery typo, $179.90 typed for $173.90
          </Item>
          <div style={{height: 6}} />
          <Reveal at={two}>
            <div style={{display: 'flex', gap: 18, alignItems: 'center'}}>
              <div style={{width: 40, height: 40, borderRadius: 999, background: C.amber, color: C.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.body, fontWeight: 800, fontSize: 22, flexShrink: 0}}>2</div>
              <Body size={32} color={C.textDark}>
                flagged for you: no amount in the note
              </Body>
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S7 · Close: your Mondays, back ───────────── */
export const S7: React.FC<{s: Scene}> = ({s}) => {
  const mondays = wordFrame(s, 'Mondays');
  const sunday = wordFrame(s, 'Sunday');
  const review = wordFrame(s, 'review');
  const send = wordFrame(s, 'send');
  const watch = wordFrame(s, 'watch');
  return (
    <Shell bg="cream" foot={<Footnote at={sunday + 10}>Goes live once you confirm the rounding rule and the card fee list. Music: "Inspired" by Kevin MacLeod (incompetech.com), CC BY 4.0.</Footnote>}>
      <AbsoluteFill style={{...PAD, display: 'flex', flexDirection: 'row', gap: 90}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead} dy={10}>
            <Logo height={72} />
          </Reveal>
        </div>
        <div style={{flex: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36}}>
          <Hero at={mondays} text={'Your Mondays,\nback.'} size={150} color={C.head} hi={{back: {color: C.sage}}} letterStagger={1.5} />
          <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
            <Chip at={review}>You review</Chip>
            <Chip at={send}>You send</Chip>
            <Chip at={watch}>We watch the first ones with you</Chip>
          </div>
        </div>
        <div style={{flex: 0.8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <Reveal at={sunday} dy={30} scaleFrom={0.96}>
            <div style={{width: 420, borderRadius: 24, background: 'rgba(62,71,54,0.06)', padding: '36px 40px 40px', textAlign: 'center', fontFamily: F.body}}>
              <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 4, color: C.head, textTransform: 'uppercase'}}>Sunday</div>
              <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 220, lineHeight: 1, color: C.head, letterSpacing: -8}}>26</div>
              <div style={{fontSize: 30, fontWeight: 700, color: C.head}}>October · 7:00 pm</div>
              <div style={{fontSize: 24, color: C.gray, marginTop: 8}}>first batch builds</div>
            </div>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};
