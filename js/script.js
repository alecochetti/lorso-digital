/* ==========================================================
   LORSO DIGITAL — script.js
   - Menu mobile (hambúrguer)
   - Máscara de telefone (WhatsApp)
   - Validação + envio do formulário via FormSubmit.co (AJAX)
   - Grade de posts do Instagram (feed JSON do Behold.so)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupMobileMenu();
  setupFocusGlow();
  setupWhatsAppMask();
  setupContactForm();
  setupInstagramFeed();
  setupStatsCounter();
  setupMetodologia();
});

/* -----------------------------
   Ano corrente no rodapé
------------------------------ */
function setCurrentYear() {
  const yearEl = document.getElementById("current-year");
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

/* -----------------------------
   Menu mobile
------------------------------ */
function setupMobileMenu() {
  const toggle = document.getElementById("mobile-menu-toggle");
  const menu = document.getElementById("mobile-menu");
  const icon = document.getElementById("mobile-menu-icon");
  if (!toggle || !menu || !icon) return;

  const closeMenu = () => {
    menu.classList.remove("is-open");
    menu.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    icon.textContent = "menu";
    document.body.classList.remove("menu-open");
  };

  const openMenu = () => {
    menu.classList.add("is-open");
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    icon.textContent = "close";
    document.body.classList.add("menu-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.contains("is-open");
    isOpen ? closeMenu() : openMenu();
  });

  // Fecha o menu ao clicar em qualquer link dentro dele
  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  // Fecha o menu automaticamente se a tela crescer para desktop (lg breakpoint = 1024px)
  window.addEventListener("resize", () => {
    if (window.innerWidth >= 1024) closeMenu();
  });

  // Fecha com a tecla ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
}

/* -----------------------------
   Micro-interação de foco nos campos
------------------------------ */
function setupFocusGlow() {
  document.querySelectorAll(".form-input, .form-input-wrap input").forEach((element) => {
    element.addEventListener("focus", () => {
      element.classList.add("is-focused");
    });
    element.addEventListener("blur", () => {
      element.classList.remove("is-focused");
    });
  });
}

/* -----------------------------
   Máscara de WhatsApp: (11) 99999-9999
------------------------------ */
function setupWhatsAppMask() {
  const input = document.getElementById("field-whatsapp");
  if (!input) return;

  input.addEventListener("input", () => {
    let digits = input.value.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;

    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    input.value = formatted;
  });
}

/* -----------------------------
   Formulário de diagnóstico
   Envia via FormSubmit.co (endpoint AJAX) para o e-mail
   configurado no atributo "action" do <form> em index.html.
   Não requer backend próprio nem chave de API.
------------------------------ */
function setupContactForm() {
  const form = document.getElementById("growth-diag-form");
  if (!form) return;

  const submitBtn = document.getElementById("form-submit-btn");
  const submitLabel = document.getElementById("form-submit-label");
  const successBox = document.getElementById("form-feedback-success");
  const errorBox = document.getElementById("form-feedback-error");
  const consentCheckbox = document.getElementById("privacy-consent");

  const requiredFields = form.querySelectorAll("[required]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    hideFeedback();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Endpoint AJAX do FormSubmit: mesma conta do "action" do form,
      // mas devolve JSON em vez de redirecionar a página.
      const actionEmail = form.getAttribute("action").split("/").pop();
      const endpoint = `https://formsubmit.co/ajax/${actionEmail}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: new FormData(form),
      });

      if (!response.ok) throw new Error("Falha no envio");

      // O FormSubmit pode responder 200 mesmo recusando o envio
      // (ex.: formulário não ativado) — confere o campo "success".
      const result = await response.json().catch(() => ({}));
      if (String(result.success) !== "true") {
        throw new Error(result.message || "Envio recusado pelo FormSubmit");
      }

      showSuccess();
      form.reset();
    } catch (err) {
      showError();
    } finally {
      setLoading(false);
    }
  });

  function validateForm() {
    let isValid = true;

    requiredFields.forEach((field) => {
      const wrapper = field.closest(".form-input-wrap");
      const target = wrapper || field;

      if (field.type === "checkbox" && !field.checked) {
        isValid = false;
        return;
      }
      if (field.type !== "checkbox" && !field.value.trim()) {
        isValid = false;
        target.classList.add("is-invalid");
        field.addEventListener(
          "input",
          () => target.classList.remove("is-invalid"),
          { once: true }
        );
        return;
      }
      target.classList.remove("is-invalid");
    });

    // Validação simples de e-mail
    const emailField = document.getElementById("field-email");
    if (emailField && emailField.value && !/^\S+@\S+\.\S+$/.test(emailField.value)) {
      isValid = false;
      emailField.classList.add("is-invalid");
    }

    // Validação de WhatsApp (10 ou 11 dígitos com DDD)
    const whatsappField = document.getElementById("field-whatsapp");
    if (whatsappField) {
      const digits = whatsappField.value.replace(/\D/g, "");
      if (digits.length < 10) {
        isValid = false;
        whatsappField.classList.add("is-invalid");
      }
    }

    if (!consentCheckbox.checked) {
      isValid = false;
    }

    if (!isValid) showError("Preencha todos os campos obrigatórios corretamente.");

    return isValid;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitLabel.textContent = isLoading
      ? "Enviando..."
      : "Enviar Solicitação de Diagnóstico";
  }

  function showSuccess() {
    successBox.classList.add("is-visible");
    successBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function showError(customMessage) {
    if (customMessage) {
      errorBox.querySelector("span:last-child").textContent = customMessage;
    }
    errorBox.classList.add("is-visible");
  }

  function hideFeedback() {
    successBox.classList.remove("is-visible");
    errorBox.classList.remove("is-visible");
  }
}

/* -----------------------------
   Instagram
   Lê o feed JSON do Behold.so (ID em data-feed-id no #instagram-feed)
   e substitui os quadros de placeholder pelos últimos posts.
   Sem ID ou com erro, os placeholders continuam linkando para o perfil.
------------------------------ */
async function setupInstagramFeed() {
  const grid = document.getElementById("instagram-feed");
  const feedId = grid?.dataset.feedId;
  if (!feedId) return;

  try {
    const response = await fetch(`https://feeds.behold.so/${feedId}`);
    if (!response.ok) throw new Error("Feed indisponível");
    const data = await response.json();
    const posts = (Array.isArray(data) ? data : data.posts || []).slice(0, 3);
    if (!posts.length) return;

    grid.querySelectorAll(".insta-tile-placeholder").forEach((tile) => tile.remove());

    posts.forEach((post) => {
      const image =
        post.sizes?.medium?.mediaUrl ||
        (post.mediaType === "VIDEO" ? post.thumbnailUrl : post.mediaUrl);
      if (!image) return;

      const caption = (post.prunedCaption || post.caption || "").trim();
      const tile = document.createElement("a");
      tile.className = "insta-tile";
      tile.href = post.permalink;
      tile.target = "_blank";
      tile.rel = "noopener";
      tile.setAttribute("aria-label", caption ? caption.slice(0, 120) : "Post no Instagram");

      const img = document.createElement("img");
      img.src = image;
      img.alt = caption ? caption.slice(0, 120) : "Post da LORSO Digital no Instagram";
      img.loading = "lazy";
      tile.appendChild(img);

      if (caption) {
        const overlay = document.createElement("span");
        overlay.className = "insta-tile-overlay";
        overlay.textContent = caption.length > 90 ? `${caption.slice(0, 90)}…` : caption;
        tile.appendChild(overlay);
      }

      grid.appendChild(tile);
    });
  } catch (err) {
    // Mantém os placeholders
  }
}

/* -----------------------------
   Números animados (contador)
------------------------------ */
function setupStatsCounter() {
  const cards = document.querySelectorAll(".stat-card");
  if (!cards.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js-anim");
  if (reduce || !("IntersectionObserver" in window)) {
    cards.forEach((c) => c.classList.add("is-in"));
    return;
  }
  const fmt = (el, v) => { el.textContent = (el.dataset.prefix || "") + v + (el.dataset.suffix || ""); };
  cards.forEach((c) => { const n = c.querySelector(".stat-num"); if (n) fmt(n, 0); });

  const count = (el, delay) => {
    const target = parseInt(el.dataset.count, 10) || 0;
    const dur = 1800;
    setTimeout(() => {
      el.classList.add("is-counting");
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 4);
        fmt(el, Math.round(target * eased));
        if (p < 1) requestAnimationFrame(tick);
        else el.classList.remove("is-counting");
      };
      requestAnimationFrame(tick);
    }, delay);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const card = e.target;
      card.classList.add("is-in");
      const i = parseInt(card.style.getPropertyValue("--i"), 10) || 0;
      const n = card.querySelector(".stat-num");
      if (n) count(n, 200 + i * 120);
      io.unobserve(card);
    });
  }, { threshold: 0.4 });
  cards.forEach((c) => io.observe(c));
}

