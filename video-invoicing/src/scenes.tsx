import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, F} from './theme';
import {Scene, wordFrame, FPS, LEAD, sceneFrames} from './timing';
import {Body, Check, Chip, Eyebrow, Footnote, Hero, Reveal, Shell, Words} from './ui';
import {Device} from './Device';
import {Camera, CamKey} from './Camera';
import {Odometer} from './Odometer';
import {PhoneFrame, CL, clamp01, easeOut} from './broll';
import {BrowserFrame, QboList} from './Qbo';

/* v2 (2026-10-20, after Jay's review: "so the invoice sent right away, where in the app?"). Eight scenes, one protagonist
   (a sage dot = one invoice, performed by Lead.tsx on every cut), stages ink / paper / olive. Real things on screen:
   Amber's own recording of her Monday (tinted plate, s1), the real NI Today app with the Oct 12 to 17 dry run (s6),
   the dry-run invoice and rows (s4, s5). QuickBooks screens are illustrations and the footnotes say so. */

const lead = Math.round(LEAD * FPS);
const PAD: React.CSSProperties = {padding: '96px 140px'};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

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

/** Amber's own recording as a tinted plate under the text (slow push, desaturated), between two beats. */
const VideoPlate: React.FC<{src: string; from: number; to: number; level?: number}> = ({src, from, to, level = 0.3}) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to + 12) return null;
  const o = interpolate(frame, [from, from + 14, to, to + 12], [0, 1, 1, 0], CL);
  const t = clamp01((frame - from) / 320);
  return (
    <AbsoluteFill style={{opacity: level * o}}>
      <Sequence from={from} durationInFrames={to - from + 14} layout="none">
        <OffthreadVideo src={staticFile(src)} muted style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1.04 + 0.08 * t})`, filter: 'grayscale(0.55) contrast(1.05)'}} />
      </Sequence>
    </AbsoluteFill>
  );
};

/* ───────────── S1 · Cold open: her Monday, on her own screen ───────────── */
export const S1: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const here = wordFrame(s, 'Here');
  const time = wordFrame(s, 'Time', 0);
  const blank = wordFrame(s, 'blank');
  const hours = wordFrame(s, 'Hours', 0);
  const groceries = wordFrame(s, 'groceries');
  const fee = wordFrame(s, 'fee');
  const date = wordFrame(s, 'date');
  const review = wordFrame(s, 'review');
  const again = wordFrame(s, 'again');
  const forty = wordFrame(s, 'Forty');
  const two = wordFrame(s, 'Two');
  const dim = interpolate(frame, [two - 8, two + 6], [1, 0], CL);
  const lift = interpolate(frame, [two - 8, two + 6], [0, -60], CL);
  const listOut = interpolate(frame, [again, again + 10], [1, 0], CL);
  return (
    <Shell
      bg="green"
      foot={
        <Footnote light at={time + 10}>
          Background: your own recording of Monday, Oct 19, 2026 (QuickBooks Time, then an invoice in QuickBooks). 43 invoices that Monday; about 50 a week across the QuickBooks history pulled Oct 20. "Two hours" is your own estimate (voice note, Oct 19).
        </Footnote>
      }
    >
      <VideoPlate src="broll/amber_qbtime.mp4" from={time - 4} to={blank + 6} level={0.32} />
      <VideoPlate src="broll/amber_invoice.mp4" from={blank + 6} to={two - 10} level={0.32} />
      <AbsoluteFill style={PAD}>
        <Reveal at={lead} dy={10}>
          <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
            <Logo height={72} light />
            <div style={{width: 2, height: 44, background: 'rgba(242,237,225,0.3)'}} />
            <Eyebrow color={C.sage}>For Amber · weekly invoices</Eyebrow>
          </div>
        </Reveal>
        {/* phase A: her Monday */}
        <div style={{position: 'absolute', left: 140, right: 140, top: 250, opacity: frame < here ? 0 : dim, transform: `translateY(${lift}px)`}}>
          <Words at={here} text={'Your Monday morning.'} size={96} color={C.headDark} hi={{monday: {color: C.sage, italic: true}}} />
          <div style={{display: 'flex', gap: 90, marginTop: 36}}>
            <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 14, opacity: listOut}}>
              <Item at={hours} dark>
                Hours, from the time card
              </Item>
              <Item at={groceries} dark>
                Groceries, from the note
              </Item>
              <Item at={fee} dark>
                The shopping fee
              </Item>
              <Item at={date} dark>
                The date, for the client
              </Item>
              <Item at={review} dark>
                Review and send
              </Item>
            </div>
            <div style={{width: 640, opacity: frame < again ? 0 : 1}}>
              <Odometer at={forty} to={43} size={300} color={C.headDark} />
              <Reveal at={forty + 10}>
                <Body size={36} color={C.textDark}>
                  invoices, one at a time,
                  <br />
                  last Monday alone
                </Body>
              </Reveal>
            </div>
          </div>
        </div>
        {/* phase B: the hero line */}
        <div style={{position: 'absolute', left: 140, right: 140, top: 330, opacity: frame >= two ? 1 : 0}}>
          <Hero at={two} text={'Two hours.\nEvery week.'} size={170} color={C.headDark} hi={{hours: {color: C.sage}}} letterStagger={1.5} />
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S2 · The whole loop, and where every piece lives (tracked world) ───────────── */
type Station = {id: string; x: number; label: string; sub: string; tag: string; isNew?: boolean};
const Y2 = 600;
const ST: Station[] = [
  {id: 'wf', x: 520, label: 'Workforce app', sub: 'your chefs clock in', tag: 'like today'},
  {id: 'qbt', x: 1500, label: 'QuickBooks Time', sub: 'you approve the hours', tag: 'like today'},
  {id: 'bot', x: 2480, label: 'The bot', sub: 'Sunday, 7 pm', tag: 'new', isNew: true},
  {id: 'qbo', x: 3460, label: 'QuickBooks', sub: 'invoices land, unsent', tag: 'new', isNew: true},
  {id: 'app', x: 4440, label: 'NI Today', sub: 'Monday: what needs a look', tag: 'new', isNew: true},
  {id: 'send', x: 5420, label: 'QuickBooks', sub: 'you send', tag: 'like today'},
];
const WORLD_W = 6000;
const QB_GREEN = '#2d9e26';

/** A small product card above a station: enters with the node. */
const Mini: React.FC<{at: number; x: number; children: React.ReactNode; h?: number; dark?: boolean}> = ({at, x, children, h = 290, dark}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (frame < at) return null;
  const p = spring({frame: frame - at, fps, config: {damping: 20, stiffness: 110, mass: 1}});
  return (
    <div style={{position: 'absolute', left: x - 24, top: Y2 - 70 - h, width: 440, height: h, borderRadius: 16, overflow: 'hidden', background: dark ? C.ink : '#fbfcf9', boxShadow: '0 24px 60px rgba(46,53,42,0.16)', opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 40}px)`, fontFamily: F.body, color: '#1d2219', display: 'flex', flexDirection: 'column'}}>
      {children}
    </div>
  );
};
const MiniBar: React.FC<{title: string; sub?: string}> = ({title, sub}) => (
  <div style={{height: 40, background: QB_GREEN, color: '#fff', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', fontSize: 15, fontWeight: 800, flexShrink: 0}}>
    {title}
    {sub ? <span style={{fontWeight: 500, opacity: 0.85}}>{sub}</span> : null}
  </div>
);
const MiniRow: React.FC<{a: string; b?: string; tag?: string; tagColor?: string; tick?: boolean}> = ({a, b, tag, tagColor, tick}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderTop: '1px solid #e9ebe6', fontSize: 16}}>
    {tick ? <span style={{width: 18, height: 18, borderRadius: 4, background: QB_GREEN, display: 'inline-block', position: 'relative'}}><span style={{position: 'absolute', left: 6, top: 2, width: 4, height: 9, borderRight: '2px solid #fff', borderBottom: '2px solid #fff', transform: 'rotate(45deg)'}} /></span> : null}
    <span style={{fontWeight: 600, flex: 1}}>{a}</span>
    {b ? <span style={{color: '#3b4136', fontVariantNumeric: 'tabular-nums'}}>{b}</span> : null}
    {tag ? <span style={{fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: tagColor === 'green' ? '#e4efe2' : 'rgba(217,180,90,0.3)', color: tagColor === 'green' ? QB_GREEN : '#7a5d12'}}>{tag}</span> : null}
  </div>
);
/** The six station screens: Workforce, QuickBooks Time, the bot, QuickBooks, the real NI Today card, QuickBooks send. */
const StationScreen: React.FC<{id: string; at: number; x: number}> = ({id, at, x}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  if (id === 'wf')
    return (
      <Mini at={at} x={x}>
        <MiniBar title="Workforce" sub="· Time" />
        <div style={{padding: '14px 16px 6px', fontSize: 13, color: '#7a807a', fontWeight: 700, letterSpacing: 1.2}}>CLOCKED IN · 3:25 h</div>
        <MiniRow a="Customer" b="Brooke P." />
        <MiniRow a="Service" b="Chef Hours" />
        <MiniRow a="Notes" b="$136.02" />
        <MiniRow a="receipt.jpg" tag="attached" tagColor="green" />
      </Mini>
    );
  if (id === 'qbt')
    return (
      <Mini at={at} x={x}>
        <MiniBar title="QuickBooks Time" sub="· Approve hours" />
        <MiniRow a="Brooke P." b="Mon 10/12 · 3:25" tick />
        <MiniRow a="Annie T." b="Tue 10/13 · 3:25" tick />
        <MiniRow a="Ashley S." b="Mon 10/12 · 3:29" tick />
        <MiniRow a="Cindy P." b="Mon 10/12 · 4:26" tick />
        <div style={{padding: '10px 16px', fontSize: 13, color: QB_GREEN, fontWeight: 700}}>51 entries approved</div>
      </Mini>
    );
  if (id === 'bot')
    return (
      <Mini at={at} x={x} dark>
        <div style={{padding: '22px 22px 0', display: 'flex', alignItems: 'center', gap: 14}}>
          <Logo height={40} light />
          <span style={{fontSize: 13, fontWeight: 800, letterSpacing: 2, color: C.sage}}>INVOICE BOT</span>
        </div>
        <div style={{padding: '18px 22px 0', fontFamily: F.display, fontWeight: 800, fontSize: 54, color: C.headDark, lineHeight: 1}}>Sun · 7:00 pm</div>
        <div style={{padding: '12px 22px 0', fontSize: 18, color: C.textDark, lineHeight: 1.35}}>reads the approved hours,<br />builds one invoice per client</div>
        <div style={{marginTop: 'auto', padding: '0 22px 20px', fontSize: 14, color: C.sage, fontWeight: 700}}>week of Oct 12: 43 invoices, 2 flagged</div>
      </Mini>
    );
  if (id === 'qbo' || id === 'send') {
    const sent = id === 'send' && frame >= at + 40;
    return (
      <Mini at={at} x={x}>
        <MiniBar title="QuickBooks" sub="· Sales · Invoices" />
        {id === 'send' ? (
          <div style={{display: 'flex', gap: 8, padding: '10px 16px 4px', fontSize: 13}}>
            <span style={{padding: '5px 10px', borderRadius: 4, border: `1px solid ${QB_GREEN}`, color: QB_GREEN, fontWeight: 700}}>Batch actions ▾</span>
            <span style={{padding: '5px 10px', borderRadius: 4, background: sent ? '#e4efe2' : '#eaf4e8', fontWeight: 700}}>Send invoices</span>
          </div>
        ) : (
          <div style={{padding: '10px 16px 4px', fontSize: 13, color: '#7a807a'}}>Mon 10/19 · created by the bot</div>
        )}
        <MiniRow a="Alexandria S." b="$1,084.47" tag={sent ? 'Sent' : 'Not sent'} tagColor={sent ? 'green' : undefined} />
        <MiniRow a="Anastasia O." b="$514.49" tag={sent ? 'Sent' : 'Not sent'} tagColor={sent ? 'green' : undefined} />
        <MiniRow a="Annie T." b="$553.47" tag={sent ? 'Sent' : 'Not sent'} tagColor={sent ? 'green' : undefined} />
        <div style={{padding: '10px 16px', fontSize: 13, color: '#7a807a'}}>1 to 3 of 43</div>
      </Mini>
    );
  }
  // the real app card in a small phone
  if (frame < at) return null;
  const p = spring({frame: frame - at, fps, config: {damping: 20, stiffness: 110, mass: 1}});
  return (
    <div style={{position: 'absolute', left: x - 24, top: Y2 - 70 - 300, opacity: Math.min(1, p * 1.6), transform: `translateY(${(1 - p) * 40}px)`}}>
      <PhoneFrame x={0} y={0} scale={0.355}>
        <Img src={staticFile('shots/app_invoices.png')} style={{width: '100%', display: 'block'}} />
      </PhoneFrame>
      <div style={{position: 'absolute', left: 170, top: 40, width: 260, fontFamily: F.body, fontSize: 18, color: C.gray, lineHeight: 1.35}}>
        the real card, with the<br />two that need a look
      </div>
    </div>
  );
};

