/* Oliva — progressive enhancement. No dependencies or network requests. */
(() => {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const supportedLanguages = ['it', 'en'];
  const params = new URLSearchParams(window.location.search);
  let savedLanguage;
  try { savedLanguage = localStorage.getItem('oliva-v2-language'); } catch (_) { /* Storage may be unavailable. */ }
  let language = supportedLanguages.includes(params.get('lang')) ? params.get('lang') :
    (supportedLanguages.includes(savedLanguage) ? savedLanguage : 'en');
  let activeCategory = 'all';
  const confirmations = new Map();
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const menuAnimations = new Map();

  const copy = {
    it: {
      openNav: 'Apri il menu di navigazione', closeNav: 'Chiudi il menu di navigazione',
      dishes: (count) => `${count} ${count === 1 ? 'proposta' : 'proposte'}`,
      noDishes: 'Nessuna proposta con questi filtri. Prova un’altra categoria.',
      dateRequired: 'Scegli una data valida.', datePast: 'Scegli una data a partire da oggi.',
      eventDatePast: 'Scegli una data a partire da domani.', dateFar: 'Puoi scegliere una data entro i prossimi 180 giorni.',
      closed: 'Il lunedì ci riposiamo. Scegli un altro giorno.',
      time: 'Scegli un orario disponibile per questa data.',
      errors: 'Controlla i campi evidenziati prima di continuare.',
      booking: (data) => `SIMULAZIONE COMPLETATA — Grazie ${data.name}. Hai provato la prenotazione per ${data.guests} ${Number(data.guests) === 1 ? 'persona' : 'persone'}, ${formatDate(data.date)}, alle ${data.time}. Nessun tavolo è stato prenotato e nessun dato è stato inviato. Oliva è un progetto dimostrativo.`,
      event: (data) => `SIMULAZIONE COMPLETATA — Grazie ${data.name}. Hai provato la richiesta per un evento di ${data.guests} persone il ${formatDate(data.date)}. Nessuna richiesta è stata inviata e nessun evento è stato prenotato. Oliva è un progetto dimostrativo.`
    },
    en: {
      openNav: 'Open navigation menu', closeNav: 'Close navigation menu',
      dishes: (count) => `${count} ${count === 1 ? 'selection' : 'selections'}`,
      noDishes: 'No selections match these filters. Try another category.',
      dateRequired: 'Choose a valid date.', datePast: 'Choose today or a later date.',
      eventDatePast: 'Choose tomorrow or a later date.', dateFar: 'Choose a date within the next 180 days.',
      closed: 'We rest on Mondays. Please choose another day.',
      time: 'Choose an available time for this date.',
      errors: 'Please check the highlighted fields before continuing.',
      booking: (data) => `DEMO COMPLETED — Thank you, ${data.name}. You tried a booking for ${data.guests} ${Number(data.guests) === 1 ? 'guest' : 'guests'} on ${formatDate(data.date)} at ${data.time}. No table has been booked and no information has been sent. Oliva is a demonstration project.`,
      event: (data) => `DEMO COMPLETED — Thank you, ${data.name}. You tried an event enquiry for ${data.guests} guests on ${formatDate(data.date)}. No enquiry has been sent and no event has been booked. Oliva is a demonstration project.`
    }
  };

  function dateISO(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12);
    return dateISO(date) === value ? date : null;
  }
  function formatDate(value) {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat(language === 'it' ? 'it-IT' : 'en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(date) : value;
  }
  function setStatus(form, text, success = false) {
    const status = $(form.id === 'booking-form' ? '#booking-status' : '#event-status');
    if (!status) return;
    status.hidden = false;
    status.textContent = text;
    status.classList.toggle('is-success', success);
    status.classList.toggle('is-error', !success);
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    if (success) {
      status.setAttribute('tabindex', '-1');
      status.focus({ preventScroll: true });
      status.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
  }

  function translate() {
    document.documentElement.lang = language;
    const title = document.documentElement.dataset[language === 'it' ? 'titleIt' : 'titleEn'] ||
      document.body.dataset[language === 'it' ? 'titleIt' : 'titleEn'];
    if (title) document.title = title;
    $$('[data-it][data-en]').forEach((element) => {
      const text = element.getAttribute(`data-${language}`);
      if (element.matches('meta')) element.setAttribute('content', text);
      else element.textContent = text;
    });
    $$('[data-it-html][data-en-html]').forEach((element) => {
      // Only developer-authored, static content in the HTML is used here.
      element.innerHTML = element.getAttribute(`data-${language}-html`);
    });
    $$('[data-placeholder-it][data-placeholder-en]').forEach((element) => {
      element.setAttribute('placeholder', element.getAttribute(`data-placeholder-${language}`));
    });
    $$('[data-aria-it][data-aria-en]').forEach((element) => {
      element.setAttribute('aria-label', element.getAttribute(`data-aria-${language}`));
    });
    $$('[data-alt-it][data-alt-en]').forEach((element) => {
      element.setAttribute('alt', element.getAttribute(`data-alt-${language}`));
    });
    $$('[data-lang]').forEach((button) => {
      const selected = button.dataset.lang === language;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    $$('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || /^(?:mailto:|tel:|https?:\/\/|\/\/)/i.test(href)) return;
      const [pathAndQuery, hash] = href.split('#');
      const [path, query] = pathAndQuery.split('?');
      if (!path.endsWith('.html')) return;
      const search = new URLSearchParams(query || '');
      search.set('lang', language);
      link.setAttribute('href', `${path}?${search.toString()}${hash !== undefined ? `#${hash}` : ''}`);
    });
    updateNavLabel();
    updateHeroLabels();
    updateGalleryCaption();
    filterMenu();
    forms.forEach((form) => {
      updateDateLimits(form);
      validateDate(form);
      updateTimes(form);
      if (confirmations.has(form.id)) {
        const data = confirmations.get(form.id);
        const status = $(form.id === 'booking-form' ? '#booking-status' : '#event-status');
        if (status) status.textContent = copy[language][form.id === 'booking-form' ? 'booking' : 'event'](data);
      }
    });
  }

  const navToggle = $('#nav-toggle');
  const nav = $('#site-nav');
  function updateNavLabel() {
    if (navToggle) navToggle.setAttribute('aria-label', copy[language][navToggle.getAttribute('aria-expanded') === 'true' ? 'closeNav' : 'openNav']);
  }
  function closeNav(restoreFocus = false) {
    if (!nav || !navToggle) return;
    nav.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('nav-open');
    updateNavLabel();
    if (restoreFocus) navToggle.focus();
  }
  if (nav && navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navToggle.getAttribute('aria-expanded') !== 'true';
      nav.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
      updateNavLabel();
    });
    nav.addEventListener('click', (event) => { if (event.target.closest('a')) closeNav(); });
    document.addEventListener('click', (event) => {
      if (!nav.contains(event.target) && !navToggle.contains(event.target)) closeNav();
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') closeNav(true);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) closeNav(); }, { passive: true });
  }

  function filterMenu(animate = false) {
    const cards = $$('[data-category]');
    if (!cards.length) return;
    const vegetarian = Boolean($('#vegetarian-filter')?.checked);
    let count = 0;
    cards.forEach((card) => {
      const matches = (activeCategory === 'all' || card.dataset.category === activeCategory) &&
        (!vegetarian || card.dataset.vegetarian === 'true');
      card.hidden = !matches;
      if (matches) count += 1;
    });
    $$('[data-filter]').forEach((button) => {
      const selected = button.dataset.filter === activeCategory;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    const countElement = $('#menu-count');
    if (countElement) countElement.textContent = copy[language].dishes(count);
    const empty = $('#menu-empty');
    if (empty) { empty.hidden = count !== 0; empty.textContent = copy[language].noDishes; }
    // Optional grouping: keep category headings only when a visible card exists.
    $$('[data-menu-group]').forEach((group) => { group.hidden = !$$('[data-category]', group).some((card) => !card.hidden); });
    if (animate === true) animateMenuResults(cards);
  }
  $$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    activeCategory = button.dataset.filter;
    filterMenu(true);
  }));
  $('#vegetarian-filter')?.addEventListener('change', () => filterMenu(true));

  const forms = ['#booking-form', '#event-form'].map((selector) => $(selector)).filter(Boolean);
  function updateDateLimits(form) {
    const field = form.elements.namedItem('date');
    if (!field) return;
    const minimum = new Date();
    if (form.id === 'event-form') minimum.setDate(minimum.getDate() + 1);
    const maximum = new Date();
    maximum.setDate(maximum.getDate() + 180);
    field.min = dateISO(minimum);
    field.max = dateISO(maximum);
  }
  function validateDate(form) {
    const field = form.elements.namedItem('date');
    if (!field) return true;
    field.setCustomValidity('');
    if (!field.value) return !field.required;
    const date = parseDate(field.value);
    let message = '';
    if (!date) message = copy[language].dateRequired;
    else if (field.value < field.min) message = copy[language][form.id === 'event-form' ? 'eventDatePast' : 'datePast'];
    else if (field.value > field.max) message = copy[language].dateFar;
    else if (date.getDay() === 1) message = copy[language].closed;
    field.setCustomValidity(message);
    return !message;
  }
  function updateTimes(form) {
    if (form.id !== 'booking-form') return;
    const dateField = form.elements.namedItem('date');
    const timeField = form.elements.namedItem('time');
    if (!dateField || !timeField) return;
    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const selectedDate = parseDate(dateField.value);
    const closed = selectedDate && selectedDate.getDay() === 1;
    if (timeField instanceof HTMLSelectElement) {
      Array.from(timeField.options).forEach((option) => {
        if (!option.value) return;
        option.disabled = Boolean(closed || (dateField.value === dateISO(now) && option.value <= timeNow));
      });
      if (timeField.selectedOptions[0]?.disabled) timeField.value = '';
    }
    const past = dateField.value === dateISO(now) && timeField.value && timeField.value <= timeNow;
    timeField.setCustomValidity(past || (closed && timeField.value) ? copy[language].time : '');
  }
  forms.forEach((form) => {
    updateDateLimits(form);
    $$('button[type="submit"], input[type="submit"]', form).forEach((button) => { button.disabled = false; });
    form.addEventListener('focusin', () => { updateDateLimits(form); validateDate(form); updateTimes(form); });
    form.addEventListener('change', () => { validateDate(form); updateTimes(form); });
    form.addEventListener('input', (event) => {
      if (confirmations.has(form.id)) {
        confirmations.delete(form.id);
        const status = $(form.id === 'booking-form' ? '#booking-status' : '#event-status');
        if (status) { status.hidden = true; status.textContent = ''; status.classList.remove('is-success', 'is-error'); }
      }
      // Remove a previous custom whitespace error as the user edits the field.
      if (event.target.name === 'name' || event.target.name === 'message') event.target.setCustomValidity('');
    });
    form.addEventListener('invalid', () => setStatus(form, copy[language].errors), true);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateDateLimits(form);
      validateDate(form);
      updateTimes(form);
      ['name', 'message'].forEach((name) => {
        const field = form.elements.namedItem(name);
        if (field && field.required && !field.value.trim()) field.setCustomValidity(copy[language].errors);
      });
      if (!form.reportValidity()) { setStatus(form, copy[language].errors); return; }
      const values = new FormData(form);
      const data = {
        name: String(values.get('name') || '').trim(), date: String(values.get('date') || ''),
        time: String(values.get('time') || ''), guests: String(values.get('guests') || '')
      };
      confirmations.set(form.id, data);
      setStatus(form, copy[language][form.id === 'booking-form' ? 'booking' : 'event'](data), true);
    });
  });

  $$('[data-lang]').forEach((button) => button.addEventListener('click', () => {
    if (!supportedLanguages.includes(button.dataset.lang)) return;
    language = button.dataset.lang;
    try { localStorage.setItem('oliva-v2-language', language); } catch (_) { /* Language still works without storage. */ }
    try {
      const current = new URL(window.location.href);
      current.searchParams.set('lang', language);
      history.replaceState(null, '', current.href);
    } catch (_) { /* Some file:// contexts do not allow history changes. */ }
    translate();
  }));

  // Motion is progressive enhancement: HTML remains visible without JavaScript.
  let revealObserver;
  function reveal(element) {
    element.classList.add('visible');
    revealObserver?.unobserve(element);
  }
  function cancelMenuAnimations() {
    menuAnimations.forEach((animation) => animation.cancel());
    menuAnimations.clear();
  }
  function animateMenuResults(cards) {
    cancelMenuAnimations();
    const visibleCards = cards.filter((card) => !card.hidden);
    // Filters update immediately. An old scroll-reveal must never hide a result.
    visibleCards.forEach(reveal);
    if (motionPreference.matches || typeof Element.prototype.animate !== 'function') return;
    visibleCards.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const animation = card.animate([
        { opacity: 0, transform: 'translateY(12px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 360, delay: Math.min(index, 3) * 45, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' });
      menuAnimations.set(card, animation);
      animation.onfinish = () => menuAnimations.delete(card);
    });
  }
  function syncMotionPreference() {
    document.documentElement.classList.toggle('motion-enabled', !motionPreference.matches);
    if (!motionPreference.matches) return;
    cancelMenuAnimations();
    revealObserver?.disconnect();
    $$('.reveal').forEach(reveal);
    document.documentElement.classList.remove('js-motion');
  }
  function initMotion() {
    syncMotionPreference();
    if (motionPreference.addEventListener) motionPreference.addEventListener('change', syncMotionPreference);
    else motionPreference.addListener?.(syncMotionPreference);
    // Keep this active if the visitor changes the motion preference later.
    document.addEventListener('focusin', (event) => {
      const target = event.target.closest('.reveal, [data-category]');
      if (!target) return;
      reveal(target);
      menuAnimations.get(target)?.cancel();
      menuAnimations.delete(target);
    });
    if (motionPreference.matches || !('IntersectionObserver' in window)) return;
    const selector = [
      '.section-title', '.page-intro > div', '.story-columns > *',
      '.photo-strip > figure', '.experience-layout', '.compact-dish', '.menu-item',
      '.kitchen-grid > *', '.gather-grid > article', '.principles > article',
      '.split-section > *', '.wide-photo', '.project-photo', '.event-visual',
      '.gallery-item', '.visit-photo', '.event-photo'
    ].join(',');
    // A component animates once, not again through an animated ancestor.
    const targets = $$(selector).filter((element) => !element.parentElement.closest(selector));
    revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) reveal(entry.target); });
    }, { threshold: 0.04, rootMargin: '0px 0px -20px 0px' });
    targets.forEach((element) => {
      element.classList.add('reveal');
      const siblings = Array.from(element.parentElement.children).filter((sibling) => targets.includes(sibling));
      element.style.setProperty('--reveal-delay', `${Math.min(siblings.indexOf(element), 2) * 70}ms`);
      revealObserver.observe(element);
    });
    document.documentElement.classList.add('js-motion');
  }

  const bookingForm = $('#booking-form');
  const mobileBooking = $('#mobile-booking');
  if (bookingForm && mobileBooking && 'IntersectionObserver' in window) {
    const bookingObserver = new IntersectionObserver((entries) => {
      const visible = entries[0].isIntersecting;
      mobileBooking.classList.toggle('is-hidden', visible);
      mobileBooking.inert = visible;
    }, { threshold: 0 });
    bookingObserver.observe(bookingForm);
  }
  // Manual carousel: no automatic motion or timed content changes.
  const hero = $('#hero-carousel');
  const slides = hero ? $$('.hero-slide', hero) : [];
  const slideButtons = hero ? $$('[data-slide-to]', hero) : [];
  let currentSlide = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));

  function updateHeroLabels() {
    slides.forEach((slide, index) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', language === 'en' ? 'slide' : 'diapositiva');
      slide.setAttribute('aria-label', `${index + 1} / ${slides.length}`);
    });
    slideButtons.forEach((button) => {
      const position = Number(button.dataset.slideTo) + 1;
      button.setAttribute('aria-label', language === 'en' ? `Show slide ${position}` : `Mostra immagine ${position}`);
    });
    const previous = $('#hero-prev');
    const next = $('#hero-next');
    if (previous) previous.setAttribute('aria-label', language === 'en' ? 'Previous slide' : 'Immagine precedente');
    if (next) next.setAttribute('aria-label', language === 'en' ? 'Next slide' : 'Immagine successiva');
    const status = $('#hero-status');
    if (status && slides.length) status.textContent = `${currentSlide + 1} / ${slides.length}`;
  }
  function showSlide(index) {
    if (!slides.length) return;
    currentSlide = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const selected = position === currentSlide;
      slide.classList.toggle('is-active', selected);
      slide.inert = !selected;
      slide.setAttribute('aria-hidden', String(!selected));
    });
    slideButtons.forEach((button) => {
      const selected = Number(button.dataset.slideTo) === currentSlide;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-active', selected);
    });
    updateHeroLabels();
  }
  slideButtons.forEach((button) => button.addEventListener('click', () => showSlide(Number(button.dataset.slideTo))));
  $('#hero-prev')?.addEventListener('click', () => showSlide(currentSlide - 1));
  $('#hero-next')?.addEventListener('click', () => showSlide(currentSlide + 1));
  if (hero && slides.length) {
    hero.addEventListener('keydown', (event) => {
      if (!event.target.closest('[data-slide-to], #hero-prev, #hero-next')) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        showSlide(currentSlide + (event.key === 'ArrowRight' ? 1 : -1));
      }
    });
    showSlide(currentSlide);
  }

  // Native dialog provides modal focus containment and Escape dismissal.
  const galleryDialog = $('#gallery-dialog');
  const galleryImage = $('#gallery-image');
  const galleryCaption = $('#gallery-caption');
  let galleryTrigger = null;
  function updateGalleryCaption() {
    const closeButton = $('#gallery-close');
    if (closeButton) closeButton.setAttribute('aria-label', language === 'en' ? 'Close photograph' : 'Chiudi fotografia');
    if (!galleryTrigger || !galleryImage) return;
    const caption = galleryTrigger.getAttribute(`data-gallery-${language}`) ||
      $('img', galleryTrigger)?.alt || '';
    galleryImage.alt = caption;
    if (galleryCaption) galleryCaption.textContent = caption;
  }
  if (galleryDialog && galleryImage && typeof galleryDialog.showModal === 'function') {
    $$('button[data-gallery]').forEach((button) => button.addEventListener('click', () => {
      galleryTrigger = button;
      galleryImage.src = button.dataset.gallery;
      updateGalleryCaption();
      galleryDialog.showModal();
      document.body.classList.add('gallery-open');
      $('#gallery-close')?.focus();
    }));
    $('#gallery-close')?.addEventListener('click', () => galleryDialog.close());
    galleryDialog.addEventListener('click', (event) => {
      if (event.target !== galleryDialog) return;
      const rect = galleryDialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) galleryDialog.close();
    });
    galleryDialog.addEventListener('close', () => {
      document.body.classList.remove('gallery-open');
      galleryTrigger?.focus({ preventScroll: true });
    });
  }
  translate();
  initMotion();
})();
