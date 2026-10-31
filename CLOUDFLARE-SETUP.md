# Switching on the admin area with Cloudflare (about 15 minutes, free, no card needed)

You keep using **GitHub** for the code. **Cloudflare** hosts the site and runs the admin area:
- **Cloudflare Pages** publishes your GitHub repo as the website
- **D1** (a small database) stores requests, price changes, edited text and uploaded photos
- **A password you choose** protects the admin area (stored as a secret in Cloudflare, never in the website code)

After this, at `/admin.html` you can see quote and contact requests, change product prices, edit page text and replace photos from your phone.
Until you finish, the site works as normal and the admin page says it is not connected.

## 1. Publish the site from GitHub
1. Sign in (or sign up, free) at https://dash.cloudflare.com
2. **Workers & Pages → Create application → Import a repository** (Git) → choose your website repo.
3. Leave the build command empty. The deploy command `npx wrangler deploy` is correct. These files already include `wrangler.jsonc`, which tells Cloudflare everything it needs.
4. Save and deploy. You get an address like `oscar-compliment-services.YOURNAME.workers.dev`.

> Put **all** the files at the top of the repo, next to `index.html`: including `worker.js`, `wrangler.jsonc`, `.assetsignore` and the `functions` folder. `.assetsignore` keeps the code, the `.git` folder and these guides from being published as web pages.
> If Cloudflare offered "Pages" instead of a Worker, that also works, but then ignore `worker.js`, `wrangler.jsonc` and `.assetsignore`, and use the Pages database binding in step 3.

## 2. Create the database
1. **Storage & Databases → D1 → Create database** → name it `osca-db`.
2. Open it → **Console** tab → paste the SQL from **schema.sql** into the box → **Execute**. (Type `/tables` afterwards to check four tables exist.)

## 3. Connect the database to the site
`wrangler.jsonc` already connects it, using the name `DB` and the database named `osca-db`. If you created a **new** database, open `wrangler.jsonc` and replace the `database_id` with the one shown on the database's **Overview** page. Do not add a second binding in the dashboard, because the file is the one that counts.

## 4. Set the admin password
1. Pick a **long passphrase** that nobody could guess (at least 12 characters; three or four random words works well). The site refuses anything shorter than 10.
2. Open your Worker (**Workers & Pages →** your project **→ Settings → Variables and Secrets → Add**), type **Secret**, name `ADMIN_PASSWORD`, value = your passphrase. Save and deploy.
3. If it was not added as a *Secret* (encrypted), add it again that way, because plain settings are wiped on each deploy.

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
- **Custom domain later?** Add it to the Worker under Settings → Domains & Routes. Nothing else to change.
- Uploaded photos are shrunk automatically and stored in the database. Removing one goes back to the file in the `images/` folder. Empty text boxes go back to the original wording.
- Free limits (100,000 requests a day on Pages Functions, 5 million database reads a day) are far above what this site needs.
- Quote and contact form messages are saved in the admin inbox **and** still open WhatsApp as before.
- If you ever want one-time email codes instead of a password, Cloudflare Access can be added later (it needs a card on file, with no charge on the free plan).

## Email alerts for new requests (optional)
New quote, contact and chat requests always land in the admin inbox. To also get an email each time:
1. Make a free account at resend.com, create an API key.
2. In Cloudflare open your Worker, Settings, Variables and Secrets, and add:
   - `RESEND_API_KEY` as a **Secret** (the key from Resend)
   - `NOTIFY_EMAIL` as text: the address that should receive alerts (several allowed, separated by commas)
   - `NOTIFY_FROM` (optional): e.g. `Osca Website <alerts@yourdomain.com>` once your domain is verified in Resend
3. Deploy again.
Until you verify your own domain in Resend, alerts are sent from Resend's test address and can only go to the email you used to open the Resend account. If the settings are missing, the site simply skips the email and everything else works as before.
