// NI Today scheduled scan: at 8 am, 3 pm and 8 pm Phoenix time (Jay, 2026-10-13: every 5 minutes was too much) look for consultation bookings
// that are new since the last look and push them to Amber's phone. Phoenix has no daylight saving, so UTC-7 all year: 15:00, 22:00, 03:00 UTC.
// The same scan also runs inside every snapshot build (app open) and on demand via POST /api/scan.
import { scanBookings, nameFromGhl } from './api.mjs';
export default async () => { const r = await scanBookings(nameFromGhl, { scheduled: true }); return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } }); };
export const config = { schedule: '0 3,15,22 * * *' };
