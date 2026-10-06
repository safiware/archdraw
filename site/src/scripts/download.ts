// One Download button: its label names the visitor's system when it is one archdraw ships for; the link is the
// latest release either way, and the fine print beside it names both systems.
export function initDownload(): void {
  const ua = navigator.userAgent;
  const os = /Macintosh|Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua) ? 'Mac' : /Linux/.test(ua) && !/Android/.test(ua) ? 'Linux' : null;
  if (!os) return;
  for (const el of document.querySelectorAll<HTMLElement>('[data-dl-label]')) el.textContent = `Download for ${os}`;
}
