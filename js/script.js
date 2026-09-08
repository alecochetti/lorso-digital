/* ==========================================================
   LORSO DIGITAL — script.js
   - Menu mobile (hambúrguer)
   - Máscara de telefone (WhatsApp)
   - Validação + envio do formulário via FormSubmit.co (AJAX)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  setCurrentYear();
  setupMobileMenu();
  setupFocusGlow();
  setupWhatsAppMask();
  setupContactForm();
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
