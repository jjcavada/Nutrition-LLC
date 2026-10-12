/**
 * Nutrition Intuition - Chef Assignment sheet
 * ------------------------------------------------------------------
 * Amber picks a chef from the dropdown in column E.
 * That fires a POST to Make, which emails the chef BOTH the client's
 * intake form and the 15-item menu, and writes the chef back into GHL.
 *
 * ONE-TIME SETUP (about 2 minutes, do this once):
 *   1. Paste this whole file into Code.gs (replace what is there)
 *   2. Save (disk icon)
 *   3. In the function dropdown at the top choose  setup  and click Run
 *   4. Google will ask you to authorise. Approve it.
 *   5. Done. Nothing else to run, ever.
 *
 * To add or change a chef later, edit CHEFS below and run  setup  again.
 * The same chef list also lives in the Make scenario (module 5), so tell
 * Claude to update Make to match.
 */

// ---------------------------------------------------------------- config

var MAKE_WEBHOOK = 'https://hook.us2.make.com/u61w8d7yp6wl7eu4bs68ggezde6p8uwa';

var COL = { NAME: 1, EMAIL: 2, CONTACT_ID: 3, MENU_BUILT: 4, CHEF: 5, STATUS: 6 };

var HEADERS = ['Client Name', 'Client Email', 'Contact ID', 'Menu Built', 'Assigned Chef', 'Status'];

var CHEFS = [
  'Ashley Brown',
  'Carey Shindler',
  'Catherine Erickson',
  'Christian Salem',
  'Ebony Lomeli',
  'Elizabeth Meinz',
  'Emily Bristol',
  'Emily Shaw',
  'Georgina Anthony',
  'Hannah Arneson',
  'Hannah Zieser',
  'James Armstrong',
  'Joshua Hebert',
  'Kameryn Buttrey',
  'Kiyara Brown',
  'Matthew Dewey',
  'Viana Nyguen',
  'Angelica Ortiz'        // added 2026-10-12. NOTE: since 2026-10-12 the dropdown is rebuilt by Make Phase 9 from the GHL options; do NOT run setup() again, it would overwrite it.
];

// ---------------------------------------------------------------- setup

/**
 * Run this ONCE by hand. Safe to re-run any time (it will not duplicate
 * the trigger and it will not touch existing rows).
 */
function setup() {
  var sheet = getSheet_();

  // headers
  sheet.getRange(1, 1, 1, HEADERS.length)
       .setValues([HEADERS])
       .setFontWeight('bold')
       .setBackground('#8FA04A')
       .setFontColor('#ffffff');
  sheet.setFrozenRows(1);

  // chef dropdown down column E
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(CHEFS, true)
    .setAllowInvalid(false)
    .setHelpText('Pick the chef assigned to this client.')
    .build();
  sheet.getRange(2, COL.CHEF, Math.max(sheet.getMaxRows() - 1, 500), 1)
       .setDataValidation(rule);

  // readability
  sheet.setColumnWidth(COL.NAME, 200);
  sheet.setColumnWidth(COL.EMAIL, 240);
  sheet.setColumnWidth(COL.CONTACT_ID, 190);
  sheet.setColumnWidth(COL.CHEF, 180);
  sheet.setColumnWidth(COL.STATUS, 340);
  sheet.getRange(2, COL.CONTACT_ID, sheet.getMaxRows() - 1, 1).setFontColor('#999999');

  installTrigger_();
  SpreadsheetApp.getActiveSpreadsheet().toast('Setup complete. Pick a chef in column E to send.', 'Ready', 8);
}

function installTrigger_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ScriptApp.getProjectTriggers();
  for (var i = 0; i < existing.length; i++) {
    if (existing[i].getHandlerFunction() === 'onChefAssigned') {
      ScriptApp.deleteTrigger(existing[i]);           // avoid duplicates on re-run
    }
  }
  ScriptApp.newTrigger('onChefAssigned')
           .forSpreadsheet(ss)
           .onEdit()
           .create();
}

// ------------------------------------------------- the actual assignment

/**
 * Installable onEdit trigger. Fires when Amber picks a chef.
 * (A simple onEdit cannot call external URLs, which is why setup()
 * installs this one instead.)
 */
