// Everything the app reads comes from the Frescopa site on AEM Edge Delivery Services.
// It shows published content (previewed content while CONTENT_ROOT is under /drafts).
// With ?preview it shows previewed content: that's how Frescopa Studio shows authors
// their changes before they publish.
export const ORG = 'scdemos';
export const SITE_NAME = 'demo';
// Where the Frescopa content lives in the site (a folder such as /drafts/frescopa while
// it's authored there), and the site branch that serves its code.
const CONTENT_ROOT = '';
const BRANCH = 'main';
// ?preview: Frescopa Studio opened the app, so it reads previewed content and takes
// the author's drafts from Studio.
export const STUDIO_PREVIEW = new URLSearchParams(window.location.search).has('preview');
// Draft pages aren't published, so while the content lives under /drafts the app
// always reads previewed content.
export const PREVIEW = CONTENT_ROOT.startsWith('/drafts/') || STUDIO_PREVIEW;
// While developing (app on localhost), site code and content come from `aem up` on
// localhost:3000, so site changes can be tried with the app before they're pushed.
export const LOCAL = window.location.hostname === 'localhost';
export const SITE = LOCAL
  ? 'http://localhost:3000'
  : `https://${BRANCH}--${SITE_NAME}--${ORG}.aem.${PREVIEW ? 'page' : 'live'}`;
// The site's content is organised by language: /en, /de, …
export const LOCALE = `${CONTENT_ROOT}/en`;

/** Fragments live in the shared /fragments folder or in a language folder's own. */
export function isFragmentPath(path) {
  return [`${CONTENT_ROOT}/fragments/`, `${LOCALE}/fragments/`].some((root) => path.startsWith(root));
}

// The app document: tabs, quick actions, featured campaign, screen text and labels.
// Authored as structured content in DA and delivered as JSON.
// See https://www.aem.live/docs/ew/administering/structured-content
// Which app document to show: ?doc= names one in an /app folder of the site (Frescopa
// Studio passes the document it edits, e.g. /en/app/experience-next for a next release).
const DOC_PARAM = new URLSearchParams(window.location.search).get('doc') || '';
export const DOCUMENT = /^(\/[a-z0-9][a-z0-9-]*)*\/app\/[a-z0-9][a-z0-9-]*$/.test(DOC_PARAM)
  ? DOC_PARAM
  : `${LOCALE}/app/experience`;
export const EXPERIENCE = `https://da-sc.adobeaem.workers.dev/${PREVIEW ? 'preview' : 'live'}/${ORG}/${SITE_NAME}${DOCUMENT}`;

/**
 * Absolute URL on the site for a site path. Anything that resolves to another host
 * (e.g. `//host/x` or a full URL) is refused: aem-embed runs the code of the site it
 * embeds, so content must never be able to point the app at another site.
 */
export function siteUrl(path) {
  const url = new URL(path, SITE);
  if (url.origin !== SITE) throw new Error(`not a site path: ${path}`);
  return url.href;
}

// Edge Commerce serves the site's products (their pages, index and images) from aem.network. Its
// product index has no CORS, so the app reads it through the site's CloneIt worker, which adds it.
const NETWORK = `https://${BRANCH}--${SITE_NAME}--${ORG}.aem.network`;
// product images Edge Commerce hasn't copied yet still point at the site's published media
const LIVE = `https://${BRANCH}--${SITE_NAME}--${ORG}.aem.live`;
const PRODUCT_INDEX = `https://demo.bbird.live/cloneit/products/${ORG}/${SITE_NAME}`;

/** Absolute URL of an image from the site, or from its products (aem.network, or its published media). */
export function mediaUrl(path) {
  const url = new URL(path, SITE);
  if (![SITE, NETWORK, LIVE].includes(url.origin)) throw new Error(`not a site image: ${path}`);
  return url.href;
}

export async function getJSON(path) {
  const resp = await fetch(siteUrl(path));
  if (!resp.ok) throw new Error(`${path}: ${resp.status}`);
  return resp.json();
}

/** Rows of a single sheet, or of a query index. */
export async function getSheet(path) {
  return (await getJSON(path)).data;
}

/**
 * The site's products, in the order of its products sheet, from Edge Commerce's product index (published
 * products). Rows have the sheet's columns; url is the product page and image an absolute URL.
 */
export async function getProducts(index) {
  const resp = await fetch(`${PRODUCT_INDEX}${index}`);
  if (!resp.ok) throw new Error(`${index}: ${resp.status}`);
  return ((await resp.json()).data ?? [])
    .map((row) => ({
      ...row,
      url: row.path,
      image: row.image ? new URL(row.image, `${NETWORK}${row.path.replace(/[^/]*$/, '')}`).href : '',
    }))
    .sort((a, b) => (Number(a.position) || 0) - (Number(b.position) || 0));
}

/** The app document's data. */
export async function getExperience() {
  const resp = await fetch(EXPERIENCE, { cache: 'no-cache' });
  if (!resp.ok) throw new Error(`app document: ${resp.status}`);
  return (await resp.json()).data;
}

let embedReady;
/**
 * Loads the aem-embed web component and the site's fonts, once.
 * See https://www.aem.live/docs/aem-embed
 */
export function loadEmbed() {
  if (!embedReady) {
    // @font-face does not apply inside shadow DOM, so the host page loads the site fonts
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = siteUrl('/styles/fonts.css');
    document.head.append(fonts);
    embedReady = import(siteUrl('/scripts/aem-embed.js'));
  }
  return embedReady;
}

/**
 * An <aem-embed> for a site page or fragment, rendered by the site's own code.
 * @param {string} path site path, e.g. /fragments/booking-experience
 * @param {string} [query] prefill values for blocks that read them (booking)
 */
export function embed(path, query = '') {
  const url = siteUrl(path);
  loadEmbed();
  const node = document.createElement('aem-embed');
  node.setAttribute('url', url);
  if (query) node.dataset.query = query;
  return node;
}
