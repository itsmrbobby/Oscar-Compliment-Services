# Osca Complement Services — Website

Static website for **Osca Complement Services**: distribution, water purification,
building materials, engineering & construction, real estate, and frozen food.

Live: https://oscar-compliment-services.oscarcomplementservices.workers.dev/

## Structure
- `index.html`, `about.html`, `projects.html`, `distribution.html`, `contact.html`, `quote.html`
- Business units: `water.html`, `materials.html`, `engineering.html`, `realestate.html`, `frozen.html`, `distribution.html`
- `products.html` — searchable product & price list with a quote list (data: `data/products.csv`, `data/listings.csv`)
- `404.html`, `robots.txt`, `sitemap.xml`
- `style.css` (shared design system) · `main.js` (shared behaviour) · `catalog.js` (product list, quote list, listings) · `assistant.js` (site-wide chat assistant) · `config.js` (business details + settings — edit this, not the pages)
- `images/` — photos and the link-preview image (see `images/README.txt` for the exact filenames)

## Managing prices
See **PRICE-UPDATE-GUIDE.md**. Prices are edited in a spreadsheet; no backend or developer is needed after one-time setup.

## Before launch checklist
- [ ] Connect the price sheet (PRICE-UPDATE-GUIDE.md, section A) and have the client fill in prices
- [ ] Add real photos to `images/` (filenames in `images/README.txt`) the 37 category pictures (`images/categories/README.txt`) and product photos (`images/products/README.txt`)
- [x] Phone, WhatsApp and address are set in `config.js` (one place) and linked on every page
- [ ] Open Google Maps, find the business listing → Share → Copy link, and paste it into `googleMapsUrl` in `config.js`
- [ ] Confirm the opening hours on `contact.html` (they came from the original template, not the client)
- [ ] Confirm the email domain in the footer/contact page is real and receiving mail
- [ ] Connect the forms and the chat assistant: set `formEndpoint` in `config.js` (e.g. your Formspree address)
- [ ] Verify every business claim (certifications, fleet size, project list, statistics)
- [ ] Add real leadership names and photos on `about.html`

Designed by [VibrantRevolve](mailto:vr@vibrantrevolve.com).
