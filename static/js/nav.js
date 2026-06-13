// Mobile nav toggle — hamburger button shows/hides the nav on narrow viewports.
// Also handles click-open submenus.
(function () {
  var btn = document.getElementById('nav-toggle');
  var nav = document.getElementById('main-nav');

  // ---- Mobile hamburger ----
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    // Close the mobile menu when a real link is tapped (not the submenu toggle)
    nav.addEventListener('click', function (e) {
      var link = e.target.closest('a');
      if (link) {
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---- Submenu (dropdown) toggle ----
  var submenuToggles = document.querySelectorAll('.submenu-toggle');
  submenuToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var li = toggle.parentElement;
      var wasOpen = li.classList.contains('open');

      // Close any other open submenus
      document.querySelectorAll('.has-submenu.open').forEach(function (other) {
        if (other !== li) {
          other.classList.remove('open');
          var otherBtn = other.querySelector('.submenu-toggle');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle this one
      li.classList.toggle('open');
      toggle.setAttribute('aria-expanded', wasOpen ? 'false' : 'true');
    });
  });

  // Close submenus on outside click
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.has-submenu')) {
      document.querySelectorAll('.has-submenu.open').forEach(function (li) {
        li.classList.remove('open');
        var btn = li.querySelector('.submenu-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // Close submenus on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      document.querySelectorAll('.has-submenu.open').forEach(function (li) {
        li.classList.remove('open');
        var btn = li.querySelector('.submenu-toggle');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });
    }
  });
})();
