/* Shared theme controller for the static stats.ucahub.ie pages.
   Mirrors ucahub's three themes (dark / upbeat / paper) and cycles on click.
   The React course app (App.jsx) implements the same behaviour internally,
   sharing the same localStorage key so the choice carries across the site. */
(function () {
  var KEY = 'ucahub_theme';
  var THEMES = ['dark', 'upbeat', 'paper'];
  var LABELS = { dark: 'Dark', upbeat: 'Upbeat', paper: 'Paper' };

  function current() {
    try {
      var t = localStorage.getItem(KEY);
      return THEMES.indexOf(t) >= 0 ? t : 'dark';
    } catch (e) { return 'dark'; }
  }

  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (e) {}
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
