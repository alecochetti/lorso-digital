/* ==========================================================
   LORSO DIGITAL — candidatura.js
   Formulários de candidatura e banco de talentos (Trabalhe Conosco).
   - Mostra o nome do arquivo anexado
   - Máscara de pretensão salarial (quando o campo existe)
   - Valida campos obrigatórios e o currículo (PDF/Word até 5 MB;
     o FormSubmit aceita até 10 MB no total)
   - Etapas opcionais ([data-step], [data-next], [data-back])
   - Triagem opcional: perguntas com data-score / data-knockout geram
     os campos "Fit (0 a 100)" e "Triagem" e entram no assunto do e-mail
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

  const isBadFile = (input) => {
    const file = input.files[0];
    return file && (file.size > MAX_FILE || !ALLOWED.test(file.name));
  };

  const showError = (message) => {
    errorBox.querySelector("span:last-child").textContent = message;
    errorBox.classList.add("is-visible");
  };

  // Valida os campos obrigatórios dentro de "scope" (o form inteiro ou uma etapa)
  const validate = (scope) => {
    let valid = true;
    scope.querySelectorAll("[required]").forEach((field) => {
      let target;
      if (field.type === "file") target = form.querySelector(`label[for="${field.id}"]`);
      else if (field.type === "radio") target = field.closest("fieldset");
      else target = field.closest(".form-input-wrap") || field;
      const ok = field.type === "checkbox" ? field.checked : field.checkValidity();
      if (target) target.classList.toggle("is-invalid", !ok && field.type !== "checkbox");
      if (!ok) valid = false;
    });
    return valid;
  };

  // Formulário em etapas (opcional): [data-step], botões [data-next] e [data-back]
  const steps = [...form.querySelectorAll("[data-step]")];
  const goTo = (index) => {
    steps.forEach((step, i) => { step.hidden = i !== index; });
    errorBox.classList.remove("is-visible");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  form.querySelectorAll("[data-next]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = btn.closest("[data-step]");
      errorBox.classList.remove("is-visible");
      if (!validate(current)) {
        showError("Preencha todos os campos obrigatórios corretamente.");
        return;
      }
      const badFile = [...current.querySelectorAll('input[type="file"]')].find(isBadFile);
      if (badFile) {
        form.querySelector(`label[for="${badFile.id}"]`).classList.add("is-invalid");
        showError("O currículo deve ser PDF ou Word, com até 5 MB.");
        return;
      }
      goTo(steps.indexOf(current) + 1);
    });
  });
  form.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(steps.indexOf(btn.closest("[data-step]")) - 1));
  });
  form.querySelectorAll('input[type="radio"]').forEach((radio) => {
    radio.addEventListener("change", () => radio.closest("fieldset")?.classList.remove("is-invalid"));
  });

  // Triagem: soma data-score das respostas; data-knockout marca "Não atende"
  const fitScore = form.querySelector("[data-fit-score]");
  const fitResult = form.querySelector("[data-fit-result]");
  const subjectInput = form.querySelector('input[name="_subject"]');
  const baseSubject = subjectInput ? subjectInput.value : "";
  const applyTriagem = () => {
    if (!fitScore || !fitResult) return;
    const checked = [...form.querySelectorAll('input[type="radio"][data-score]:checked')];
    const score = checked.reduce((sum, r) => sum + Number(r.dataset.score || 0), 0);
    const knockout = checked.some((r) => r.hasAttribute("data-knockout"));
    const result = knockout ? "Não atende" : score >= 70 ? "Alto fit" : "Médio fit";
    fitScore.value = String(score);
    fitResult.value = result;
    if (subjectInput) subjectInput.value = `${baseSubject} | ${result} | Fit ${score}`;
  };

  form.addEventListener("submit", (event) => {
    errorBox.classList.remove("is-visible");

    if (!validate(form)) {
      event.preventDefault();
      const firstInvalid = steps.findIndex((step) => !validate(step));
      if (firstInvalid >= 0 && steps[firstInvalid].hidden) goTo(firstInvalid);
      showError("Preencha todos os campos obrigatórios corretamente.");
      return;
    }

    const badFile = [...fileInputs].find(isBadFile);
    if (badFile) {
      event.preventDefault();
      form.querySelector(`label[for="${badFile.id}"]`).classList.add("is-invalid");
      showError("O currículo deve ser PDF ou Word, com até 5 MB.");
      return;
    }

    applyTriagem();
    submitBtn.disabled = true;
    submitLabel.textContent = "Enviando...";
  });

  // Ao voltar para a página pelo navegador, reabilita o botão
  window.addEventListener("pageshow", () => {
    submitBtn.disabled = false;
    submitLabel.textContent = submitText;
  });
});
