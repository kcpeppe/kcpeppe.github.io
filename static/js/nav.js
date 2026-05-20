// Mobile nav toggle — hamburger button shows/hides the nav on narrow viewports
(function () {
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');
  if (!btn || !nav) return;

  btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // Close the menu when a nav link is tapped (so the user actually goes somewhere)
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) {
      nav.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });
})();
