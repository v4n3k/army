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
    // 29.10: подсветка не помогала, если сам таб был за пределами видимой части полосы —
    // полоса (overflow-x:auto в .wrap) не прокручивалась к активному табу никогда.
    // Перемещаем только когда таб реально обрезан/спрятан, иначе полоса дёргалась бы
    // при каждом пересечении границ разделов. scrollTo только по полосе: scrollIntoView
    // промотал бы и страницу по вертикали.
    function centered(a) {
      var strip = nav.querySelector('.wrap') || nav;
      if (strip.scrollWidth <= strip.clientWidth + 1) return; // всё помещается — не трогаем
      if (!a || !nav.contains(a)) return;
      var st = strip.getBoundingClientRect(),
          lt = a.getBoundingClientRect();
      if (lt.left >= st.left && lt.right <= st.right) return; // таб и так виден целиком
      var to = strip.scrollLeft + (lt.left - st.left) - (st.width - lt.width) / 2;
      to = Math.max(0, Math.min(strip.scrollWidth - strip.clientWidth, to));
      if (Math.abs(strip.scrollLeft - to) < 2) return;
      var slow = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      try { strip.scrollTo({ left: to, behavior: slow ? 'smooth' : 'auto' }); }
      catch (e) { strip.scrollLeft = to; }
    }
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
      if (cur >= 0) centered(links[cur]);
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
        centered(a); // клик по обрезанному краю — доезжаем, чтобы таб стал виден
        suppressUntil = Date.now() + 900; // пока летим по якорю — не мигаем промежуточными
      });
    });
    ['touchstart', 'pointerdown', 'wheel'].forEach(function (ev) {
      // пользователь листает полосу сам — не перетягиваем её под ним
      nav.addEventListener(ev, function () {
        suppressUntil = Math.max(suppressUntil, Date.now() + (ev === 'wheel' ? 600 : 1200));
      }, { passive: true, capture: true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ===== бургер-меню внутренних страниц (29.10) =====
   В меню только контакты; href берём из самих иконок шапки — ноль дублирования,
   синхронно на всех гео-страницах. Разделы страницы не дублируем: они уже в табах
   .pnav под шапкой (в длинном меню телефонная кнопка уезжала за нижний край панели). */
(function () {
  function buildBurger() {
    var hdr = document.querySelector('.hdr');
    if (!hdr || hdr.querySelector('.mnav')) return;
    var host = (hdr.querySelector('.cta') || {}).parentElement;
    var tel = hdr.querySelector('a[href^="tel:"]'),
        tg = hdr.querySelector('a.hicon[href*="t.me"]'),
        mx = hdr.querySelector('a.hicon[href*="max.ru"]');
    if (!tel && !tg && !mx) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'mnav-burger';
    b.setAttribute('aria-controls', 'geonav-mnav');
    b.setAttribute('aria-expanded', 'false');
    b.setAttribute('aria-label', 'Меню');
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
    var n = document.createElement('div');
    n.className = 'mnav'; n.id = 'geonav-mnav';
    var svgTg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M21.9 4.3 18.7 19c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.35-4.95L18 6.15c.4-.35-.1-.55-.6-.2L6.85 12.9l-4.75-1.5c-1-.3-1-.99.2-1.47L20.55 3.4c.85-.32 1.6.2 1.35 1.44z"/></svg>';
    var svgMx = '<svg viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="M11.46 21.48A9.6 9.6 0 1 0 2.45 10.14L2.38 10.29L2.3 13.66L3.58 19.24L3.61 20.32L3.98 21.15L4.79 21.46L5.65 21.29L7.71 20.25L8.07 20.25L9.53 20.97L11.3 21.46ZM9.25 16.14A5.01 5.01 0 1 0 7.06 10.44L7.12 10.55L6.76 12.44L7.05 15.43L7.72 16.73L8.29 16.69L9.11 16.18Z"/></svg>';
    var svgPh = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>';
    var row = document.createElement('div');
    row.className = 'm-row';
    [ [tg, '#2aabee', svgTg, 'Telegram'], [mx, '#17181f', svgMx, 'MAX'] ].forEach(function (m) {
      if (!m[0]) return;
      var a = document.createElement('a');
      a.className = 'm-msgr'; a.href = m[0].href;
      a.target = '_blank'; a.rel = 'noopener';
      a.setAttribute('aria-label', m[3]);
      a.style.background = m[1];
      a.innerHTML = m[2] + m[3];
      row.appendChild(a);
    });
    if (row.children.length) n.appendChild(row);
    if (tel) {
      var p = document.createElement('a');
      p.className = 'm-phone'; p.href = tel.href;
      var txt = (tel.textContent || '').replace(/\s+/g, ' ').trim() || 'Позвонить';
      p.innerHTML = svgPh;
      p.appendChild(document.createTextNode(txt));
      n.appendChild(p);
    }
    if (host) host.appendChild(b); else (hdr.querySelector('.wrap') || hdr).appendChild(b);
    hdr.appendChild(n);
    function setOpen(v) {
      n.classList.toggle('open', v);
      b.setAttribute('aria-expanded', v ? 'true' : 'false');
    }
    b.addEventListener('click', function () { setOpen(!n.classList.contains('open')); });
    n.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
    document.addEventListener('click', function (e) {
      if (n.classList.contains('open') && !hdr.contains(e.target)) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 760) setOpen(false); // вышел в десктоп — панель не переживает ресайз
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildBurger);
  else buildBurger();
})();

/* авто-раскрытие <details> при переходе по якорю (карточка вопросов) */
function geonavOpenDetails(hash) {
  try {
    var el = document.getElementById(decodeURIComponent((hash || '').slice(1)));
    if (el) {
      var d = el.tagName === 'DETAILS' ? el : el.closest('details');
      if (d) d.open = true;
    }
  } catch (e) {}
}
document.addEventListener('click', function (e) {
  var a = e.target && e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if (a) geonavOpenDetails(a.getAttribute('href'));
});
window.addEventListener('load', function () { geonavOpenDetails(location.hash); });
