# How prices work on this website

The site has **no backend**. Prices live in a spreadsheet, and the website reads them.
Change a price in the spreadsheet → the website shows it within a few minutes. No developer needed.

The spreadsheet is **`Osca_Website_Price_List.xlsx`** (delivered separately). It contains 345 products
(136 frozen foods from the client's own master list, plus Nigerian building-materials, water-purification
and general-supplies categories). All prices are blank until the client fills them in — blank shows
"Price on request" on the site.

---

## A. One-time setup (developer, ~10 minutes)

1. Upload `Osca_Website_Price_List.xlsx` to the client's Google Drive. Double-click → **Open with Google Sheets**.
2. In Sheets: **File → Settings → Locale → Nigeria** (so dates read day-first).
3. Go to **File → Share → Publish to web**.
4. In the first dropdown choose the **“Website Prices”** tab (NOT “Entire document”). In the second choose
   **Comma-separated values (.csv)**. Click **Publish** and copy the link.
5. Open `config.js` in this site and paste the link:
   ```js
   priceSheetCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=0&single=true&output=csv",
   ```
6. Repeat steps 3–4 for the **“Property Listings”** tab and paste into `listingsSheetCsv`.
7. WhatsApp is already on: it uses the business phone number in `config.js`. (Set `whatsapp` there only if WhatsApp uses a different number.)
8. Upload the changed `config.js` to GitHub. Done — this is only ever done once.

> ⚠️ Publishing makes that tab public. Only the “Website Prices” and “Property Listings” tabs are meant
> for that. **Never put cost prices, supplier names or stock counts in this file**, and keep the client's
> private master list as a separate document.

If the live link ever fails, the site automatically shows the built-in list in `data/products.csv`,
so visitors never see a broken page.

## B. Day-to-day (client)

1. Open the Google Sheet (works on a phone too) → **Website Prices** tab.
2. Find the product (filter arrows on the top row, or Ctrl+F).
3. Type the price in **Price (₦)** — numbers only, e.g. `4500`.
4. Pick **Price Per** (kg, carton, pack…). The cell turns yellow if you forget.
5. Put today's date in **Updated** (Ctrl + ;). The site shows “Prices last updated …”.

| Want to… | Do this |
|---|---|
| Mark out of stock | Status → **Out of stock** (stays listed, can't be added to a quote) |
| Remove an item from the site | Status → **Hidden** (don't delete the row) |
| Add a product | Add a row at the bottom, copying an existing Business Unit and Category name exactly |
| Add a property | **Property Listings** tab → fill a row → Status **Available** / **Reserved** / **Sold** |

Don't rename or reorder the heading row, and type final prices as plain numbers (no formulas).

## C. Without Google (fallback)

In Excel: open the **Website Prices** tab → **File → Save As → CSV UTF-8** → name it `products.csv`.
On GitHub, open the `data` folder → **Add file → Upload files** → upload it over the old one.
The site updates in a minute or two. (Same for `listings.csv`.)

## Category pictures

The Products page opens on a grid of **category tiles** (like an online shop). Each tile shows a photo from
`images/categories/<unit>/<category>.jpg` — the exact filename for all 37 categories is listed in
`images/categories/README.txt`. Until a photo is added the tile shows a neat icon, so photos can be added one by one.
If the client adds a **new category** in the sheet, a tile appears automatically; its photo name follows the same pattern.

## Product photos vs category pictures

These are two separate sets, so a category tile never reuses a product's photo:

* **Category tiles:** `images/categories/<unit>/<category>.jpg` (list: `images/categories/README.txt`).
* **Product cards:** `images/products/<SKU>.jpg`, e.g. `FF001.jpg` (see `images/products/README.txt`).

Until a photo exists, each category tile and its products show unique generated artwork in that category's own
colours and pattern, so nothing looks repeated or broken. Add photos gradually, bestsellers first.

## The chat assistant (replaces the WhatsApp icon)

The round button at the bottom-right opens **Osca Assistant**, an automated guide that follows the visitor across
every page. It runs entirely in the browser — no server, nothing to pay for. It can:

* search all 345 products (understands typos and local words like "pure water" and "zinc"), and add items to the quote list;
* take a quote request in chat (name, phone, need) and send it to the team;
* give the address, directions, phone and WhatsApp, and open Google Maps;
* point people to the right page, and hand over to a real person on WhatsApp with the conversation summarised.

It is honest by design: it says it is automated, shows "Price on request" when a price isn't in the sheet, and never
invents delivery terms, payment terms, brands, certifications or opening hours — it sends those questions to the team.

**Settings** (`config.js`): `assistant.enabled` (false = plain WhatsApp button instead), `assistant.name`,
`typingDelay`. Chat history lives only in the visitor's own browser tab.

**To make quote requests actually arrive:** set `formEndpoint` in `config.js` to your Formspree address. The contact
form, the quote form and the assistant all use that one setting. Until it is set, the assistant only offers
"Send on WhatsApp" (it never claims something was sent when it wasn't).

**Optional — real AI answers.** Set `assistant.endpoint` to a small web service you host that accepts
`POST {message, page, history:[{role,text}]}` and returns `{"reply":"…"}`. The assistant only calls it for questions
its built-in knowledge can't answer, and falls back to its normal reply if the service is slow or down. Keep any AI
API key inside that service, never in this website's files.

## What visitors can do

* Browse by business unit → category pictures → products, or search across everything.
* Add products to a **quote list**; it follows them to the quote form and is sent with the request.
* Order on WhatsApp (when a number is set in `config.js`).

## Contact details (phone, WhatsApp, address, map)

All of these live in `config.js` under `business`. Change a value there and every page — footer, contact page,
quote page, the floating WhatsApp button, "tap to call" links and map buttons — updates by itself.
The site and the Google Business Profile are two separate records: if the phone or address ever changes,
update `config.js` **and** the Google listing so they match.
