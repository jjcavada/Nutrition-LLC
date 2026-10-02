# Validation contract: new chef onboarding link on the website (2026-10-02)

**Ask (Amber):** where is the link for bringing on a new contractor, and can it also send what she needs to put them on the website?
**Jay:** keep it the way it is set up now (same Make automation), on her website, and the background check must run automatically.

**Build:**
- New page `https://www.nutritionintuitionaz.com/new-chef/` (noindex, not in the sitemap or nav) with the same 4 fields as the old form
  (`contractor.aznutritionintuition.shop`) posting the same JSON to the same Make hook (scenario 4446319). The old link keeps working.
- Make 4446319 welcome email (module 6) gets item 5 "Your website profile" with the existing chef profile Google Form link; the GHL note
  (module 10) records it. Error alerts to jjcavada1@gmail.com added on the outbound steps so a failure is never silent (GR-002).

| # | Sev | Assertion | Evidence |
|---|---|---|---|
| N1 | HIGH | `/new-chef/` is live, noindex, absent from sitemap.xml and nav | live fetch |
| N2 | HIGH | Submitting posts `{first_name,last_name,full_name,email,phone}` as JSON to `hook.us2.make.com/6ypm3oeyw4t9gbpoztabfs4k3k49dsc7` (identical to the old form) | browser test with fetch intercepted, no real send |
| N3 | HIGH | A confirm step names the email before anything is sent (it triggers a real agreement, QuickBooks vendor and background check) | browser test |
| N4 | HIGH | 4446319 still active, valid, same module chain: GHL contact, opportunity, QuickBooks vendor, SignWell agreement, packet email, Checkr candidate, Checkr invitation (Basic Plus Criminal), stage move, note | blueprint read-back |
| N5 | HIGH | Checkr connection 7871197 works and the package `checkrdirect_basic_plus_criminal` exists | RPC `packcages` read |
| N6 | HIGH | Welcome email includes item 5 with the profile form link; the link returns 200 | blueprint read-back + HTTP check |
| N7 | MED | Outbound steps (SignWell, email, Checkr x2, note) have error alerts to jjcavada1@gmail.com with Resume | blueprint read-back |
| N8 | HIGH | No test contractor pushed through the live flow (it would create a real QB vendor, SignWell agreement and Checkr invitation) | absence of new executions |

Note: an end-to-end live run is deliberately NOT done (N8). First real use by Amber is the live proof; Jay is watching for the alert emails.
