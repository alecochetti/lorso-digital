/* Menu do celular e janela da Área do Cliente (todas as páginas) */
(function () {
  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  ready(function () {
    var menu = document.getElementById("site-menu");
    var toggle = document.getElementById("site-menu-toggle");
    var modal = document.getElementById("area-modal");
    function setMenu(open) {
      if (!menu || !toggle) return;
      menu.hidden = !open;
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
    function setArea(open) {
      if (!modal) return;
      modal.hidden = !open;
      document.documentElement.style.overflow = open ? "hidden" : "";
      if (open) { setMenu(false); var f = modal.querySelector("a, button"); if (f) f.focus(); }
    }
    if (toggle) toggle.addEventListener("click", function () { setMenu(menu.hidden); });
    if (menu) menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.querySelectorAll("[data-open-area]").forEach(function (b) { b.addEventListener("click", function () { setArea(true); }); });
    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target === modal || e.target.closest("[data-close-area]")) setArea(false);
      });
    }
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { setArea(false); setMenu(false); }
    });
    if (location.hash === "#area-cliente") setArea(true);
    if (location.pathname.indexOf("/trabalheconosco") === 0) {
      document.querySelectorAll('.lorso-site-header a[href="/trabalheconosco/"]').forEach(function (a) {
        a.style.color = "#00FF87"; a.setAttribute("aria-current", "page");
      });
    }
  });
})();