/* -----------------------------
   Metodologia em 5 etapas (timeline animada)
------------------------------ */
function setupMetodologia() {
  const section = document.getElementById("o-metodo");
  if (!section) return;
  const wrap = section.querySelector(".metodo-steps");
  const steps = [...section.querySelectorAll(".metodo-step")];
  const fill = section.querySelector(".metodo-track-fill");
  if (!wrap || !steps.length) return;
  document.documentElement.classList.add("js-anim");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DUR = 2600;
  let idx = -1, timer = null, started = false, visible = false, hovering = false;

  const go = (i) => {
    idx = i;
    steps.forEach((s, k) => {
      s.classList.toggle("is-active", k === i);
      s.classList.toggle("is-done", k < i);
      const bar = s.querySelector(".metodo-bar i");
      if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
    });
    if (fill) fill.style.width = (i / (steps.length - 1)) * 100 + "%";
  };
  const loop = () => {
    clearTimeout(timer);
    if (!visible || hovering) return;
    timer = setTimeout(() => { go((idx + 1) % steps.length); loop(); }, DUR);
  };

  if (reduce || !("IntersectionObserver" in window)) {
    section.classList.add("is-in");
    go(steps.length - 1);
    return;
  }

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !started) {
      started = true;
      section.classList.add("is-in");
      setTimeout(() => { go(0); loop(); }, 900);
      return;
    }
    if (started) visible ? loop() : clearTimeout(timer);
  }, { threshold: 0.3 }).observe(section);

  steps.forEach((s, k) => {
    s.addEventListener("mouseenter", () => {
      if (!started) return;
      hovering = true; wrap.classList.add("is-paused"); clearTimeout(timer); go(k);
    });
    s.addEventListener("mouseleave", () => {
      if (!started) return;
      hovering = false; wrap.classList.remove("is-paused"); loop();
    });
  });
}
