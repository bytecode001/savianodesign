/**
 * Aster House homepage interactions.
 * The script progressively enhances navigation, scrolling and the editorial
 * carousel without injecting HTML or loading third-party dependencies.
 */

(() => {
  "use strict";

  document.documentElement.classList.replace("no-js", "js");

  const header = document.querySelector("[data-header]");
  const progressBar = document.querySelector("[data-scroll-progress]");
  const menuToggle = document.querySelector("[data-menu-toggle]");
  const navigation = document.querySelector("[data-nav]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopNavigation = window.matchMedia("(min-width: 64.001rem)");

  let scrollFrame = 0;

  /** Keep scroll-linked work inside one animation frame. */
  const updateScrollUI = () => {
    const scrollTop = window.scrollY;
    const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollRange > 0 ? Math.min(scrollTop / scrollRange, 1) : 0;

    header?.classList.toggle("is-scrolled", scrollTop > 48);

    if (progressBar) {
      progressBar.style.transform = `scaleX(${progress})`;
    }

    scrollFrame = 0;
  };

  const requestScrollUpdate = () => {
    if (!scrollFrame) {
      scrollFrame = window.requestAnimationFrame(updateScrollUI);
    }
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollUI();

  /* ----------------------------------------------------------------
     Accessible mobile navigation
     ---------------------------------------------------------------- */
  const getFocusableNavigationItems = () => {
    if (!navigation) return [];

    return Array.from(
      navigation.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
  };

  const isMenuOpen = () => menuToggle?.getAttribute("aria-expanded") === "true";

  const closeMenu = ({ restoreFocus = false } = {}) => {
    if (!header || !menuToggle) return;

    header.classList.remove("is-menu-open");
    document.body.classList.remove("menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");

    if (restoreFocus) {
      menuToggle.focus();
    }
  };

  const openMenu = () => {
    if (!header || !menuToggle) return;

    header.classList.add("is-menu-open");
    document.body.classList.add("menu-open");
    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Close navigation");

    window.requestAnimationFrame(() => getFocusableNavigationItems()[0]?.focus());
  };

  menuToggle?.addEventListener("click", () => {
    if (isMenuOpen()) {
      closeMenu({ restoreFocus: true });
    } else {
      openMenu();
    }
  });

  navigation?.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a") && isMenuOpen()) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!isMenuOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
      return;
    }

    if (event.key !== "Tab") return;

    const focusableItems = [menuToggle, ...getFocusableNavigationItems()].filter(Boolean);
    const firstItem = focusableItems[0];
    const lastItem = focusableItems.at(-1);

    if (event.shiftKey && document.activeElement === firstItem) {
      event.preventDefault();
      lastItem?.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      firstItem?.focus();
    }
  });

  desktopNavigation.addEventListener("change", (event) => {
    if (event.matches) closeMenu();
  });

  /* ----------------------------------------------------------------
     Refined, one-time content reveals
     ---------------------------------------------------------------- */
  const revealItems = document.querySelectorAll("[data-reveal]");

  if (!reduceMotion.matches && "IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          const itemIndex = Number(entry.target.getAttribute("data-reveal-order") || 0);

          entry.target.animate(
            [
              { opacity: 0, transform: "translateY(2.25rem)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            {
              duration: 900,
              delay: Math.min(itemIndex * 70, 210),
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "both",
            },
          );

          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  /* ----------------------------------------------------------------
     Horizontal experience carousel
     ---------------------------------------------------------------- */
  const carousel = document.querySelector("[data-carousel]");
  const previousButton = document.querySelector("[data-carousel-prev]");
  const nextButton = document.querySelector("[data-carousel-next]");
  let carouselFrame = 0;

  const getCarouselStep = () => {
    if (!carousel) return 0;

    const firstCard = carousel.querySelector(".experience-card");
    const gap = Number.parseFloat(getComputedStyle(carousel).columnGap) || 0;
    return firstCard ? firstCard.getBoundingClientRect().width + gap : carousel.clientWidth * 0.8;
  };

  const updateCarouselControls = () => {
    if (!carousel) return;

    const maximumScroll = carousel.scrollWidth - carousel.clientWidth;
    const tolerance = 3;

    if (previousButton instanceof HTMLButtonElement) {
      previousButton.disabled = carousel.scrollLeft <= tolerance;
    }

    if (nextButton instanceof HTMLButtonElement) {
      nextButton.disabled = carousel.scrollLeft >= maximumScroll - tolerance;
    }

    carouselFrame = 0;
  };

  const requestCarouselUpdate = () => {
    if (!carouselFrame) {
      carouselFrame = window.requestAnimationFrame(updateCarouselControls);
    }
  };

  const moveCarousel = (direction) => {
    carousel?.scrollBy({
      left: getCarouselStep() * direction,
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  };

  previousButton?.addEventListener("click", () => moveCarousel(-1));
  nextButton?.addEventListener("click", () => moveCarousel(1));

  carousel?.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      moveCarousel(event.key === "ArrowLeft" ? -1 : 1);
    },
    { passive: false },
  );

  carousel?.addEventListener("scroll", requestCarouselUpdate, { passive: true });
  window.addEventListener("resize", requestCarouselUpdate, { passive: true });
  updateCarouselControls();

  /* ----------------------------------------------------------------
     Portfolio-safe newsletter demo
     ---------------------------------------------------------------- */
  const newsletterForm = document.querySelector("[data-newsletter-form]");
  const newsletterStatus = document.querySelector("[data-newsletter-status]");

  newsletterForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!(newsletterForm instanceof HTMLFormElement) || !newsletterForm.checkValidity()) {
      newsletterForm?.reportValidity();
      return;
    }

    if (newsletterStatus) {
      newsletterStatus.textContent = "Thank you — a letter will find you soon.";
    }

    newsletterForm.reset();
  });

  const currentYear = document.querySelector("[data-current-year]");
  if (currentYear) currentYear.textContent = String(new Date().getFullYear());
})();
