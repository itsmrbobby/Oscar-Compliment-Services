/* ============================================================
   SITE SETTINGS — the ONE place to change business details.
   Edit the values in the "YOUR DETAILS" section, save, upload.
   Every phone link, WhatsApp button, map link and address on
   every page updates from here automatically.
   ============================================================ */
window.OSCA_CONFIG = {

  /* ---------- YOUR DETAILS ---------- */
  business: {
    name: "Osca Complement Services",
    phone: "0810 580 3774",                    // used for "tap to call" AND WhatsApp
    email: "info@oscarcomplementservices.com", // confirm this mailbox exists
    addressLines: [
      "Sebele Hotel bus stop, Eledi Atala",
      "Itele Rd, Oke Oke",
      "Ota 121101, Ogun State"
    ],
    addressShort: "Ota, Ogun State, Nigeria",  // shown in the footer
    // Optional: open Google Maps, find the business listing, tap Share -> Copy link,
    // and paste it here so "View on Google Maps" opens the exact listing (reviews, photos).
    googleMapsUrl: ""
  },

  // Leave "" to use the phone number above for WhatsApp too.
  // Or set a different WhatsApp number, e.g. "2348012345678".
  whatsapp: "",

  // Form service URL (e.g. Formspree: "https://formspree.io/f/xxxx"). While empty, the contact
  // and quote forms open the visitor's email app with the message ready to send to the business email.
  formEndpoint: "",

  /* ---------- LIVE PRICES (optional) ---------- */
  priceSheetCsv: "",      // Google Sheet "Website Prices" tab, Publish to web -> CSV link
  listingsSheetCsv: ""    // Google Sheet "Property Listings" tab
};

/* ---------- derived values (do not edit below this line) ---------- */
(function (c) {
  var b = c.business || (c.business = {});
  function digits(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function intl(s) {
    var d = digits(s);
    if (!d) return '';
    if (d.indexOf('234') === 0) return d;
    return d.charAt(0) === '0' ? '234' + d.slice(1) : d;
  }
  function display(s) {
    var d = digits(s);
    if (d.indexOf('234') === 0) d = '0' + d.slice(3);
    return d.length === 11 ? d.slice(0, 4) + ' ' + d.slice(4, 7) + ' ' + d.slice(7) : String(s || '');
  }
  c.phoneIntl = intl(b.phone);
  c.phoneTel = c.phoneIntl ? '+' + c.phoneIntl : '';
  c.phoneDisplay = display(b.phone);
  c.whatsappDigits = digits(c.whatsapp) ? intl(c.whatsapp) : c.phoneIntl;
  c.addressFull = (b.addressLines || []).join(', ');
  var q = encodeURIComponent((b.name || '') + ', ' + c.addressFull);
  c.mapsUrl = b.googleMapsUrl || ('https://www.google.com/maps/search/?api=1&query=' + q);
  c.directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=' + q;
  c.mapsEmbed = 'https://www.google.com/maps?q=' + q + '&output=embed';
})(window.OSCA_CONFIG);
