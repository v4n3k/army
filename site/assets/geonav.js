/* подсветка активного таба в .pnav: по скроллу (scroll-spy) и по клику */
(function () {
  function init() {
    var nav = document.querySelector('.pnav');
    if (!nav) return;
    var links = [].slice.call(nav.querySelectorAll('a[href^="#"]'));
    if (!links.length) return;
    var targets = links.map(function (a) {
      try { return document.getElementById(a.getAttribute('href').slice(1)); }
      catch (e) { return null; }
    });
    var suppressUntil = 0;
    function upd() {
      var probe = 150; // шапка + липкая панель + запас
      var cur = -1;
      for (var i = 0; i < targets.length; i++) {
        if (targets[i] && targets[i].getBoundingClientRect().top <= probe) cur = i;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        for (var j = targets.length - 1; j >= 0; j--) {
          if (targets[j]) { cur = j; break; }
        }
      }
      links.forEach(function (a, k) { a.classList.toggle('act', k === cur); });
    }
    var tick = false;
    function onScroll() {
      if (tick) return;
      tick = true;
      requestAnimationFrame(function () {
        tick = false;
        if (Date.now() >= suppressUntil) upd();
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('load', upd);
    upd();
    links.forEach(function (a) {
      a.addEventListener('click', function () {
        links.forEach(function (l) { l.classList.remove('act'); });
        a.classList.add('act');
        suppressUntil = Date.now() + 900; // пока летим по якорю — не мигаем промежуточными
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
