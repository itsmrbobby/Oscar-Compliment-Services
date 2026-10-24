# Switching on the admin area with Cloudflare (about 15 minutes, free, no card needed)

You keep using **GitHub** for the code. **Cloudflare** hosts the site and runs the admin area:
- **Cloudflare Pages** publishes your GitHub repo as the website
- **D1** (a small database) stores requests, price changes, edited text and uploaded photos
- **A password you choose** protects the admin area (stored as a secret in Cloudflare, never in the website code)

After this, at `/admin.html` you can see quote and contact requests, change product prices, edit page text and replace photos from your phone.
Until you finish, the site works as normal and the admin page says it is not connected.

## 1. Publish the site on Cloudflare Pages
1. Sign in (or sign up, free) at https://dash.cloudflare.com
2. **Workers & Pages → Create → Pages → Connect to Git** → choose your website repo.
3. Framework preset: **None**. Build command: leave empty. Build output directory: the folder that contains `index.html` (use `/` if `index.html` is at the top of your repo).
4. **Save and Deploy**. You get an address like `osca-complement.pages.dev`.

> The `functions` folder must sit next to `index.html` in the repo. It is already that way in these files, so just upload everything.

## 2. Create the database
1. **Storage & Databases → D1 → Create database** → name it `osca-db`.
2. Open it → **Console** tab → paste the whole contents of **schema.sql** → **Execute**.

## 3. Connect the database to the site
1. **Workers & Pages →** your Pages project **→ Settings → Bindings → Add → D1 database**.
2. Variable name: **DB** (exactly, capitals). Database: `osca-db`. Save.

## 4. Set the admin password
1. Pick a **long passphrase** that nobody could guess (at least 12 characters; three or four random words works well). The site refuses anything shorter than 10.
2. **Pages project → Settings → Variables and Secrets → Add**, type **Secret**, name `ADMIN_PASSWORD`, value = your passphrase. Save.
3. **Deployments → Retry deployment** (or push any change to GitHub) so the setting takes effect.

## 5. Use it
Open `https://YOUR-SITE/admin.html`, type the password, and the admin screen opens. There is also a small "Staff login" link in the website footer. You stay signed in for 12 hours on that device.

## How it stays secure
- The password is compared on Cloudflare's servers, in a way that does not leak information through timing.
- Wrong guesses are limited: 5 wrong tries from one device locks it out for 15 minutes, and a total cap protects against many devices guessing together.
- The login cookie is private to the browser (not readable by scripts), only sent over secure connections, and not sent from other websites.
- Every admin action is re-checked on the server. Anyone without a valid login gets "Not allowed", even if they know the address.
- **Change the password any time:** edit the `ADMIN_PASSWORD` secret and redeploy. Everyone is signed out immediately.
- Keep the password in a password manager, and do not share it in chats or emails.

## Good to know
- **Photo caching:** the file `_headers` tells browsers to keep photos for 7 days so pages load faster. If you replace a photo by uploading a new file with the *same name* through GitHub, some visitors may see the old one for up to a week. Replacing it from the admin Photos tab updates it straight away.
- **Custom domain later?** Add it to the Pages project. Nothing else to change.
- Uploaded photos are shrunk automatically and stored in the database. Removing one goes back to the file in the `images/` folder. Empty text boxes go back to the original wording.
- Free limits (100,000 requests a day on Pages Functions, 5 million database reads a day) are far above what this site needs.
- Quote and contact form messages are saved in the admin inbox **and** still open WhatsApp as before.
- If you ever want one-time email codes instead of a password, Cloudflare Access can be added later (it needs a card on file, with no charge on the free plan).
