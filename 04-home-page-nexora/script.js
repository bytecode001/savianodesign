/* Nexora Finance — lightweight interactions with progressive enhancement. */
document.documentElement.classList.add("js");

const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const mobileMenu = document.querySelector("[data-mobile-menu]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Keep header styling in sync with scroll position without flooding the main thread. */
let scrollTicking = false;
const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  scrollTicking = false;
};

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      window.requestAnimationFrame(updateHeader);
      scrollTicking = true;
    }
  },
  { passive: true },
);
updateHeader();

/** Open and close the compact navigation while preserving ARIA state. */
const setMenuState = (isOpen) => {
  if (!menuToggle || !mobileMenu) return;

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  mobileMenu.classList.toggle("is-open", isOpen);
  header?.classList.toggle("menu-active", isOpen);
  document.body.classList.toggle("menu-open", isOpen);

  if (isOpen) {
    mobileMenu.querySelector("a")?.focus({ preventScroll: true });
  }
};

menuToggle?.addEventListener("click", () => {
  const willOpen = menuToggle.getAttribute("aria-expanded") !== "true";
  setMenuState(willOpen);
});

mobileMenu?.addEventListener("click", (event) => {
  if (event.target instanceof Element && event.target.closest("a")) setMenuState(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuToggle?.getAttribute("aria-expanded") === "true") {
    setMenuState(false);
    menuToggle.focus();
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 980) setMenuState(false);
});

/** Reveal sections only when motion is welcome; content stays visible without JavaScript. */
const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && !reduceMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -10%", threshold: 0.08 },
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

/** Animate the four impact figures once they enter the viewport. */
const counters = document.querySelectorAll("[data-counter]");

const setCounterValue = (element, value) => {
  const suffix = element.dataset.suffix ?? "";
  element.textContent = `${Math.round(value).toLocaleString("en-US")}${suffix}`;
};

const animateCounter = (element) => {
  const target = Number(element.dataset.counter);
  if (!Number.isFinite(target)) return;

  if (reduceMotion.matches) {
    setCounterValue(element, target);
    return;
  }

  const duration = 1350;
  const start = performance.now();

  const step = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    setCounterValue(element, target * eased);
    if (progress < 1) window.requestAnimationFrame(step);
  };

  window.requestAnimationFrame(step);
};

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.45 },
  );

  counters.forEach((counter) => counterObserver.observe(counter));
} else {
  counters.forEach(animateCounter);
}

/** Add a restrained pointer response to the hero metrics on fine-pointer devices. */
const tiltArea = document.querySelector("[data-tilt-area]");
const floatCards = tiltArea?.querySelectorAll("[data-float-card]") ?? [];
const canTilt = window.matchMedia("(hover: hover) and (pointer: fine)");
let tiltFrame = null;

const resetCards = () => {
  floatCards.forEach((card) => {
    card.style.transform = "translate3d(0, 0, 0)";
  });
};

tiltArea?.addEventListener("pointermove", (event) => {
  if (!canTilt.matches || reduceMotion.matches) return;
  if (tiltFrame) window.cancelAnimationFrame(tiltFrame);

  tiltFrame = window.requestAnimationFrame(() => {
    const bounds = tiltArea.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    floatCards.forEach((card, index) => {
      const strength = 7 + index * 4;
      card.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
    });
  });
});

tiltArea?.addEventListener("pointerleave", resetCards);

/** Keep the legal year accurate without making the page dependent on JavaScript. */
document.querySelectorAll("[data-year]").forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});
