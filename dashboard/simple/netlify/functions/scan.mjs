// NI Today scheduled scan: every 5 minutes look for consultation bookings that are new since the last look and push them to Amber's phone.
// The same scan also runs inside every snapshot build (app open) and on demand via POST /api/scan.
import { scanBookings, nameFromGhl } from './api.mjs';
export default async () => { const r = await scanBookings(nameFromGhl, { scheduled: true }); return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } }); };
export const config = { schedule: '*/5 * * * *' };
