const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Escapes editor text and turns *phrase* into <em>phrase</em> for display headlines. */
export function emphasis(value: string): string {
  return escapeHtml(value).replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** Plain-text version of an emphasised headline, for titles and metadata. */
export function plain(value: string): string {
  return value.replace(/\*(.+?)\*/g, '$1');
}
