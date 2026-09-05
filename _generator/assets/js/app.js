/* Calming The Chaos — front-end shell (no dependencies) */
(function () {
  "use strict";
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- header scroll state ---------- */
  var header = $(".site-header");
  var onScroll = function () {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  var burger = $(".burger"), links = $(".nav-links");
  if (burger && links) {
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    $$(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }

  /* ---------- cart (UI shell, in-memory) ---------- */
  var CART = [];
  var scrim = $(".drawer-scrim"), drawer = $(".drawer");
  var svgFor = function (icon) {
    var t = document.getElementById("svg-" + icon);
    return t ? t.innerHTML : "";
  };

  function renderCart() {
    var body = $(".drawer-body"), countEls = $$(".cart-count"), totalEl = $(".drawer-total b");
    var count = CART.reduce(function (n, i) { return n + i.qty; }, 0);
    countEls.forEach(function (el) { el.textContent = count; el.style.display = count ? "" : "none"; });
    if (!body) return;
    if (!CART.length) {
      body.innerHTML =
        '<div class="drawer-empty"><svg viewBox="0 0 24 24" fill="none" stroke="#7EC8E3" stroke-width="1.4"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M6 6L5 3H2"/></svg><p>Your selections will appear here.</p><p class="tiny">Not sure what fits your space? Ask Lorelei — she’ll build the right stack with you.</p></div>';
      if (totalEl) totalEl.textContent = "$X.XX";
      var f = $(".drawer-foot .btn-gold"); if (f) f.setAttribute("aria-disabled", "true");
      return;
    }
    var html = "";
    CART.forEach(function (i, idx) {
      html +=
        '<div class="ci"><div class="ci-plate">' + svgFor(i.icon) + '</div>' +
        '<div class="ci-info"><b>' + i.name + '</b><div class="price gold-text">$X.XX</div>' +
        '<div class="qty"><button aria-label="Decrease" data-dec="' + idx + '">−</button><span>' + i.qty + '</span><button aria-label="Increase" data-inc="' + idx + '">+</button></div><br>' +
        '<button class="ci-remove" data-rm="' + idx + '">Remove</button></div></div>';
    });
    body.innerHTML = html;
    if (totalEl) totalEl.textContent = "$X.XX";
    var f2 = $(".drawer-foot .btn-gold"); if (f2) f2.removeAttribute("aria-disabled");
    $$("[data-inc]", body).forEach(function (b) { b.onclick = function () { CART[+b.dataset.inc].qty++; renderCart(); }; });
    $$("[data-dec]", body).forEach(function (b) { b.onclick = function () { var i = +b.dataset.dec; CART[i].qty--; if (CART[i].qty < 1) CART.splice(i, 1); renderCart(); }; });
    $$("[data-rm]", body).forEach(function (b) { b.onclick = function () { CART.splice(+b.dataset.rm, 1); renderCart(); }; });
  }

  function openCart() { if (scrim) scrim.classList.add("open"); if (drawer) drawer.classList.add("open"); document.body.style.overflow = "hidden"; }
  function closeCart() { if (scrim) scrim.classList.remove("open"); if (drawer) drawer.classList.remove("open"); document.body.style.overflow = ""; }

  $$(".js-open-cart").forEach(function (b) { b.addEventListener("click", openCart); });
  $$(".js-close-cart").forEach(function (b) { b.addEventListener("click", closeCart); });
  if (scrim) scrim.addEventListener("click", closeCart);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCart(); });

  var toastTimer;
  function toast(msg) {
    var t = $(".toast"); if (!t) return;
    $(".toast b").textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2200);
  }

  $$(".js-add").forEach(function (b) {
    b.addEventListener("click", function () {
      var name = b.dataset.name, icon = b.dataset.icon || "chip";
      var ex = CART.filter(function (i) { return i.name === name; })[0];
      if (ex) ex.qty++; else CART.push({ name: name, icon: icon, qty: 1 });
      renderCart(); toast("Added — " + name); openCart();
    });
  });
  renderCart();

  /* ---------- Start Here chooser ---------- */
  $$(".choice").forEach(function (c) {
    c.addEventListener("click", function () {
      $$(".choice").forEach(function (x) { x.classList.remove("active"); });
      c.classList.add("active");
      $$(".result-panel").forEach(function (p) { p.classList.remove("show"); });
      var target = document.getElementById("res-" + c.dataset.choice);
      if (target) { target.classList.add("show"); }
      var res = $(".result");
      if (res && window.matchMedia("(max-width:860px)").matches) res.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  /* ---------- contact form (mailto stub) ---------- */
  var form = $("#contact-form");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var body =
        "Name: " + (d.get("name") || "") + "\n" +
        "City/State: " + (d.get("location") || "") + "\n" +
        "Home type: " + (d.get("hometype") || "") + "\n" +
        "What's bothering you: " + (d.get("concern") || "") + "\n\n" +
        (d.get("message") || "");
      var subject = "Website inquiry — Calming The Chaos";
      window.location.href = "mailto:nevergiveupxx@icloud.com?subject=" +
        encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
      toast("Opening your email…");
    });
  }

  /* ---------- reveal on scroll ---------- */
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion:reduce)").matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.style.opacity = 1; en.target.style.transform = "none"; io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    $$("[data-reveal]").forEach(function (el) {
      el.style.opacity = 0; el.style.transform = "translateY(22px)";
      el.style.transition = "opacity .7s cubic-bezier(.2,.7,.2,1), transform .7s cubic-bezier(.2,.7,.2,1)";
      io.observe(el);
    });
  }

  /* ---------- year ---------- */
  $$(".js-year").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
