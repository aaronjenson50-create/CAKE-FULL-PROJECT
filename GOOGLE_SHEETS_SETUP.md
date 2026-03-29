# 🎂 Jenz Cakes — Google Sheets Integration Guide

## Overview

```
Website (script.js)
    ↕  fetch() GET / POST
Google Apps Script Web App  (free, your Google account)
    ↕  SpreadsheetApp
Google Sheet  (your live database)
```

All changes — Add / Edit / Delete — are reflected **instantly** in the sheet, and the site re-fetches every 30 s automatically.

---

## Step 1 — Create a Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) → **+ New**
2. Rename it **"Jenz Cakes DB"** (or anything you like)
3. In **Row 1**, type these **exact** column headers (case-insensitive, but consistent):

| A | B | C | D | E |
|---|---|---|---|---|
| name | price | image | category | tag |

4. Add a few sample rows below the header, for example:

| name | price | image | category | tag |
|------|-------|-------|----------|-----|
| Dark Chocolate Truffle | 850 | https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&q=80&w=800 | chocolate | Best Seller |
| Rainbow Birthday Cake | 1200 | https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&q=80&w=800 | birthday | New |

> Keep the first row as headers. The Apps Script uses row 2 onward as data.

---

## Step 2 — Create the Google Apps Script

1. In your Google Sheet, click **Extensions → Apps Script**
2. Delete any existing code and paste the following:

```javascript
const SHEET_NAME = "Sheet1"; // Change if your sheet tab has a different name

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const data  = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toString().toLowerCase().trim());

  const rows = data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });

  return ContentService
    .createTextOutput(JSON.stringify(rows))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet   = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const { action, rowIndex, name, price, image, category, tag } = payload;

    if (action === "add") {
      sheet.appendRow([name, price, image || "", category || "", tag || ""]);
      return jsonResponse({ status: "success", message: "Row added" });
    }

    if (action === "delete") {
      sheet.deleteRow(Number(rowIndex));
      return jsonResponse({ status: "success", message: "Row deleted" });
    }

    if (action === "update") {
      const row = Number(rowIndex);
      sheet.getRange(row, 1).setValue(name);
      sheet.getRange(row, 2).setValue(price);
      sheet.getRange(row, 3).setValue(image || "");
      sheet.getRange(row, 4).setValue(category || "");
      sheet.getRange(row, 5).setValue(tag || "");
      return jsonResponse({ status: "success", message: "Row updated" });
    }

    return jsonResponse({ status: "error", message: "Unknown action" });

  } catch (err) {
    return jsonResponse({ status: "error", message: err.toString() });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Click **Save** (Ctrl+S) and name the project **"JenzCakesAPI"**

---

## Step 3 — Deploy as a Web App

1. Click **Deploy → New deployment**
2. Click the **gear icon** next to "Select type" → choose **Web app**
3. Fill in:
   - **Description**: `JenzCakes API v1`
   - **Execute as**: `Me`
   - **Who has access**: `Anyone`  ← **Required!**
4. Click **Deploy**
5. **Authorize** when prompted (pick your Google account → Allow)
6. Copy the **Web app URL** that looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

> Every time you change the Apps Script code, you must click Deploy → Manage deployments → Edit → New version → Deploy to push updates live.

---

## Step 4 — Paste the URL into script.js

Open `e:\CAKE-4-main\script.js` and find this block near the top:

```javascript
const CONFIG = {
    apiUrl: "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec",
    ...
};
```

Replace the placeholder with your actual URL:

```javascript
const CONFIG = {
    apiUrl: "https://script.google.com/macros/s/AKfycbXXXXXXXXXX/exec",
    refreshIntervalMs: 30000
};
```

> The full URL must end with `/exec` — do not remove it.

---

## Step 5 — (Optional) Change the Admin Password

In `script.js`, find:

```javascript
const ADMIN_PASSWORD = "jenzcakes2024";
```

Change the value to something private before deploying.

---

## Step 6 — Test It

1. Open `index.html` in a browser
2. Your cakes from Google Sheets load automatically
3. Click the **shield icon** in the top navigation bar to enter Admin Mode
4. Enter the admin password

---

## Admin Panel Features

| Action | How |
|--------|-----|
| **Add a cake** | Fill the "Add New Cake" form → Add Cake |
| **Edit a cake** | Click Edit on a card → edit fields → Save Changes |
| **Delete a cake** | Click Delete on a card → confirm |

All changes write **directly to Google Sheets** in real-time.

---

## Column Mapping Reference

| Sheet Column | JS Property | Notes |
|---|---|---|
| `name` | `cake.name` | Required |
| `price` | `cake.price` | Number, in Rs |
| `image` | `cake.image` | Full URL; empty = default image |
| `category` | `cake.category` | chocolate / birthday / wedding / custom |
| `tag` | `cake.tag` | Free text: Best Seller, New, etc. |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Cakes don't load | Check the apiUrl; make sure Web App is set to **Anyone** |
| CORS error in console | Re-deploy with a **New version** |
| Add / Delete / Update doesn't work | Re-deploy after adding doPost |
| "Failed to fetch" | Re-copy the URL from Deploy → Manage deployments |
| Changes don't show immediately | Click the Refresh button or wait 30 s |