function onChefAssigned(e) {
  try {
    if (!e || !e.range) return;

    var sheet = e.range.getSheet();
    if (sheet.getSheetId() !== getSheet_().getSheetId()) return;   // only the assignment tab
    if (e.range.getColumn() !== COL.CHEF) return;                    // only the chef column
    if (e.range.getRow() < 2) return;                                // never the header

    var row  = e.range.getRow();
    var chef = String(e.range.getValue() || '').trim();
    if (!chef) {                                                     // cleared the cell
      sheet.getRange(row, COL.STATUS).setValue('Pending: pick a chef').setFontColor('#b26a00');
      return;
    }

    var clientName = String(sheet.getRange(row, COL.NAME).getValue() || '').trim();
    var contactId  = String(sheet.getRange(row, COL.CONTACT_ID).getValue() || '').trim();

    if (!contactId) {
      sheet.getRange(row, COL.STATUS)
           .setValue('Not sent: this row has no Contact ID')
           .setFontColor('#b00020');
      return;
    }

    sheet.getRange(row, COL.STATUS).setValue('Sending...').setFontColor('#666666');
    SpreadsheetApp.flush();

    var res = UrlFetchApp.fetch(MAKE_WEBHOOK, {
      method: 'post',
      contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({
        contactId:  contactId,
        chefName:   chef,
        clientName: clientName,
        source:     'chef-assignment-sheet'
      })
    });

    var code = res.getResponseCode();
    var when = Utilities.formatDate(new Date(), 'America/Phoenix', 'MMM d, h:mm a');

    if (code >= 200 && code < 300) {
      sheet.getRange(row, COL.STATUS)
           .setValue('Sent to ' + chef + ' on ' + when)
           .setFontColor('#2e7d32');
    } else if (code === 409) {
      // Make answered: this client has no 15-item menu yet, so the chef got nothing.
      sheet.getRange(row, COL.STATUS)
           .setValue('NOT sent: no menu built yet for this client. Clear the chef and pick again once the menu exists.')
           .setFontColor('#b26a00');
    } else {
      sheet.getRange(row, COL.STATUS)
           .setValue('FAILED (' + code + '). Tell JJ. Nothing was sent to ' + chef + '.')
           .setFontColor('#b00020');
    }
  } catch (err) {
    try {
      e.range.getSheet().getRange(e.range.getRow(), COL.STATUS)
       .setValue('FAILED: ' + err).setFontColor('#b00020');
    } catch (ignored) {}
  }
}

// ------------------------------------- endpoint so Make can add new rows

/**
 * OPTIONAL. Lets Make (Phase 3, AI Menu Generator) append a client row
 * automatically the moment their menu is built, so nobody types anything.
 *
 * DEPLOYED 2026-09-08 as Web app (Execute as Me, access Anyone):
 *   https://script.google.com/macros/s/AKfycbwn0gZIYZ66ERlfpS3QK5pD_8nt0YjG34YXD8GPMdEC-mmDfbQxZynj4lRq79Byv4YR8g/exec
 * Make Phase 3 (4082143) POSTs here after every menu build.
 * After ANY code change: Deploy > Manage deployments > pencil > Version: New version > Deploy,
 * otherwise /exec keeps running the old version.
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    if (!body.contactId) {
      return json_({ ok: false, error: 'contactId is required' });
    }

    var sheet = getSheet_();

    // do not add the same client twice while they are still waiting for a chef
    // (a client who already had a chef assigned gets a fresh row, e.g. a re-order)
    var last = sheet.getLastRow();
    if (last >= 2) {
      var rows = sheet.getRange(2, COL.CONTACT_ID, last - 1, COL.CHEF - COL.CONTACT_ID + 1).getValues();
      for (var i = 0; i < rows.length; i++) {
        var sameContact = String(rows[i][0]).trim() === String(body.contactId).trim();
        var stillPending = String(rows[i][COL.CHEF - COL.CONTACT_ID]).trim() === '';
        if (sameContact && stillPending) {
          return json_({ ok: true, skipped: 'already listed and still pending', row: i + 2 });
        }
      }
    }

    sheet.appendRow([
      body.clientName || '',
      body.clientEmail || '',
      body.contactId,
      body.menuBuilt || Utilities.formatDate(new Date(), 'America/Phoenix', 'yyyy-MM-dd'),
      '',
      'Pending: pick a chef'
    ]);
    sheet.getRange(sheet.getLastRow(), COL.STATUS).setFontColor('#b26a00');
    return json_({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---------------------------------------------------------------- utils

/** The assignment tab: whatever the first tab in this spreadsheet is called. */
function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}
