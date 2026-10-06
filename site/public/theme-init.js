/* Runs before first paint: apply the visitor's saved theme, if any, and mark that JS runs.
   A file, not an inline script, so the CSP can stay 'self' only. */
(function () {
  var d = document.documentElement;
  d.classList.add('js');
  try {
    var t = localStorage.getItem('archdraw-theme');
    if (t === 'light' || t === 'dark') d.setAttribute('data-theme', t);
  } catch (e) { /* storage blocked: follow the system setting */ }
})();
