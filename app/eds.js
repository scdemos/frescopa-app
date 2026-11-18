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
export const EXPERIENCE = `https://da-sc.adobeaem.workers.dev/${PREVIEW ? 'preview' : 'live'}/${ORG}/${SITE_NAME}${LOCALE}/app/experience`;

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

export async function getJSON(path) {
  const resp = await fetch(siteUrl(path));
  if (!resp.ok) throw new Error(`${path}: ${resp.status}`);
  return resp.json();
}

/** Rows of a single sheet, or of a query index. */
export async function getSheet(path) {
  return (await getJSON(path)).data;
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
