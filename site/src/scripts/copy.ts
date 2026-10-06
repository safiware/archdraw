// Copy buttons: [data-copy] puts its text on the clipboard, shows a check and announces it; where the clipboard is
// refused, the command next to it is selected so the visitor can copy it by hand.
export function initCopy(): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
    if (btn.dataset.copyReady) continue;
    btn.dataset.copyReady = '1';
    const box = btn.parentElement;
    const live = box?.querySelector<HTMLElement>('.copy-live');
    btn.addEventListener('click', async () => {
      let ok = false;
      try { await navigator.clipboard.writeText(btn.dataset.copy ?? ''); ok = true; } catch { /* refused: select it instead */ }
      if (!ok) {
        const code = box?.querySelector('code');
        if (code) { const r = document.createRange(); r.selectNodeContents(code); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }
      }
      if (live) live.textContent = ok ? 'Copied' : 'Selected; press Ctrl+C or Cmd+C to copy';
      if (ok) {
        btn.classList.add('copied');
        setTimeout(() => { btn.classList.remove('copied'); if (live) live.textContent = ''; }, 1600);
      }
    });
  }
}
