/* Атрибуция закупа на сайте. Один файл на ВСЕ страницы: раньше эта механика жила только
   в index.html, и человек, зашедший с закупной ссылки на любую внутреннюю страницу, уходил
   в SEO-бота без метки — лид доставался не закупщику, а органике (Гриша 10.08.2026).

   Развилка одна: пришёл человек по закупной метке или нет.
   ЗАКУП (метка вида ник_цена_букваSVO): ТГ — общий бот воронки с этой меткой, MAX — бот ТОГО
   закупщика, чья буква в метке. В MAX владелец лида определяется ботом, а не меткой: чужой
   бот = лид уедет чужому.
   SEO (метки нет): отдельные боты, чтобы поисковый трафик не мешался с закупом.

   Разметка не меняется: в HTML стоят SEO-ссылки и SEO-номер — их и индексирует поисковик.
   Подмена живёт только в браузере посетителя с меткой. */
(function () {
  "use strict";

  var SEO_TG_BOT = 'https://t.me/army_rf_contract_bot';
  var SEO_MAX_BOT = 'https://max.ru/id525632714622_1_bot';
  var FUNNEL_TG = 'https://t.me/army_rf_contract_bot';
  var MAX_BOTS = {sam: 'se13478217_1_bot', st: 'id525632714622_bot',
                  t: 'se13478217_bot', g: 'id744517437230_4_bot'};
  var PHONE_ZAKUP = {href: 'tel:+79603545277', text: '+7 (960) 354-52-77'};
  /* Хранение метки: сутки (Гриша 14.08). Было 7 дней — и человек, один раз открывший
     закупную ссылку, всю неделю видел закупной номер во всех вкладках этого браузера,
     даже заходя из поиска или закладки. У встроенного браузера Telegram своё хранилище,
     поэтому метка там жила незаметно для Safari. */
  var TTL = 864e5;                                   // 1 день

  // 1. Метку из ссылки кладём в память браузера — человек может ходить по сайту и вернуться позже
  try {
    var q = new URLSearchParams(location.search), u = {}, has = false;
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(function (k) {
      var v = q.get(k);
      if (v) { u[k] = v.slice(0, 100); has = true; }
    });
    if (has) { u.ts = Date.now(); localStorage.setItem('svo_utm', JSON.stringify(u)); }
  } catch (e) {}

  function svoUTM() {
    try {
      var u = JSON.parse(localStorage.getItem('svo_utm') || 'null');
      if (u && Date.now() - u.ts < TTL) { delete u.ts; return u; }
    } catch (e) {}
    return null;
  }

  function svoMark() {
    var u = svoUTM(), m = u && u.utm_campaign;
    return (m && /^[A-Za-z0-9-]+_\d+_[A-Za-z0-9]+$/.test(m)) ? m : '';
  }

  /* Буква закупщика из метки. Пустая строка — это НЕ «значит Гриша»: у плоской метки без буквы
     (старый формат Стефана) владельца определить нельзя, и раньше такой лид уезжал в бот Гриши.
     Теперь в этом случае честно отдаём SEO-бота. */
  function svoLetter(m) {
    var g = /_\d+_([A-Za-z]*)SVO\d*$/i.exec(m || '');
    return g ? g[1].toLowerCase() : '';
  }

  /* Метка для ОРГАНИКИ: со слагом страницы, чтобы в CRM было видно, какая статья привела
     человека в мессенджер. До этого SEO-ссылка на MAX шла вообще без ?start=, и 37 лидов
     пришли без единого следа; у TG метка была одна на весь сайт.
     Формат «site_<slug>_gSVO» намеренно НЕ проходит проверку закупной метки (там на месте
     слага цифры) — органика и закуп не перепутаются. */
  function seoMark() {
    var p = (location.pathname || '/').toLowerCase();
    var slug = p.replace(/^\/|\/$/g, '').split('/').pop().replace(/[^a-z0-9]/g, '').slice(0, 24);
    return slug ? ('site_' + slug + '_gSVO') : 'site_0_gSVO';
  }

  function svoTgUrl() {
    var m = svoMark();
    return m ? (FUNNEL_TG + '?start=' + m) : (SEO_TG_BOT + '?start=' + seoMark());
  }

  function svoMaxUrl() {
    var m = svoMark();
    if (!m) return SEO_MAX_BOT + '?start=' + seoMark();
    var bot = MAX_BOTS[svoLetter(m)];
    return bot ? ('https://max.ru/' + bot + '?start=' + m) : (SEO_MAX_BOT + '?start=' + seoMark());
  }

  function svoStart() { return svoMark() || 'site_0_gSVO'; }

  /* 2. Переписываем ссылки на ботов ВСЕГДА: закупу — бот его закупщика с меткой выхода,
     органике — SEO-бот с меткой страницы. Телефон подменяем только закупу: у органики
     свой номер, и в разметке стоит именно он. */
  function apply() {
    var mark = svoMark(), tg = svoTgUrl(), mx = svoMaxUrl(), i, a, href;

    var links = document.querySelectorAll('a[href]');
    for (i = 0; i < links.length; i++) {
      a = links[i];
      href = a.getAttribute('href') || '';
      if (/^https?:\/\/t\.me\//i.test(href)) a.setAttribute('href', tg);
      // max.ru/join/… — это каналы админов в формах, их не трогаем
      else if (/max\.ru\//i.test(href) && !/max\.ru\/join\//i.test(href)) a.setAttribute('href', mx);
      else if (mark && /^tel:/i.test(href)) {
        a.setAttribute('href', PHONE_ZAKUP.href);
        // текст меняем только там, где это сам номер, а не «📞 Позвонить: …» целиком
        a.innerHTML = a.innerHTML.replace(/\+7[\s(]*\d{3}[)\s-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g,
                                          PHONE_ZAKUP.text);
      }
    }
  }

  // наружу — их зовут квиз и инлайн-обработчики страниц
  window.svoUTM = svoUTM;
  window.svoMark = svoMark;
  window.svoStart = svoStart;
  window.svoTgUrl = svoTgUrl;
  window.svoMaxUrl = svoMaxUrl;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);
  else apply();
})();