export const S2: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const whole = wordFrame(s, 'whole');
  const chefs = wordFrame(s, 'chefs');
  const approve = wordFrame(s, 'approve');
  const sunday = wordFrame(s, 'Sunday');
  const puts = wordFrame(s, 'puts');
  const monday = wordFrame(s, 'Monday');
  const send = wordFrame(s, 'send');
  const nothing = wordFrame(s, 'Nothing');
  const one = wordFrame(s, 'One');
  const arrive = [chefs, approve, sunday, puts, monday, send]; // the dot lands on station i at arrive[i]
  // the dot travels station to station on the narration cues
  const posAt = (f: number) => {
    let x = ST[0].x;
    for (let i = 0; i < ST.length - 1; i++) {
      const a = arrive[i];
      const b = arrive[i + 1];
      if (f >= b) x = ST[i + 1].x;
      else if (f >= a) {
        const e = easeInOut(clamp01((f - a) / Math.max(12, b - a - 8)));
        x = ST[i].x + (ST[i + 1].x - ST[i].x) * e;
        break;
      }
    }
    return x;
  };
  const dotX = posAt(frame);
  const ghosts = [3, 6, 9, 12].map((k, i) => ({x: posAt(frame - k), r: 13 - i * 3, o: 0.4 - i * 0.09}));
  const cam: CamKey[] = [
    {at: 0, scale: 1, focus: {x: ST[0].x + 330, y: Y2}},
    ...ST.map((st, i) => ({at: arrive[i] - 8, scale: i === 0 ? 1 : 1.04, focus: {x: st.x + 330, y: Y2 - 20}, dur: 30, ease: 'out' as const})),
    ...ST.slice(1).map((st, i) => ({at: arrive[i + 1] + 26, scale: 1, focus: {x: st.x + 330, y: Y2 - 20}, dur: 30})),
    {at: nothing - 10, scale: 0.29, focus: {x: 3150, y: Y2 - 60}, to: {x: 960, y: 400}, dur: 40},
  ];
  const seg = (i: number) => {
    const a = ST[i];
    const b = ST[i + 1];
    const p = clamp01((frame - arrive[i]) / Math.max(8, arrive[i + 1] - arrive[i] - 6));
    if (p <= 0) return null;
    return <line key={a.id} x1={a.x} y1={Y2} x2={a.x + (b.x - a.x) * p} y2={Y2} stroke="rgba(62,71,54,0.28)" strokeWidth={6} strokeLinecap="round" />;
  };
  const node = (st: Station, i: number) => {
    const at = arrive[i];
    if (frame < at) return null;
    const p = spring({frame: frame - at, fps, config: {damping: 20, stiffness: 170}});
    const ring = clamp01((frame - at) / 22);
    return (
      <g key={st.id}>
        {ring < 1 ? <circle cx={st.x} cy={Y2} r={24 + 70 * easeOut(ring)} fill="none" stroke={C.sage} strokeWidth={3} opacity={1 - ring} /> : null}
        <circle cx={st.x} cy={Y2} r={24 * p} fill={st.isNew ? C.sage : C.paper} stroke={st.isNew ? C.sage : C.head} strokeWidth={5} />
      </g>
    );
  };
  return (
    <Shell bg="cream" foot={<Footnote at={chefs + 10}>Sunday 7 pm Phoenix time, once the week's hours are approved. "Like today" means the step does not change for you or the chefs.</Footnote>}>
      <Camera keys={cam}>
        <div style={{position: 'absolute', left: 0, top: 0, width: WORLD_W, height: 1080}}>
          <svg width={WORLD_W} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
            {ST.slice(0, -1).map((_, i) => seg(i))}
            {ST.map((st, i) => node(st, i))}
          </svg>
          {ST.map((st, i) => (
            <StationScreen key={'m' + st.id} id={st.id} at={arrive[i] + 4} x={st.x} />
          ))}
          {ST.map((st, i) => (
            <div key={st.id} style={{position: 'absolute', left: st.x - 24, top: Y2 + 64, width: 760}}>
              <Words at={arrive[i]} text={st.label} size={66} color={C.head} stagger={3} />
              <Reveal at={arrive[i] + 8} dy={10}>
                <div style={{fontFamily: F.body, fontSize: 30, fontWeight: 500, color: C.gray, marginTop: 8, whiteSpace: 'nowrap'}}>{st.sub}</div>
              </Reveal>
              <Reveal at={arrive[i] + 14} dy={6}>
                <div style={{fontFamily: F.body, fontSize: 20, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', color: st.isNew ? C.sage : C.gray, marginTop: 16, whiteSpace: 'nowrap'}}>{st.tag}</div>
              </Reveal>
            </div>
          ))}
          {/* the travelling invoice */}
          {frame >= chefs - 2 ? (
            <>
              {ghosts.map((g, i) => (
                <div key={i} style={{position: 'absolute', left: g.x - g.r, top: Y2 - g.r, width: g.r * 2, height: g.r * 2, borderRadius: 999, background: C.sage, opacity: g.o}} />
              ))}
              <div style={{position: 'absolute', left: dotX - 14, top: Y2 - 14, width: 28, height: 28, borderRadius: 999, background: C.sage, boxShadow: '0 0 0 6px rgba(251,248,241,0.9)'}} />
            </>
          ) : null}
        </div>
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.head}>The whole loop</Eyebrow>
          </Reveal>
        </div>
        <div style={{position: 'absolute', left: 140, right: 140, top: 180, opacity: frame < whole ? 0 : interpolate(frame, [chefs - 10, chefs], [1, 0], CL)}}>
          <Words at={whole} text={'Where every piece lives.'} size={72} color={C.head} hi={{lives: {italic: true}}} />
        </div>
        <div style={{position: 'absolute', left: 140, right: 140, top: 760, opacity: frame < nothing ? 0 : 1}}>
          <Words at={nothing} text={'Nothing new to learn.'} size={84} color={C.head} stagger={3} />
          <Words at={one} text={'One chore gone.'} size={84} color={C.head} hi={{gone: {italic: true}}} stagger={3} />
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S3 · Nothing changes for the chefs (Workforce timesheet) ───────────── */
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
  const mins = Math.round(interpolate(frame, [clock + 4, receipt + 30], [0, 205], CL)); // 3 h 25 min, the real Oct 12 entry
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

export const S3: React.FC<{s: Scene}> = ({s}) => {
  const nothing = wordFrame(s, 'nothing');
  const pick = wordFrame(s, 'Pick');
  const clock = wordFrame(s, 'clock');
  const receipt = wordFrame(s, 'receipt');
  const exactly = wordFrame(s, 'Exactly');
  return (
    <Shell bg="accent" foot={<Footnote light at={pick + 10}>The Workforce screen is an illustration. The entry is a real one from Monday, Oct 12, 2026: 3 h 25 min, groceries $136.02 in the note.</Footnote>}>
      <Camera keys={[{at: pick - 4, scale: 1.05, focus: {x: 1380, y: 520}, to: {x: 1380, y: 520}, dur: 36, ease: 'out'}, {at: exactly, scale: 1, dur: 40, ease: 'out'}]}>
        <AbsoluteFill style={{...PAD, display: 'flex', flexDirection: 'row', gap: 90}}>
          <div style={{flex: 1.15, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 30}}>
            <Words at={nothing} text={'Nothing changes\nfor your chefs.'} size={92} color={C.headDark} hi={{nothing: {color: C.sage, italic: true}}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 18, marginTop: 6}}>
              <Item at={pick} dark>
                Pick the client
              </Item>
              <Item at={clock} dark>
                Clock in on the Workforce app
              </Item>
              <Item at={receipt} dark>
                Receipt and grocery total in the note
              </Item>
            </div>
            <Reveal at={exactly}>
              <Body size={34} color="rgba(242,237,225,0.7)">
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
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.headDark}>Your chefs</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S4 · Sunday 7 pm: the bot builds the invoice the way she would ───────────── */
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

export const S4: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const sunday = wordFrame(s, 'Sunday');
  const reads = wordFrame(s, 'reads');
  const builds = wordFrame(s, 'builds');
  const nearest = wordFrame(s, 'nearest');
  const groc = wordFrame(s, 'Groceries');
  const fee = wordFrame(s, 'twenty');
  const three = wordFrame(s, 'three');
  const total = three + 40;
  const dim = interpolate(frame, [builds - 8, builds + 4], [1, 0], CL);
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
                <Words at={sunday} text={'Once the hours are approved,\nthe bot reads them\nfrom QuickBooks.'} size={58} color={C.textDark} hi={{reads: {color: C.sage, italic: true}}} stagger={2} />
              </div>
              <div style={{position: 'absolute', left: 0, top: 0, opacity: frame >= builds ? 1 : 0}}>
                <Hero at={builds} text={'Built the way\nyou do.'} size={118} color={C.headDark} hi={{you: {color: C.sage}, do: {color: C.sage}}} letterStagger={1.5} />
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
              <Item at={three} dark>
                3% card fee, card clients only
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
                <Line at={three} name="Credit Card Fee" qty="3%" amount="$14.28" />
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

/* ───────────── S5 · In QuickBooks, not sent ───────────── */
export const S5: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const land = wordFrame(s, 'land');
  const difference = wordFrame(s, 'difference');
  const not = wordFrame(s, 'not', 0);
  const nothing = wordFrame(s, 'Nothing');
  const say = wordFrame(s, 'say');
  const p = spring({frame: frame - land, fps, config: {damping: 22, stiffness: 90, mass: 1.1}});
  return (
    <Shell bg="accent" foot={<Footnote light at={land + 10}>The QuickBooks screen is an illustration of the Sales page (no login was used); the rows and totals are your real dry-run invoices for Oct 12 to 17.</Footnote>}>
      <Camera keys={[{at: not - 4, scale: 1.08, focus: {x: 1330, y: 560}, to: {x: 1330, y: 560}, dur: 30, ease: 'out'}, {at: nothing - 6, scale: 1, dur: 40}]}>
        <AbsoluteFill style={PAD}>
          <div style={{position: 'absolute', left: 140, top: 250, width: 640}}>
            <Words at={land + 4} text={'Regular invoices,\nin QuickBooks.'} size={72} color={C.headDark} stagger={3} />
            <div style={{marginTop: 30, opacity: frame >= difference ? 1 : 0}}>
              <Hero at={difference + 6} text={'Not sent.'} size={150} color={C.headDark} hi={{not: {color: C.sage}}} letterStagger={2} />
            </div>
            <div style={{marginTop: 24, opacity: frame >= nothing ? 1 : 0}}>
              <Words at={nothing} text={'Nothing reaches a client\nuntil you say so.'} size={54} color={C.headDark} hi={{you: {color: C.sage, italic: true}, say: {color: C.sage, italic: true}, so: {color: C.sage, italic: true}}} stagger={2} />
            </div>
          </div>
          {frame >= land ? (
            <div style={{position: 'absolute', left: 840, top: 230, perspective: 1600, opacity: Math.min(1, p * 1.8)}}>
              <div style={{transform: `rotateY(${(1 - p) * -18}deg) translateX(${(1 - p) * 80}px)`, transformStyle: 'preserve-3d'}}>
                <BrowserFrame scale={0.9}>
                  <QboList statusAt={not} />
                </BrowserFrame>
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.headDark}>In QuickBooks</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S6 · Monday: the real app, then QuickBooks ───────────── */
/** A sage outline on the phone screenshot (coordinates in 390 x 844 screen px). */
const Spot: React.FC<{at: number; until?: number; x: number; y: number; w: number; h: number; scale: number}> = ({at, until, x, y, w, h, scale}) => {
  const frame = useCurrentFrame();
  const inn = interpolate(frame, [at, at + 10], [0, 1], CL);
  const out = until != null ? interpolate(frame, [until, until + 8], [1, 0], CL) : 1;
  if (frame < at) return null;
  return <div style={{position: 'absolute', left: x * scale, top: y * scale, width: w * scale, height: h * scale, borderRadius: 10 * scale, border: `3px solid ${C.sage}`, boxShadow: '0 0 0 4px rgba(163,181,93,0.25)', opacity: inn * out, transform: `scale(${0.96 + 0.04 * inn})`}} />;
};

export const S6: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const open = wordFrame(s, 'open', 0);
  const card = wordFrame(s, 'card');
  const many = wordFrame(s, 'many');
  const look = wordFrame(s, 'look');
  const reason = wordFrame(s, 'reason');
  const tap = wordFrame(s, 'Tap');
  const fix = wordFrame(s, 'fix');
  const select = wordFrame(s, 'select');
  const batch = wordFrame(s, 'batch');
  const send = wordFrame(s, 'send', 0);
  const never = wordFrame(s, 'never');
  const doo = wordFrame(s, 'do');
  const SC = 0.86;
  const swap = interpolate(frame, [tap + 6, tap + 26], [0, 1], {...CL, easing: (t) => 1 - Math.pow(1 - t, 3)});
  const phoneIn = spring({frame: frame - open, fps, config: {damping: 20, stiffness: 120, mass: 1}});
  const bIn = frame < tap + 6 ? 0 : spring({frame: frame - tap - 6, fps, config: {damping: 22, stiffness: 90, mass: 1.1}});
  const phaseA = interpolate(frame, [tap - 2, tap + 10], [1, 0], CL);
  const phaseB = interpolate(frame, [never - 6, never + 4], [1, 0], CL);
  const cam: CamKey[] = [
    {at: many - 4, scale: 1.1, focus: {x: 1250, y: 420}, to: {x: 1250, y: 420}, dur: 30, ease: 'out'},
    {at: tap - 10, scale: 1, dur: 30},
    {at: batch - 4, scale: 1.06, focus: {x: 1000, y: 420}, to: {x: 1000, y: 420}, dur: 28, ease: 'out'},
    {at: never - 8, scale: 1, dur: 36},
  ];
  return (
    <Shell bg="cream" foot={<Footnote at={open + 10}>Phone: the real NI Today app showing your Oct 12 to 17 dry run, as the card looks once live. The QuickBooks screen is an illustration of the Sales page; the bot never sends, you do.</Footnote>}>
      <Camera keys={cam}>
        <AbsoluteFill style={PAD}>
          {/* left column, three phases */}
          <div style={{position: 'absolute', left: 140, top: 250, width: 700, opacity: phaseA}}>
            <Words at={open} text={'Open NI Today.'} size={88} color={C.head} hi={{today: {italic: true}}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 30}}>
              <Item at={card}>The Invoices card, on your home screen</Item>
              <Item at={many}>How many, and the total</Item>
              <Item at={look}>The few that need a look, with the reason</Item>
            </div>
          </div>
          <div style={{position: 'absolute', left: 140, top: 250, width: 700, opacity: frame < tap + 6 ? 0 : phaseB}}>
            <Words at={tap + 6} text={'Then QuickBooks.'} size={88} color={C.head} hi={{quickbooks: {italic: true}}} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 30}}>
              <Item at={fix}>Fix the flagged ones</Item>
              <Item at={select}>Select all</Item>
              <Item at={batch}>Batch actions, Send invoices</Item>
            </div>
          </div>
          <div style={{position: 'absolute', left: 140, top: 290, width: 760, opacity: frame >= never ? 1 : 0}}>
            <Hero at={never} text={'The app\nnever sends.'} size={120} color={C.head} hi={{never: {color: C.sage}}} letterStagger={1.5} />
            <div style={{marginTop: 24}}>
              <Words at={doo} text={'You do.'} size={88} color={C.head} hi={{you: {italic: true}, do: {italic: true}}} stagger={4} />
            </div>
          </div>
          {/* the real app */}
          {frame >= open ? (
            <div style={{position: 'absolute', left: 1180 - (1 - phoneIn) * 60 - swap * 340, top: 150, opacity: Math.min(1, phoneIn * 1.6) * (1 - swap * 0.6), transform: `scale(${1 - swap * 0.12})`, transformOrigin: 'top left'}}>
              <PhoneFrame x={0} y={0} scale={SC}>
                <Img src={staticFile('shots/app_invoices.png')} style={{width: '100%', display: 'block'}} />
                <Spot at={many} until={look - 2} x={28} y={92} w={290} h={44} scale={SC} />
                <Spot at={look} until={reason - 2} x={28} y={182} w={334} h={236} scale={SC} />
                <Spot at={reason} until={tap - 2} x={28} y={246} w={300} h={48} scale={SC} />
                <Spot at={tap} until={tap + 14} x={32} y={546} w={326} h={52} scale={SC} />
              </PhoneFrame>
            </div>
          ) : null}
          {/* then QuickBooks */}
          {frame >= tap + 6 ? (
            <div style={{position: 'absolute', left: 860, top: 220, perspective: 1600, opacity: Math.min(1, bIn * 1.8)}}>
              <div style={{transform: `rotateY(${(1 - bIn) * -16}deg) translateX(${(1 - bIn) * 90}px)`, transformStyle: 'preserve-3d'}}>
                <BrowserFrame scale={0.88}>
                  <QboList select={select} batch={batch} send={send} />
                </BrowserFrame>
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.head}>Monday</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S7 · The test: 37 of 43 identical ───────────── */
export const S7: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const tested = wordFrame(s, 'tested');
  const thirty = wordFrame(s, 'Thirty');
  const identical = wordFrame(s, 'identical');
  const six = wordFrame(s, 'six');
  const half = wordFrame(s, 'half');
  const rounded = wordFrame(s, 'rounded');
  const typo = wordFrame(s, 'typo');
  const two = wordFrame(s, 'two');
  const shift = interpolate(frame, [six - 6, six + 14], [0, 1], {...CL, easing: (t) => 1 - Math.pow(1 - t, 3)});
  return (
    <Shell
      bg="green"
      foot={
        <Footnote light at={thirty + 20}>
          Dry run on Oct 20, 2026 against the 43 invoices you typed on Oct 19, from the 51 time entries of that week. QuickBooks was read only; nothing was created. Jay has the line-by-line report.
        </Footnote>
      }
    >
      <Camera keys={[{at: thirty - 2, scale: 1.08, focus: {x: 520, y: 540}, to: {x: 520, y: 540}, dur: 30, ease: 'out'}, {at: six - 8, scale: 1, dur: 36}]}>
        <AbsoluteFill style={PAD}>
          <div style={{position: 'absolute', left: 140, top: 180}}>
            <Words at={tested} text={'Your real week of October 12.'} size={54} color={C.textDark} stagger={2} />
          </div>
          <div style={{position: 'absolute', left: 140, top: 330, transform: `scale(${1 - 0.22 * shift})`, transformOrigin: '0 0'}}>
            <div style={{display: 'flex', alignItems: 'baseline', gap: 24}}>
              <Odometer at={thirty} to={37} size={320} color={C.headDark} />
              <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 120, color: C.gray, letterSpacing: -4, opacity: frame >= thirty + 14 ? 1 : 0}}>/ 43</div>
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
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.sage}>The test</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S8 · Later: clean weeks send themselves (a future step, Jay 2026-10-21) ───────────── */
const Tiles: React.FC<{n: number; at: number; color: string; checkAt?: number; cols?: number}> = ({n, at, color, checkAt, cols = 11}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'grid', gridTemplateColumns: `repeat(${cols}, 34px)`, gap: 10}}>
      {Array.from({length: n}).map((_, i) => {
        const d = at + Math.floor(i / cols) * 2 + (i % cols);
        const p = frame < d ? 0 : spring({frame: frame - d, fps, config: {damping: 20, stiffness: 170}});
        const ck = checkAt != null && frame >= checkAt + i;
        return (
          <div key={i} style={{width: 34, height: 42, borderRadius: 5, background: color, opacity: p, transform: `translateY(${(1 - p) * 10}px)`, position: 'relative'}}>
            {ck ? <div style={{position: 'absolute', left: 11, top: 9, width: 8, height: 16, borderRight: `3px solid ${C.ink}`, borderBottom: `3px solid ${C.ink}`, transform: 'rotate(45deg)'}} /> : null}
          </div>
        );
      })}
    </div>
  );
};

