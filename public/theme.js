/* Shared theme controller for the static stats.ucahub.ie pages.
   Mirrors ucahub's three themes (dark / bright / paper) and cycles on click.
   Cross-site sync: the choice is stored in a cookie scoped to .ucahub.ie, so it
   is shared with ucahub.ie (localStorage can't cross origins; a domain cookie can).
   localStorage is kept as a same-origin fallback. The React course app
   (App.jsx) implements the same behaviour against the same cookie/key. */
(function () {
  var KEY = 'ucahub_theme';
  var THEMES = ['dark', 'bright', 'paper'];
  var LABELS = { dark: 'Dark', bright: 'Upbeat', paper: 'Paper' };

  function readCookie() {
    try { var m = document.cookie.match(/(?:^|;\s*)ucahub_theme=([^;]+)/); return m ? m[1] : null; }
    catch (e) { return null; }
  }
  function writeCookie(t) {
    try { document.cookie = 'ucahub_theme=' + t + ';domain=.ucahub.ie;path=/;max-age=31536000;SameSite=Lax;Secure'; }
    catch (e) {}
  }
  function current() {
    var t = readCookie();
    if (THEMES.indexOf(t) < 0) { try { t = localStorage.getItem(KEY); } catch (e) {} }
    return THEMES.indexOf(t) >= 0 ? t : 'dark';
  }
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
    writeCookie(t);
    var labels = document.querySelectorAll('[data-theme-label]');
    for (var i = 0; i < labels.length; i++) labels[i].textContent = LABELS[t];
  }

  // Apply as early as the script runs (paired with an inline <head> hint to avoid flash).
  apply(current());

  document.addEventListener('DOMContentLoaded', function () {
    apply(current());
    var btns = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var idx = THEMES.indexOf(current());
        apply(THEMES[(idx + 1) % THEMES.length]);
      });
    }
  });
})();
