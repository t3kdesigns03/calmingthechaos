/* Calming The Chaos — checkout (PayPal JS SDK v6: PayPal, Venmo, Debit/Credit Card button, card fields).
 *
 * Flow: shipping address → server quote → PayPal order created by OUR server →
 * buyer approves in PayPal/Venmo/card UI → OUR server captures → success shown
 * only after the server confirms the capture. Card numbers are typed into
 * PayPal-hosted fields and never touch this page's code or our server.
 */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var SHIP_KEY = "ctc-ship-v1";
  var STATES = [["AL","Alabama"],["AK","Alaska"],["AZ","Arizona"],["AR","Arkansas"],["CA","California"],["CO","Colorado"],["CT","Connecticut"],["DE","Delaware"],["DC","District of Columbia"],["FL","Florida"],["GA","Georgia"],["HI","Hawaii"],["ID","Idaho"],["IL","Illinois"],["IN","Indiana"],["IA","Iowa"],["KS","Kansas"],["KY","Kentucky"],["LA","Louisiana"],["ME","Maine"],["MD","Maryland"],["MA","Massachusetts"],["MI","Michigan"],["MN","Minnesota"],["MS","Mississippi"],["MO","Missouri"],["MT","Montana"],["NE","Nebraska"],["NV","Nevada"],["NH","New Hampshire"],["NJ","New Jersey"],["NM","New Mexico"],["NY","New York"],["NC","North Carolina"],["ND","North Dakota"],["OH","Ohio"],["OK","Oklahoma"],["OR","Oregon"],["PA","Pennsylvania"],["RI","Rhode Island"],["SC","South Carolina"],["SD","South Dakota"],["TN","Tennessee"],["TX","Texas"],["UT","Utah"],["VT","Vermont"],["VA","Virginia"],["WA","Washington"],["WV","West Virginia"],["WI","Wisconsin"],["WY","Wyoming"],["AA","Armed Forces Americas"],["AE","Armed Forces Europe"],["AP","Armed Forces Pacific"],["AS","American Samoa"],["GU","Guam"],["MP","Northern Mariana Islands"],["PR","Puerto Rico"],["VI","U.S. Virgin Islands"]];

  var cart = window.CTCCart;
  var catalog = null;
  var shipping = null;   // validated address the server last quoted
  var sdkStarted = false;
  var cardSession = null;
  var busy = false;

  var esc = function (t) { return String(t == null ? "" : t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var money = function (v) { return "$" + Number(v).toFixed(2); };

  function show(el, on) { if (el) el.hidden = !on; }
  function setErr(el, msg) { el.textContent = msg || ""; show(el, !!msg); if (msg) el.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
  function setBusy(on) { busy = on; show($("pay-busy"), on); }

  function fillStates(sel) {
    sel.innerHTML = '<option value="">State</option>' + STATES.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + "</option>"; }).join("");
  }

  async function api(path, body, method) {
    var res, data;
    try {
      res = await fetch(path, { method: method || "POST", headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
      data = await res.json();
    } catch (e) {
      return { ok: false, message: "We couldn't reach our checkout server. Check your connection and try again — you have not been charged." };
    }
    if (!data || typeof data !== "object") data = { ok: false };
    if (!res.ok && data.ok !== false) data.ok = false;
    if (data.ok === false && !data.message) data.message = "Something went wrong. Please try again — you have not been charged.";
    return data;
  }

  /* ---------- order summary ---------- */
  function renderSummary(totals) {
    var items = cart.items();
    var lines = $("sum-lines");
    var sub = 0;
    lines.innerHTML = items.map(function (i) {
      var p = catalog.products[i.sku];
      if (!p) return "";
      sub += p.priceCents * i.qty;
      return "<li><span>" + esc(p.name) + "<small>Qty " + i.qty + " × " + money(p.priceCents / 100) + "</small></span><b>" + money((p.priceCents * i.qty) / 100) + "</b></li>";
    }).join("");
    $("sum-sub").textContent = totals ? money(totals.subtotal) : money(sub / 100);
    $("sum-ship").textContent = totals ? (Number(totals.shipping) ? money(totals.shipping) : "Free") : "Next step";
    $("sum-tax").textContent = totals ? money(totals.tax) : "Next step";
    $("sum-total").textContent = totals ? money(totals.total) : money(sub / 100);
  }

  function refreshState() {
    var empty = cart.items().length === 0;
    if (!$("co-done").hidden) return;
    show($("co-empty"), empty);
    show($("co-grid"), !empty);
    if (empty) return;
    renderSummary(null);
    if (shipping) lockPayment(); // cart changed after quoting → re-confirm address/totals
  }

  /* ---------- step 1: shipping ---------- */
  var FIELDS = ["name", "email", "line1", "line2", "city", "state", "zip", "phone"];
  function readShip() {
    var s = {};
    FIELDS.forEach(function (f) { s[f] = ($("s-" + f).value || "").trim(); });
    s.state = s.state.toUpperCase();
    return s;
  }
  function checkShip(s) {
    var bad = [];
    if (s.name.length < 2) bad.push("name");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email)) bad.push("email");
    if (s.line1.length < 3) bad.push("line1");
    if (s.city.length < 2) bad.push("city");
    if (!s.state) bad.push("state");
    if (!/^\d{5}(-\d{4})?$/.test(s.zip)) bad.push("zip");
    return bad;
  }
  function markBad(bad) {
    FIELDS.forEach(function (f) { $("s-" + f).removeAttribute("aria-invalid"); });
    bad.forEach(function (f) { var el = $("s-" + f); if (el) el.setAttribute("aria-invalid", "true"); });
    if (bad.length) { var first = $("s-" + bad[0]); if (first) first.focus(); }
  }

  async function submitShip(ev) {
    if (ev) ev.preventDefault();
    var s = readShip();
    var bad = checkShip(s);
    markBad(bad);
    if (bad.length) return setErr($("ship-err"), "Please check the highlighted fields.");
    setErr($("ship-err"), "");
    var btn = $("ship-go");
    btn.disabled = true; btn.textContent = "Checking…";
    var r = await api("/api/checkout/quote", { items: cart.items(), shipping: s });
    btn.disabled = false; btn.textContent = "Continue to payment";
    if (!r.ok) {
      if (r.fields) markBad(r.fields);
      return setErr($("ship-err"), r.message);
    }
    try { sessionStorage.setItem(SHIP_KEY, JSON.stringify(s)); } catch (e) {}
    shipping = s;
    renderSummary(r.totals);
    $("ship-summary").innerHTML = "<b>" + esc(s.name) + "</b>" + esc(s.line1) + (s.line2 ? ", " + esc(s.line2) : "") + "<br>" + esc(s.city) + ", " + esc(s.state) + " " + esc(s.zip) + "<br>" + esc(s.email);
    show($("ship-form"), false);
    show($("ship-done"), true);
    unlockPayment(r.totals);
  }

  function editShip() {
    lockPayment();
    show($("ship-form"), true);
    show($("ship-done"), false);
    $("s-name").focus();
  }

  /* ---------- step 2: payment ---------- */
  function unlockPayment(totals) {
    $("co-pay").removeAttribute("aria-disabled");
    show($("pay-locked"), false);
    show($("pay-body"), true);
    setErr($("pay-err"), "");
    $("card-pay").textContent = "Pay " + money(totals.total) + " by card";
    if (!sdkStarted) { sdkStarted = true; startSdk(); }
    if (window.innerWidth < 900) $("co-pay").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function lockPayment() {
    shipping = null;
    $("co-pay").setAttribute("aria-disabled", "true");
    show($("pay-locked"), true);
    show($("pay-body"), false);
    show($("ship-form"), true);
    show($("ship-done"), false);
    renderSummary(null);
  }

  async function createOrder(method) {
    if (!shipping) throw new Error("Please confirm your shipping details first.");
    setErr($("pay-err"), "");
    var r = await api("/api/checkout/orders", { method: method, items: cart.items(), shipping: shipping });
    if (!r.ok) { setErr($("pay-err"), r.message); throw new Error(r.message); }
    return { orderId: r.orderId };
  }

  async function captureAndFinish(orderId) {
    setBusy(true);
    var r = await api("/api/checkout/orders/" + encodeURIComponent(orderId) + "/capture", {});
    setBusy(false);
    if (!r.ok) { setErr($("pay-err"), r.message); return false; }
    showDone(r);
    return true;
  }

  function showDone(r) {
    cart.clear();
    try { sessionStorage.removeItem(SHIP_KEY); } catch (e) {}
    show($("co-grid"), false);
    show($("co-empty"), false);
    $("co-done-title").textContent = r.status === "PAID" ? "Thank you — your order is in" : "Thank you — we've got your order";
    $("co-done-msg").textContent = r.message || "";
    $("co-done-ref").textContent = r.reference || r.orderId;
    $("co-done-total").textContent = r.total ? money(r.total) : "—";
    $("co-done-email").textContent = r.email || "you";
    show($("co-done"), true);
    if (history.replaceState) history.replaceState(null, "", location.pathname);
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("co-done").focus({ preventScroll: true });
  }

  var friendlySdkError = "PayPal ran into a problem starting that payment, so you have not been charged. Please try again or choose another way to pay.";

  function sessionCallbacks() {
    return {
      onApprove: async function (data) { await captureAndFinish(data.orderId); },
      onCancel: function () { setErr($("pay-err"), "Payment canceled — you have not been charged. Choose a payment option when you're ready."); },
      onError: function (err) {
        if (window.console && console.warn) console.warn("[checkout] PayPal session error", err && (err.code || err.message));
        if ($("pay-err").hidden) setErr($("pay-err"), friendlySdkError);
      }
    };
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("sdk load failed")); };
      document.head.appendChild(s);
    });
  }

  async function startSdk() {
    var loading = $("pay-loading");
    try {
      var tok = await api("/api/paypal/client-token", null, "GET");
      if (!tok.ok) throw new Error("token");
      var sandbox = tok.env !== "live";
      await loadScript(sandbox ? "https://www.sandbox.paypal.com/web-sdk/v6/core" : "https://www.paypal.com/web-sdk/v6/core");
      var opts = { clientToken: tok.clientToken, pageType: "checkout", locale: "en-US" };
      if (sandbox) opts.testBuyerCountry = "US";
      var sdk;
      try {
        sdk = await window.paypal.createInstance(Object.assign({ components: ["paypal-payments", "venmo-payments", "paypal-guest-payments", "card-fields"] }, opts));
      } catch (e) { // an optional component not enabled on the PayPal app — fall back to the core set
        if (window.console && console.warn) console.warn("[checkout] full SDK init failed, retrying core set", e && e.message);
        sdk = await window.paypal.createInstance(Object.assign({ components: ["paypal-payments", "venmo-payments", "card-fields"] }, opts));
      }
      var methods = await sdk.findEligibleMethods({ currencyCode: "USD" });
      var eligible = function (m) { try { return methods.isEligible(m); } catch (e) { return false; } };
      var shown = 0;

      if (eligible("paypal") && sdk.createPayPalOneTimePaymentSession) {
        var ppSession = sdk.createPayPalOneTimePaymentSession(sessionCallbacks());
        wireButton($("pp-btn"), function () { return ppSession.start({ presentationMode: "auto" }, createOrder("paypal")); });
        shown++;
        if (ppSession.hasReturned && ppSession.hasReturned()) { setBusy(true); ppSession.resume().catch(function () { setBusy(false); }); }
      }
      if (eligible("venmo") && sdk.createVenmoOneTimePaymentSession) {
        var vSession = sdk.createVenmoOneTimePaymentSession(sessionCallbacks());
        wireButton($("venmo-btn"), function () { return vSession.start({ presentationMode: "auto" }, createOrder("venmo")); });
        shown++;
      }
      if ((eligible("card") || eligible("basic_cards")) && sdk.createPayPalGuestOneTimePaymentSession) {
        var cb = sessionCallbacks();
        cb.onWarn = function () { setErr($("pay-err"), "Please check your card details in the PayPal form."); };
        var gSession = sdk.createPayPalGuestOneTimePaymentSession(cb);
        var gBtn = $("guest-btn");
        show($("guest-wrap"), true);
        gBtn.addEventListener("click", function () {
          if (busy) return;
          gSession.start({ presentationMode: "auto", targetElement: gBtn }, createOrder("guest")).catch(function () {});
        });
        shown++;
      }
      if (eligible("advanced_cards") && sdk.createCardFieldsOneTimePaymentSession) {
        setupCardFields(sdk);
        shown++;
      }
      show(loading, false);
      if (!shown) setErr($("pay-err"), "Online payment isn't available right now. Please contact Lorelei to place your order — (806) 789-4795.");
    } catch (e) {
      if (window.console && console.warn) console.warn("[checkout] payment options failed to load", e && e.message);
      show(loading, false);
      setErr($("pay-err"), "We couldn't load the payment options. Please refresh the page, or contact Lorelei to order — (806) 789-4795.");
    }
  }

  function wireButton(el, start) {
    show(el, true);
    el.addEventListener("click", function () {
      if (busy) return;
      start().catch(function () { /* message already shown by createOrder/onError */ });
    });
  }

  var FIELD_STYLE = {
    input: { fontSize: "16px", fontFamily: "Plus Jakarta Sans, Segoe UI, system-ui, sans-serif", color: "#12303F", padding: "14px 16px", border: "1px solid rgba(22,58,76,.22)", borderRadius: "12px", background: "rgba(255,255,255,.95)" },
    "input.focus": { border: "1px solid #2B6F8A", boxShadow: "0 0 0 3px rgba(43,111,138,.18)" },
    "input.invalid": { border: "1px solid #B4482F", color: "#7A2A17" },
    "input::placeholder": { color: "#8aa2b0" }
  };

  function setupCardFields(sdk) {
    cardSession = sdk.createCardFieldsOneTimePaymentSession();
    [["name", "cf-name", "Full name on card"], ["number", "cf-number", "Card number"], ["expiry", "cf-expiry", "MM / YY"], ["cvv", "cf-cvv", "CVV"]].forEach(function (f) {
      var c = cardSession.createCardFieldsComponent({ type: f[0], placeholder: f[2], style: FIELD_STYLE, ariaLabel: f[2] });
      $(f[1]).appendChild(c);
    });
    show($("co-cards"), true);
    $("card-pay").addEventListener("click", payByCard);
  }

  function billingAddress() {
    if ($("bill-same").checked) {
      return { addressLine1: shipping.line1, addressLine2: shipping.line2 || undefined, adminArea2: shipping.city, adminArea1: shipping.state, postalCode: shipping.zip, countryCode: "US" };
    }
    var b = { addressLine1: $("b-line1").value.trim(), adminArea2: $("b-city").value.trim(), adminArea1: $("b-state").value, postalCode: $("b-zip").value.trim(), countryCode: "US" };
    if (!b.addressLine1 || !b.adminArea2 || !b.adminArea1 || !/^\d{5}(-\d{4})?$/.test(b.postalCode)) return null;
    return b;
  }

  async function payByCard() {
    if (busy || !cardSession) return;
    setErr($("pay-err"), "");
    var bill = billingAddress();
    if (!bill) return setErr($("pay-err"), "Please complete the billing address for your card.");
    var btn = $("card-pay");
    btn.disabled = true;
    try {
      var created = await createOrder("card");
      setBusy(true);
      var result = await cardSession.submit(created.orderId, { billingAddress: bill });
      setBusy(false);
      switch (result && result.state) {
        case "succeeded":
          await captureAndFinish(result.data.orderId || created.orderId);
          break;
        case "canceled":
          setErr($("pay-err"), "Card verification was canceled — you have not been charged. You can try again.");
          break;
        case "failed":
          setErr($("pay-err"), "We couldn't process that card, so you have not been charged. Please check the details or try a different card.");
          break;
        default:
          setErr($("pay-err"), "Your card payment didn't go through, so you have not been charged. Please try again.");
      }
    } catch (e) {
      setBusy(false);
      if ($("pay-err").hidden) setErr($("pay-err"), "Please check your card details and try again — you have not been charged.");
    } finally {
      btn.disabled = false;
    }
  }

  /* ---------- boot ---------- */
  async function boot() {
    if (!cart) return;
    fillStates($("s-state"));
    fillStates($("b-state"));
    $("ship-form").addEventListener("submit", submitShip);
    $("ship-edit").addEventListener("click", editShip);
    $("bill-same").addEventListener("change", function () { show($("bill-fields"), !this.checked); });
    catalog = await cart.catalog();
    if (!catalog) {
      show($("co-grid"), true);
      setErr($("ship-err"), "We couldn't load product prices. Please refresh the page.");
      return;
    }
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(SHIP_KEY) || "null"); } catch (e) {}
    if (saved) FIELDS.forEach(function (f) { if (saved[f]) $("s-" + f).value = saved[f]; });
    refreshState();
    cart.onChange(refreshState);
    // Returning from a PayPal full-page redirect: re-quote with the saved address so the session can resume.
    var q = new URLSearchParams(location.search);
    if (saved && q.get("paypal") === "return" && cart.items().length) submitShip();
    if (q.get("paypal") === "cancel") setErr($("ship-err"), "");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
