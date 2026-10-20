import {continueRender, delayRender, staticFile} from 'remotion';

let injected = false;
let handle: number | null = null;

/** Local woff2 (public/fonts/fonts.css): Fraunces variable 300-800 (normal + italic) and Figtree 400-800. */
export const ensureFonts = () => {
  if (typeof document === 'undefined' || injected) return;
  injected = true;
  handle = delayRender('fonts');
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = staticFile('fonts/fonts.css');
  document.head.appendChild(link);
  const loads = ['400 1em Figtree', '600 1em Figtree', '700 1em Figtree', '800 1em Figtree', '700 1em Fraunces', '800 1em Fraunces', 'italic 700 1em Fraunces'].map((f) => (document as any).fonts.load(f));
  Promise.all(loads)
    .then(() => (document as any).fonts.ready)
    .then(() => {
      if (handle !== null) continueRender(handle);
    })
    .catch(() => {
      if (handle !== null) continueRender(handle);
    });
};
