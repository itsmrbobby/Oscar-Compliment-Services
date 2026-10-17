# Osca Complement Services — Website

Static website for **Osca Complement Services**: distribution, water purification,
building materials, engineering & construction, real estate, and frozen food.

Live: https://itsmrbobby.github.io/Oscar-Compliment-Services/

## Structure
- `index.html`, `privacy.html`, `about.html`, `projects.html`, `distribution.html`, `contact.html`, `quote.html`
- Business units: `water.html`, `materials.html`, `engineering.html`, `realestate.html`, `frozen.html`, `distribution.html`
- `products.html` — searchable product & price list with a quote list (data: `data/products.csv`, `data/listings.csv`)
- `404.html`, `robots.txt`, `sitemap.xml`
- `style.css` (shared design system) · `main.js` (shared behaviour) · `catalog.js` (product list, quote list, listings) · `config.js` (business details + settings — edit this, not the pages)
- `images/` — photos and the link-preview image (see `images/README.txt` for the exact filenames)

## Managing prices
See **PRICE-UPDATE-GUIDE.md**. Prices are edited in a spreadsheet; no backend or developer is needed after one-time setup.

## Social links
Edited in the admin dashboard (Social links tab) or in `data/settings.json`. Empty ones are hidden.

## Before launch checklist
- [ ] Connect the price sheet (PRICE-UPDATE-GUIDE.md, section A) and have the client fill in prices
- [ ] Add real photos to `images/` (filenames in `images/README.txt`) and the 37 category pictures (`images/categories/README.txt`)
- [x] Phone, WhatsApp and address are set in `config.js` (one place) and linked on every page
- [ ] Open Google Maps, find the business listing → Share → Copy link, and paste it into `googleMapsUrl` in `config.js`
- [ ] Confirm the opening hours on `contact.html` (they came from the original template, not the client)
- [ ] Confirm the email domain in the footer/contact page is real and receiving mail
- [ ] Connect the forms: paste a Formspree URL into `formEndpoint` in `config.js` (until then forms open the visitor's email app)
- [ ] Verify every business claim, then restore the hidden Certifications block in `engineering.html` (commented out) and real project/year stats on the homepage
- [ ] Have privacy.html reviewed (it is a standard draft, not legal advice)
- [ ] Add real leadership names and photos on `about.html`

Designed by [VibrantRevolve](mailto:vr@vibrantrevolve.com).
