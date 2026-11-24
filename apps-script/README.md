# Analytics backend setup (about 5 minutes, one time)

Everything stays in your own Google account. No paid service.

1. Create a new Google Sheet and name it "El Sahaba Analytics".
2. In the sheet: Extensions, Apps Script. Delete the sample code and paste the full text of `analytics.gs`
   (the owner copy that has your passphrase hash filled in, NOT the placeholder one in this repo).
3. Click Deploy, New deployment, type "Web app". Execute as: Me. Who has access: Anyone. Deploy and authorize.
4. Copy the Web app URL (ends with /exec) and send it to the site developer. It goes in `analytics.js` as ENDPOINT.
   The URL is not a secret: it is only able to receive events. Reading the numbers needs your passphrase.

Privacy: no cookies, no IP addresses, no fingerprinting. Each browser tab gets a random id that is not kept after the tab closes.
Do Not Track is respected. Events stored: page views, unit views, WhatsApp/call/copy/share clicks, filter and search use,
referrer site, device type (mobile/tablet/desktop), language.

Tests: `node tests/analytics.test.js` (runs the script logic with mocked Google services).

# Units writer setup (needed for add / edit / hide from the dashboard)

Separate from your existing read-only units script, so the live site is never at risk.

1. Open your UNITS Google Sheet (the one the website reads).
2. Extensions, Apps Script. Click the + next to Files, add a new script file, and paste `units-writer.gs`
   (the owner copy with your passphrase hash filled in). Do not touch the existing files.
3. Deploy, New deployment, Web app. Execute as: Me. Who has access: Anyone. Authorize.
   (A new deployment is a new URL. The existing one that feeds the website stays as it is.)
4. Send the /exec URL to the site developer.

Safety: nothing is ever deleted. Hiding sets the `active` column to FALSE. Every add/edit/hide stores the previous row in a
tab called "changes", and Google Sheets version history also keeps every earlier state.
Tests: `node tests/units-writer.test.js`.
