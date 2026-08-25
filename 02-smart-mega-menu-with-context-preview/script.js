/**
 * Smart Mega Menu with Context Preview
 * ------------------------------------
 * Enhances the native <details> disclosure with contextual previews,
 * roving keyboard controls, responsive navigation and focus restoration.
 */

(() => {
  "use strict";

  document.documentElement.classList.replace("no-js", "js");

  const megaMenu = document.querySelector(".mega-menu");
  const menuSummary = megaMenu?.querySelector("summary");
  const megaSurface = megaMenu?.querySelector(".mega-menu__surface");
  const closeButton = megaMenu?.querySelector(".mega-menu__close");
  const categoryList = megaMenu?.querySelector(".category-list");
  // Scope preview triggers to category controls only. The preview panel stores
  // its active state separately, so entering it can never reset the selection.
  const categoryLinks = Array.from(
    megaMenu?.querySelectorAll(".category-card[data-preview]") ?? []
  );
  const previewPanel = document.querySelector("#context-preview");
  const previewEyebrow = document.querySelector("#preview-eyebrow");
  const previewTitle = document.querySelector("#preview-title");
  const previewDescription = document.querySelector("#preview-description");
  const previewBenefits = Array.from(document.querySelectorAll(".benefit-list b"));
  const previewCta = document.querySelector("#preview-cta");
  const previewCtaLabel = previewCta?.querySelector("span");
  const previewScenes = Array.from(document.querySelectorAll("[data-scene]"));
  const previewStatus = document.querySelector("#preview-status");
  const navToggle = document.querySelector(".site-nav__toggle");
  const siteNav = document.querySelector(".site-nav");

  const desktopQuery = window.matchMedia("(min-width: 64rem)");
  const precisePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const HOVER_OPEN_DELAY = 70;
  const HOVER_CLOSE_DELAY = 160;

  // The allow-listed data model keeps all DOM updates predictable and trusted.
  const PREVIEWS = Object.freeze({
    platforms: Object.freeze({
      eyebrow: "Connected product systems",
      title: "Digital platforms that feel unmistakably yours.",
      description:
        "Design and ship flexible product ecosystems with a shared foundation for every team.",
      benefits: Object.freeze([
        "Composable architecture",
        "Unified design language",
        "Built to evolve"
      ]),
      cta: "Explore digital platforms",
      href: "#platforms"
    }),
    commerce: Object.freeze({
      eyebrow: "Considered commerce",
      title: "Shopping journeys made for discovery.",
      description:
        "Pair expressive storytelling with fast, intuitive paths from first impression to checkout.",
      benefits: Object.freeze([
        "Story-led merchandising",
        "Frictionless conversion",
        "Responsive by default"
      ]),
      cta: "Explore commerce experiences",
      href: "#commerce"
    }),
    insights: Object.freeze({
      eyebrow: "Signals, not noise",
      title: "Make product intelligence feel effortless.",
      description:
        "Turn complex activity into legible patterns, confident decisions and measurable progress.",
      benefits: Object.freeze([
        "Live operational signals",
        "Focused visual hierarchy",
        "Actionable recommendations"
      ]),
      cta: "Explore intelligent insights",
      href: "#insights"
    }),
    automation: Object.freeze({
      eyebrow: "Workflows in motion",
      title: "Connect the work. Keep people in control.",
      description:
        "Coordinate tools, decisions and handoffs with transparent automation your team can trust.",
      benefits: Object.freeze([
        "Visual workflow logic",
        "Human approval points",
        "Reliable integrations"
      ]),
      cta: "Explore workflow automation",
      href: "#automation"
    })
  });

  let activePreview = "platforms";
  let hoverOpenTimer = 0;
  let hoverCloseTimer = 0;
  let pointerWithinMenu = false;

  if (
    !megaMenu ||
    !menuSummary ||
    !megaSurface ||
    !closeButton ||
    !categoryList ||
    !previewPanel ||
    !previewEyebrow ||
    !previewTitle ||
    !previewDescription ||
    !previewCta ||
    !previewCtaLabel ||
    !previewStatus ||
    !navToggle ||
    !siteNav ||
    categoryLinks.length === 0
  ) {
    return;
  }

  /** Return true only for keys defined in the local preview model. */
  const isPreviewKey = (key) => Object.prototype.hasOwnProperty.call(PREVIEWS, key);

  const clearOpenTimer = () => {
    window.clearTimeout(hoverOpenTimer);
    hoverOpenTimer = 0;
  };

  const clearCloseTimer = () => {
    window.clearTimeout(hoverCloseTimer);
    hoverCloseTimer = 0;
  };

  /** Open the native disclosure while keeping ARIA state synchronized. */
  const openMegaMenu = () => {
    clearOpenTimer();
    clearCloseTimer();

    if (!megaMenu.open) {
      megaMenu.open = true;
    }

    menuSummary.setAttribute("aria-expanded", "true");
  };

  /**
   * Render one preview using textContent and allow-listed attributes only.
   * Hover changes remain silent; focus and click changes can be announced.
   */
  const renderPreview = (key, { announce = false } = {}) => {
    if (
      !isPreviewKey(key) ||
      key === activePreview && previewPanel.dataset.activePreview === key
    ) {
      return;
    }

    const data = PREVIEWS[key];
    activePreview = key;
    previewPanel.dataset.activePreview = key;

    categoryLinks.forEach((link) => {
      const isActive = link.dataset.preview === key;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    previewScenes.forEach((scene) => {
      scene.classList.toggle("is-active", scene.dataset.scene === key);
    });

    previewEyebrow.textContent = data.eyebrow;
    previewTitle.textContent = data.title;
    previewDescription.textContent = data.description;
    previewCtaLabel.textContent = data.cta;
    previewCta.setAttribute("href", data.href);

    previewBenefits.forEach((benefit, index) => {
      benefit.textContent = data.benefits[index] ?? "";
    });

    if (announce) {
      previewStatus.textContent = `${data.title} Preview updated.`;
    }
  };

  /** Close the mega menu and optionally restore focus to its trigger. */
  const closeMegaMenu = ({ restoreFocus = false } = {}) => {
    clearOpenTimer();
    clearCloseTimer();
    pointerWithinMenu = false;

    if (!megaMenu.open) {
      return;
    }

    megaMenu.open = false;
    document.body.classList.remove("mega-open");
    menuSummary.setAttribute("aria-expanded", "false");

    if (restoreFocus) {
      menuSummary.focus();
    }
  };

  /** Preserve the panel only when focus visibly came from keyboard navigation. */
  const hasKeyboardFocusWithin = () => {
    const activeElement = document.activeElement;

    return (
      activeElement instanceof Element &&
      megaMenu.contains(activeElement) &&
      activeElement.matches(":focus-visible")
    );
  };

  /** Add a short intent delay to avoid opening during accidental pointer passes. */
  const scheduleDesktopOpen = () => {
    if (!desktopQuery.matches || !precisePointerQuery.matches) {
      return;
    }

    clearCloseTimer();
    clearOpenTimer();

    if (megaMenu.open) {
      return;
    }

    hoverOpenTimer = window.setTimeout(openMegaMenu, HOVER_OPEN_DELAY);
  };

  /**
   * Close shortly after leaving the hover region. The small grace period
   * prevents flicker while crossing the visual gap between trigger and panel.
   */
  const scheduleDesktopClose = () => {
    if (!desktopQuery.matches || !precisePointerQuery.matches) {
      return;
    }

    clearOpenTimer();
    clearCloseTimer();

    hoverCloseTimer = window.setTimeout(() => {
      if (!pointerWithinMenu && !hasKeyboardFocusWithin()) {
        closeMegaMenu();
      }
    }, HOVER_CLOSE_DELAY);
  };

  /** Keep the mobile navigation state and its accessible label synchronized. */
  const setMobileNav = (isOpen, { restoreFocus = false } = {}) => {
    siteNav.classList.toggle("is-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("nav-open", isOpen && !desktopQuery.matches);

    const label = navToggle.querySelector(".site-nav__toggle-label");
    if (label) {
      label.textContent = isOpen ? "Close" : "Menu";
    }

    if (!isOpen) {
      closeMegaMenu();
    }

    if (restoreFocus) {
      navToggle.focus();
    }
  };

  /** Keep the desktop hover region active across both trigger and panel. */
  const handleHoverEnter = (event) => {
    if (
      !desktopQuery.matches ||
      !precisePointerQuery.matches ||
      event.pointerType === "touch"
    ) {
      return;
    }

    pointerWithinMenu = true;
    clearCloseTimer();

    if (event.currentTarget === menuSummary) {
      scheduleDesktopOpen();
    } else {
      openMegaMenu();
    }
  };

  const handleHoverLeave = (event) => {
    if (
      !desktopQuery.matches ||
      !precisePointerQuery.matches ||
      event.pointerType === "touch"
    ) {
      return;
    }

    pointerWithinMenu = false;
    scheduleDesktopClose();
  };

  menuSummary.addEventListener("pointerenter", handleHoverEnter);
  menuSummary.addEventListener("pointerleave", handleHoverLeave);
  megaSurface.addEventListener("pointerenter", handleHoverEnter);
  megaSurface.addEventListener("pointerleave", handleHoverLeave);

  // Desktop uses hover/focus; touch and narrow layouts retain native click toggling.
  menuSummary.addEventListener("click", (event) => {
    if (desktopQuery.matches && precisePointerQuery.matches) {
      event.preventDefault();
      pointerWithinMenu = true;
      openMegaMenu();
    }
  });

  megaMenu.addEventListener("focusin", (event) => {
    const target = event.target;

    if (
      desktopQuery.matches &&
      target instanceof Element &&
      target.matches(":focus-visible")
    ) {
      clearCloseTimer();
      openMegaMenu();
    }
  });

  megaMenu.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (
        desktopQuery.matches &&
        !pointerWithinMenu &&
        !megaMenu.contains(document.activeElement)
      ) {
        closeMegaMenu();
      }
    }, 0);
  });

  categoryLinks.forEach((link) => {
    const key = link.dataset.preview;

    link.addEventListener("pointerenter", () => {
      if (precisePointerQuery.matches && isPreviewKey(key)) {
        renderPreview(key);
      }
    });

    link.addEventListener("focus", () => {
      if (isPreviewKey(key)) {
        renderPreview(key, { announce: true });
      }
    });

    link.addEventListener("click", (event) => {
      if (!isPreviewKey(key)) {
        return;
      }

      // Enhanced mode uses the category as a preview selector; the CTA retains navigation.
      event.preventDefault();
      renderPreview(key, { announce: true });
    });
  });

  categoryList.addEventListener("keydown", (event) => {
    const currentIndex = categoryLinks.indexOf(document.activeElement);

    if (currentIndex < 0) {
      return;
    }

    let nextIndex = currentIndex;

    switch (event.key) {
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % categoryLinks.length;
        break;
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + categoryLinks.length) % categoryLinks.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = categoryLinks.length - 1;
        break;
      case "ArrowRight":
        event.preventDefault();
        previewCta.focus();
        return;
      case "Escape":
        event.preventDefault();
        closeMegaMenu({ restoreFocus: true });
        return;
      default:
        return;
    }

    event.preventDefault();
    categoryLinks[nextIndex].focus();
  });

  previewCta.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      categoryLinks.find((link) => link.dataset.preview === activePreview)?.focus();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeMegaMenu({ restoreFocus: true });
    }
  });

  menuSummary.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }

    event.preventDefault();
    openMegaMenu();

    const targetIndex = event.key === "ArrowDown" ? 0 : categoryLinks.length - 1;
    window.requestAnimationFrame(() => categoryLinks[targetIndex].focus());
  });

  megaMenu.addEventListener("toggle", () => {
    const isOpen = megaMenu.open;
    menuSummary.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("mega-open", isOpen && !desktopQuery.matches);
  });

  closeButton.addEventListener("click", () => closeMegaMenu({ restoreFocus: true }));

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    setMobileNav(!isOpen);
  });

  // Let ordinary navigation continue while collapsing the temporary mobile UI.
  siteNav.addEventListener("click", (event) => {
    const target = event.target;
    const link = target instanceof Element ? target.closest("a") : null;

    if (!desktopQuery.matches && link && !link.classList.contains("category-card")) {
      setMobileNav(false);
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (desktopQuery.matches && megaMenu.open && !megaMenu.contains(event.target)) {
      closeMegaMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (megaMenu.open) {
      event.preventDefault();
      closeMegaMenu({ restoreFocus: true });
      return;
    }

    if (!desktopQuery.matches && navToggle.getAttribute("aria-expanded") === "true") {
      event.preventDefault();
      setMobileNav(false, { restoreFocus: true });
    }
  });

  /** Normalize transient mobile state whenever the responsive mode changes. */
  const handleViewportChange = (event) => {
    clearOpenTimer();
    clearCloseTimer();
    pointerWithinMenu = false;
    document.body.classList.remove("nav-open", "mega-open");

    if (event.matches) {
      closeMegaMenu();
      siteNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    } else {
      closeMegaMenu();
      setMobileNav(false);
    }
  };

  desktopQuery.addEventListener("change", handleViewportChange);

  // Initialize explicit ARIA state without changing the native disclosure behavior.
  menuSummary.setAttribute("aria-expanded", String(megaMenu.open));
  renderPreview(activePreview);
})();
