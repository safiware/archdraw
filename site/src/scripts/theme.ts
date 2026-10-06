// The theme toggle. An explicit choice wins over the system setting and is remembered in this browser only.
const doc = document.documentElement;
const sysDark = window.matchMedia('(prefers-color-scheme: dark)');
const isDark = () => (doc.dataset.theme ? doc.dataset.theme === 'dark' : sysDark.matches);

export function initTheme(): void {
  const btns = [...document.querySelectorAll<HTMLButtonElement>('.theme-t')];
  const label = () => btns.forEach(b => b.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'));
  label();
  sysDark.addEventListener('change', label);
  btns.forEach(b => b.addEventListener('click', () => {
    doc.dataset.theme = isDark() ? 'light' : 'dark';
    label();
    try { localStorage.setItem('archdraw-theme', doc.dataset.theme); } catch { /* not remembered */ }
  }));
}
