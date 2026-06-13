/* Shared theme + text-size controller for the static stats.ucahub.ie pages.
   - Themes: dark / bright / paper (mirrors ucahub), cycled by a toggle.
   - Text size: A-/A/A+ controls applied via `zoom` on <body> (the pages use
     fixed px sizing, so a page zoom is the reliable way to scale text).
   Both are synced cross-site through cookies scoped to .ucahub.ie (shared with
   ucahub.ie), with localStorage as a same-origin fallback. The React course
   app (App.jsx) implements the same behaviour against the same cookies/keys. */
(function () {
  // ── shared cookie helpers ──
  function readCookie(name) {
    try { var m = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)')); return m ? m[1] : null; }
    catch (e) { return null; }
  }
  function writeCookie(name, val) {
    try { document.cookie = name + '=' + val + ';domain=.ucahub.ie;path=/;max-age=31536000;SameSite=Lax;Secure'; }
    catch (e) {}
  }

  // ── theme ──
  var TKEY = 'ucahub_theme';
  var THEMES = ['dark', 'bright', 'paper'];
  var LABELS = { dark: 'Dark', bright: 'Upbeat', paper: 'Paper' };
  function currentTheme() {
    var t = readCookie(TKEY);
    if (THEMES.indexOf(t) < 0) { try { t = localStorage.getItem(TKEY); } catch (e) {} }
    return THEMES.indexOf(t) >= 0 ? t : 'dark';
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(TKEY, t); } catch (e) {}
    writeCookie(TKEY, t);
    var labels = document.querySelectorAll('[data-theme-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = LABELS[t];
  }

  // ── text size ──
  var FKEY = 'ucahub_font_scale';
  var FMIN = 0.90, FMAX = 1.25, FSTEP = 0.06;
  function clampF(s) { return Math.min(FMAX, Math.max(FMIN, s)); }
  function currentFont() {
    var s = parseFloat(readCookie('ucahub_font'));
    if (!isFinite(s)) { try { s = parseFloat(localStorage.getItem(FKEY)); } catch (e) {} }
    return isFinite(s) ? clampF(s) : 1;
  }
  function applyFont(s) {
    s = clampF(s);
    document.documentElement.style.setProperty('--font-scale', String(s));
    try { localStorage.setItem(FKEY, String(s)); } catch (e) {}
    writeCookie('ucahub_font', s);
    var labels = document.querySelectorAll('[data-font-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = Math.round(s * 100) + '%';
  }

  // apply both as early as the script runs (paired with inline <head> hints)
  applyTheme(currentTheme());
  applyFont(currentFont());

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme(currentTheme());
    applyFont(currentFont());

    var toggles = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener('click', function () {
        var idx = THEMES.indexOf(currentTheme());
        applyTheme(THEMES[(idx + 1) % THEMES.length]);
      });
    }
    bind('[data-font-dec]', function () { applyFont(currentFont() - FSTEP); });
    bind('[data-font-inc]', function () { applyFont(currentFont() + FSTEP); });
    bind('[data-font-reset]', function () { applyFont(1); });
  });

  function bind(sel, fn) {
    var els = document.querySelectorAll(sel);
    for (var i = 0; i < els.length; i++) els[i].addEventListener('click', fn);
  }
})();
