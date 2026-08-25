/* ========================================================================== 
   NOMA Living — Progressive interactions
   No external dependencies are required.
   ========================================================================== */

"use strict";

document.documentElement.classList.add("js");

(() => {
  const select = (selector, context = document) => context.querySelector(selector);
  const selectAll = (selector, context = document) => [...context.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /**
   * Keeps the sticky header readable and updates its visual state efficiently.
   */
  const initHeader = () => {
    const header = select("[data-header]");
    if (!header) return;

    let ticking = false;

    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      ticking = false;
    };

    window.addEventListener(
      "scroll",
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateHeader);
      },
      { passive: true },
    );

    updateHeader();
  };

  /**
   * Provides an accessible, keyboard-friendly mobile navigation.
   */
  const initMobileMenu = () => {
    const header = select("[data-header]");
    const toggle = select("[data-menu-toggle]");
    const menu = select("[data-mobile-menu]");

    if (!header || !toggle || !menu) return;

    const menuLinks = selectAll("a, button", menu);

    const setMenuState = (isOpen) => {
      header.classList.toggle("is-menu-open", isOpen);
      document.body.classList.toggle("menu-open", isOpen);
      toggle.setAttribute("aria-expanded", String(isOpen));
      toggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");

      if (isOpen) {
        window.setTimeout(() => menuLinks[0]?.focus(), 120);
      }
    };

    toggle.addEventListener("click", () => {
      setMenuState(toggle.getAttribute("aria-expanded") !== "true");
    });

    selectAll("a", menu).forEach((link) => {
      link.addEventListener("click", () => setMenuState(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenuState(false);
        toggle.focus();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1180) setMenuState(false);
    });
  };

  /**
   * Reveals content once it enters the viewport. Content remains visible when
   * IntersectionObserver is not available or motion is reduced.
   */
  const initReveals = () => {
    const elements = selectAll(".reveal");

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          currentObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10%", threshold: 0.08 },
    );

    elements.forEach((element) => observer.observe(element));
  };

  /**
   * Highlights the navigation item that best matches the current section.
   */
  const initActiveNavigation = () => {
    if (!("IntersectionObserver" in window)) return;

    const links = selectAll('.desktop-nav a[href^="#"]');
    const linkMap = new Map(links.map((link) => [link.getAttribute("href")?.slice(1), link]));
    const sections = [...linkMap.keys()]
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        links.forEach((link) => link.classList.remove("is-active"));
        linkMap.get(visible.target.id)?.classList.add("is-active");
      },
      { rootMargin: "-20% 0px -60%", threshold: [0.05, 0.2, 0.5] },
    );

    sections.forEach((section) => observer.observe(section));
  };

  /**
   * Switches between conceptual module plans without injecting markup.
   */
  const initModuleStudy = () => {
    const stage = select("[data-module-stage]");
    const controls = selectAll("[data-configuration]", select(".configuration-controls") || document);
    const caption = select("[data-module-caption]");

    if (!stage || !caption || controls.length === 0) return;

    const captions = {
      45: "An essential one-bedroom plan for compact sites and quiet retreats.",
      75: "A balanced two-bedroom plan with distinct living and work zones.",
      120: "A generous family configuration organized around a sheltered courtyard.",
    };

    controls.forEach((control) => {
      control.addEventListener("click", () => {
        const configuration = control.dataset.configuration;
        if (!configuration || !captions[configuration]) return;

        stage.dataset.configuration = configuration;
        caption.textContent = captions[configuration];

        controls.forEach((button) => {
          const isCurrent = button === control;
          button.classList.toggle("is-active", isCurrent);
          button.setAttribute("aria-pressed", String(isCurrent));
        });
      });
    });
  };

  /**
   * Runs the restrained impact counters once they become visible.
   */
  const initCounters = () => {
    const counters = selectAll("[data-count]");
    if (counters.length === 0 || reducedMotion.matches || !("IntersectionObserver" in window)) return;

    const animateCounter = (element) => {
      const target = Number(element.dataset.count);
      if (!Number.isFinite(target)) return;

      const duration = 900;
      const startTime = performance.now();

      const update = (time) => {
        const progress = Math.min((time - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = String(Math.round(target * eased));

        if (progress < 1) window.requestAnimationFrame(update);
      };

      element.textContent = "0";
      window.requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          currentObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.65 },
    );

    counters.forEach((counter) => observer.observe(counter));
  };

  /**
   * Controls the testimonial carousel with buttons and arrow keys.
   */
  const initTestimonialSlider = () => {
    const slider = select("[data-slider]");
    if (!slider) return;

    const track = select("[data-slider-track]", slider);
    const slides = selectAll(".testimonial-slide", slider);
    const previous = select("[data-slider-prev]", slider);
    const next = select("[data-slider-next]", slider);
    const currentLabel = select("[data-slide-current]", slider);

    if (!track || !previous || !next || !currentLabel || slides.length === 0) return;

    let currentIndex = 0;

    const update = (newIndex) => {
      currentIndex = (newIndex + slides.length) % slides.length;
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      currentLabel.textContent = String(currentIndex + 1).padStart(2, "0");

      slides.forEach((slide, index) => {
        slide.setAttribute("aria-hidden", String(index !== currentIndex));
      });
    };

    previous.addEventListener("click", () => update(currentIndex - 1));
    next.addEventListener("click", () => update(currentIndex + 1));

    slider.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        update(currentIndex - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        update(currentIndex + 1);
      }
    });

    update(0);
  };

  /**
   * Displays brief non-blocking feedback for intentionally inactive prototype links.
   */
  const initToast = () => {
    const toast = select("[data-toast]");
    if (!toast) return () => {};

    let timeoutId;

    const showToast = (message) => {
      window.clearTimeout(timeoutId);
      toast.textContent = message;
      toast.classList.add("is-visible");
      timeoutId = window.setTimeout(() => toast.classList.remove("is-visible"), 4200);
    };

    selectAll("[data-brochure]").forEach((button) => {
      button.addEventListener("click", () => {
        showToast("Brochure placeholder: connect the final NOMA PDF to this button when it is available.");
      });
    });

    selectAll("[data-placeholder-link]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showToast("This destination is a placeholder in the homepage prototype.");
      });
    });

    return showToast;
  };

  /**
   * Handles the project enquiry dialog while keeping form data local.
   */
  const initProjectDialog = (showToast) => {
    const dialog = select("[data-project-dialog]");
    const openButtons = selectAll("[data-open-project]");
    const closeButton = select("[data-close-project]");
    const form = select("[data-project-form]");
    const status = select("[data-project-status]");

    if (!dialog || !closeButton || !form || !status) return;

    let triggerElement = null;

    const closeDialog = () => {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
      triggerElement?.focus();
    };

    openButtons.forEach((button) => {
      button.addEventListener("click", () => {
        triggerElement = button;
        document.body.classList.remove("menu-open");
        select("[data-header]")?.classList.remove("is-menu-open");
        select("[data-menu-toggle]")?.setAttribute("aria-expanded", "false");

        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");

        window.setTimeout(() => select("input", form)?.focus(), 100);
      });
    });

    closeButton.addEventListener("click", closeDialog);

    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.className = "form-status";

      if (!form.checkValidity()) {
        status.textContent = "Please complete the required fields before sending your enquiry.";
        status.classList.add("is-error");
        form.reportValidity();
        return;
      }

      status.textContent = "Thank you. Your prototype enquiry has been validated successfully.";
      status.classList.add("is-success");
      form.reset();
      showToast("Project enquiry prototype completed. Connect a secure form endpoint before launch.");
    });
  };

  /**
   * Validates the newsletter field without sending data to a third party.
   */
  const initNewsletter = () => {
    const form = select("[data-newsletter]");
    const status = select("[data-newsletter-status]");
    if (!form || !status) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      status.className = "form-status";

      if (!form.checkValidity()) {
        status.textContent = "Enter a valid email address.";
        status.classList.add("is-error");
        form.reportValidity();
        return;
      }

      status.textContent = "Thank you — the subscription prototype is ready.";
      status.classList.add("is-success");
      form.reset();
    });
  };

  const initCurrentYear = () => {
    selectAll("[data-current-year]").forEach((element) => {
      element.textContent = String(new Date().getFullYear());
    });
  };

  const init = () => {
    initHeader();
    initMobileMenu();
    initReveals();
    initActiveNavigation();
    initModuleStudy();
    initCounters();
    initTestimonialSlider();
    const showToast = initToast();
    initProjectDialog(showToast);
    initNewsletter();
    initCurrentYear();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
