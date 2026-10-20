// Nutrition Intuition brand tokens (NI Today app :root, public/index.html; website tokens). 2026-10-20.
// House style v2: three flat stages + ONE accent (sage). No gradients, no glows. Amber is reserved for attention only.
export const C = {
  // NI palette
  paper: '#FBF8F1', // cream paper stage
  ink: '#171B14', // dark olive ink stage
  head: '#3E4736', // olive heading colour on paper = the flood "stage" colour
  headDark: '#F2EDE1', // heading colour on ink
  text: '#2E352A',
  textDark: '#E9E4D6',
  sage: '#A3B55D', // THE accent
  amber: '#D9B45A', // attention (flags)
  // aliases the shared primitives (ui.tsx, Lead.tsx, Phone.tsx) read
  green: '#3E4736',
  greenDark: '#2E352A',
  greenDeep: '#171B14',
  greenInk: '#171B14',
  greenLight: '#A3B55D',
  cream: '#FBF8F1',
  natural: '#E6E0D1', // quiet rules on paper
  charcoal: '#2E352A', // ink text on paper
  gray: '#6F756A',
  grayLight: '#A9AEA3',
  white: '#F2EDE1', // "white" on the dark stages is the cream heading colour
  red: '#B5473C',
  accent: '#A3B55D',
  stage: '#3E4736',
};

/** Two families, like the app: Fraunces (serif display, 700-800) and Figtree (sans body, 400-700). */
export const F = {
  display: 'Fraunces, Georgia, "Times New Roman", serif',
  body: 'Figtree, "Helvetica Neue", Arial, sans-serif',
};
