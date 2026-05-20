// Service carousel — three visible at a time on desktop, one on mobile.
// User-controlled arrows, plus swipe support on touch devices.
(function () {
  var track = document.getElementById('service-carousel-track');
  if (!track) return;

  var prev = document.getElementById('service-carousel-prev');
  var next = document.getElementById('service-carousel-next');
  var pos = document.getElementById('service-carousel-pos');
  var viewport = track.parentElement; // .carousel-viewport
  var index = 0;
  var total = track.children.length;

  function visibleCount() {
    // Match the breakpoint in site.css — at <=768px we show one card
    return window.innerWidth <= 768 ? 1 : 3;
  }

  function update() {
    var card = track.children[0];
    var cardWidth = card.getBoundingClientRect().width;
    var gap = 16;
    var visible = visibleCount();

    // Clamp index so we don't scroll past the end
    var maxIndex = Math.max(0, total - visible);
    if (index > maxIndex) index = maxIndex;

    track.style.transform = 'translateX(-' + (index * (cardWidth + gap)) + 'px)';
    prev.disabled = index === 0;
    next.disabled = index >= maxIndex;
    var start = index + 1;
    var end = Math.min(index + visible, total);
    if (pos) pos.textContent = start + '\u2013' + end + ' of ' + total;
  }

  prev.addEventListener('click', function () {
    if (index > 0) { index--; update(); }
  });
  next.addEventListener('click', function () {
    var visible = visibleCount();
    if (index + visible < total) { index++; update(); }
  });
  window.addEventListener('resize', update);

  // ---- Touch swipe support ----
  var touchStartX = 0;
  var touchStartY = 0;
  var touchActive = false;
  var SWIPE_THRESHOLD = 40; // px — minimum horizontal movement to count as a swipe
  var SWIPE_RATIO = 1.2;    // horizontal must exceed vertical by this factor (so vertical scrolls aren't hijacked)

  viewport.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) return;
    touchActive = true;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  viewport.addEventListener('touchend', function (e) {
    if (!touchActive) return;
    touchActive = false;
    var touch = e.changedTouches[0];
    var dx = touch.clientX - touchStartX;
    var dy = touch.clientY - touchStartY;
    if (Math.abs(dx) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) < Math.abs(dy) * SWIPE_RATIO) return; // mostly vertical, ignore

    var visible = visibleCount();
    if (dx < 0 && index + visible < total) {
      // swipe left -> next
      index++;
      update();
    } else if (dx > 0 && index > 0) {
      // swipe right -> previous
      index--;
      update();
    }
  }, { passive: true });

  update();
})();
