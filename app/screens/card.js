import { mediaUrl } from '../eds.js';
import { el } from '../ui.js';

/** A tappable offer or product card. */
/** The card's image, when it comes from the site or its products; any other image is left out. */
function image(path) {
  try {
    return path ? mediaUrl(path) : '';
  } catch {
    return '';
  }
}

export default function card(item, { highlight = false, details = [] } = {}) {
  const src = image(item.image);
  return el(`button.card${highlight ? '.highlight' : ''}`, { type: 'button', 'data-link': item.url },
    src && el('img', { src, alt: '', loading: 'lazy' }),
    el('span.card-meta', {},
      item.badge && el('span.badge', {}, item.badge),
      el('span.card-for', {}, item.audience ?? item.category)),
    el('span.card-title', {}, item.title),
    el('span.card-text', {}, item.summary),
    details.length > 0 && el('span.card-details', {}, details.map((d) => el('span', {}, d))),
    el('span.card-price', {}, item.priceLabel, item.period && el('small', {}, item.period)));
}
