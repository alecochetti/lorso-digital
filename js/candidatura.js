/* ==========================================================
   LORSO DIGITAL — candidatura.js
   Formulários de candidatura e banco de talentos (Trabalhe Conosco).
   - Mostra o nome do arquivo anexado
   - Máscara de pretensão salarial (quando o campo existe)
   - Valida campos obrigatórios e o currículo (PDF/Word até 5 MB;
     o FormSubmit aceita até 10 MB no total)
   Cada <form class="js-candidatura"> tem dentro dele:
   [data-submit], [data-submit-label] e [data-feedback].
   ========================================================== */

document.querySelectorAll("form.js-candidatura").forEach((form) => {
  const MAX_FILE = 5 * 1024 * 1024;
  const ALLOWED = /\.(pdf|docx?)$/i;
  const errorBox = form.querySelector("[data-feedback]");
  const submitBtn = form.querySelector("[data-submit]");
  const submitLabel = form.querySelector("[data-submit-label]");
  const submitText = submitLabel.textContent;
  const fileInputs = form.querySelectorAll('input[type="file"]');

  fileInputs.forEach((input) => {
    const drop = form.querySelector(`label[for="${input.id}"]`);
    const label = drop.querySelector(".file-drop-label");
    input.addEventListener("change", () => {
      const file = input.files[0];
      label.textContent = file ? file.name : label.dataset.placeholder;
      drop.classList.toggle("has-file", !!file);
      drop.classList.remove("is-invalid");
    });
  });

  const pretensao = form.querySelector("[data-currency]");
  if (pretensao) {
    pretensao.addEventListener("input", () => {
      const digits = pretensao.value.replace(/\D/g, "").slice(0, 9);
      pretensao.value = digits
        ? (Number(digits) / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        : "";
    });
  }

  const showError = (message) => {
    errorBox.querySelector("span:last-child").textContent = message;
    errorBox.classList.add("is-visible");
  };

  form.addEventListener("submit", (event) => {
    errorBox.classList.remove("is-visible");
    let valid = true;

    form.querySelectorAll("[required]").forEach((field) => {
      const target = field.type === "file"
        ? form.querySelector(`label[for="${field.id}"]`)
        : field.closest(".form-input-wrap") || field;
      const ok = field.type === "checkbox" ? field.checked : field.checkValidity();
      target.classList.toggle("is-invalid", !ok && field.type !== "checkbox");
      if (!ok) valid = false;
    });

    if (!valid) {
      event.preventDefault();
      showError("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    const badFile = [...fileInputs].find((input) => {
      const file = input.files[0];
      return file && (file.size > MAX_FILE || !ALLOWED.test(file.name));
    });
    if (badFile) {
      event.preventDefault();
      form.querySelector(`label[for="${badFile.id}"]`).classList.add("is-invalid");
      showError("O currículo deve ser PDF ou Word, com até 5 MB.");
      return;
    }

    submitBtn.disabled = true;
    submitLabel.textContent = "Enviando...";
  });

  // Ao voltar para a página pelo navegador, reabilita o botão
  window.addEventListener("pageshow", () => {
    submitBtn.disabled = false;
    submitLabel.textContent = submitText;
  });
});