export const S8: React.FC<{s: Scene}> = ({s}) => {
  const frame = useCurrentFrame();
  const later = wordFrame(s, 'later');
  const simple = wordFrame(s, 'simple');
  const lines = wordFrame(s, 'lines');
  const nothing = wordFrame(s, 'nothing');
  const send = wordFrame(s, 'send');
  const flagged = wordFrame(s, 'flagged', 1); // 'nothing is flagged' comes first; the lane fires on 'The flagged ones'
  const wait = wordFrame(s, 'wait');
  const dim = interpolate(frame, [simple - 8, simple + 4], [1, 0], CL);
  return (
    <Shell bg="accent" foot={<Footnote light at={later + 10}>A later step, only after you say so and after the first weeks run clean. Flagged invoices always wait for you.</Footnote>}>
      <Camera keys={[{at: send - 4, scale: 1.06, focus: {x: 1380, y: 420}, to: {x: 1380, y: 420}, dur: 30, ease: 'out'}, {at: wait + 10, scale: 1, dur: 40}]}>
        <AbsoluteFill style={PAD}>
          <div style={{position: 'absolute', left: 140, top: 250, width: 820}}>
            <div style={{position: 'relative', minHeight: 250}}>
              <div style={{position: 'absolute', left: 0, top: 0, opacity: frame < later ? 0 : dim}}>
                <Words at={later} text={'After a few\nclean weeks,'} size={72} color={C.headDark} stagger={3} />
              </div>
              <div style={{position: 'absolute', left: 0, top: 0, opacity: frame >= simple ? 1 : 0}}>
                <Hero at={simple} text={'Clean weeks\nsend themselves.'} size={94} color={C.headDark} hi={{themselves: {color: C.sage}}} letterStagger={1.5} />
              </div>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', gap: 16, marginTop: 10}}>
              <Item at={lines} dark>
                Every invoice lines up
              </Item>
              <Item at={nothing} dark>
                Nothing flagged
              </Item>
              <Item at={send} dark>
                Sent for you, Monday morning
              </Item>
              <Item at={flagged} dark>
                Flagged ones still wait for you
              </Item>
            </div>
          </div>
          {/* the two lanes */}
          <div style={{position: 'absolute', left: 1000, top: 250, width: 800}}>
            <Reveal at={lines} dy={16}>
              <div style={{borderRadius: 18, background: 'rgba(251,248,241,0.07)', padding: '22px 26px 24px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16}}>
                  <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 20, letterSpacing: 2.5, textTransform: 'uppercase', color: C.headDark}}>41 line up</div>
                  <Reveal at={send} dx={10} dy={0}>
                    <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 20, color: C.ink, background: C.sage, padding: '6px 14px', borderRadius: 6}}>Sent for you</div>
                  </Reveal>
                </div>
                <Tiles n={41} at={lines} color="rgba(251,248,241,0.85)" checkAt={nothing} />
              </div>
            </Reveal>
            <Reveal at={flagged} dy={16} style={{marginTop: 22}}>
              <div style={{borderRadius: 18, background: 'rgba(251,248,241,0.07)', padding: '22px 26px 24px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16}}>
                  <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 20, letterSpacing: 2.5, textTransform: 'uppercase', color: C.amber}}>2 flagged</div>
                  <Reveal at={wait} dx={10} dy={0}>
                    <div style={{fontFamily: F.body, fontWeight: 800, fontSize: 20, color: C.ink, background: C.amber, padding: '6px 14px', borderRadius: 6}}>Waits for you</div>
                  </Reveal>
                </div>
                <Tiles n={2} at={flagged} color={C.amber} />
              </div>
            </Reveal>
          </div>
        </AbsoluteFill>
      </Camera>
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: 140, top: 96}}>
          <Reveal at={lead}>
            <Eyebrow color={C.headDark}>Later</Eyebrow>
          </Reveal>
        </div>
      </AbsoluteFill>
    </Shell>
  );
};

/* ───────────── S9 · Close: your Mondays, back ───────────── */
export const S9: React.FC<{s: Scene}> = ({s}) => {
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
