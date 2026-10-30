/* SNH phone fields (Round 12). Every phone the theme writes (register, edit profile, address forms) is saved as E.164
   +94XXXXXXXXX with the address country set to Sri Lanka, so checkout no longer reads "0704209195" as a US number
   ("+1 0704209195"). Markup: <input type="tel" data-tel94 …> (add data-sl-mobile to accept mobiles only).
   - shows a fixed "+94" prefix; the field holds the 9-digit local part ("77 123 4567"), whatever was pasted
     (077…, 94…, +94…, and the bad "+1 0…" values already saved) is cleaned on load and on blur
   - on submit (capture phase, before the form posts) the value becomes +94XXXXXXXXX and the form's
     address[country] is set to Sri Lanka; an invalid number blocks the submit with a message */
(function () {
  if (window.SNHTel) return;
  function local(v) {
    var d = String(v || '').replace(/\D/g, '');
    if (d.length === 11 && d.indexOf('94') === 0) d = d.slice(2);
    else if (d.length === 11 && d.indexOf('10') === 0) d = d.slice(2);           // "+1 0704209195" saved by checkout
    else if (d.length === 10 && d.charAt(0) === '0') d = d.slice(1);
    return d;
  }
  function pretty(d) { return d.length === 9 ? d.slice(0, 2) + ' ' + d.slice(2, 5) + ' ' + d.slice(5) : d; }
  function e164(v, mobile) { var d = local(v); return /^[1-9]\d{8}$/.test(d) && (!mobile || d.charAt(0) === '7') ? '+94' + d : null; }
  function bind(inp) {
    if (inp.__tel94) return;
    inp.__tel94 = true;
    var mobile = inp.hasAttribute('data-sl-mobile');
    if (!inp.parentNode.classList.contains('tel94')) {
      var w = document.createElement('span'); w.className = 'tel94';
      inp.parentNode.insertBefore(w, inp);
      w.innerHTML = '<span class="tel94__cc" aria-hidden="true">+94</span>';
      w.appendChild(inp);
    }
    inp.placeholder = mobile ? '77 123 4567' : '77 123 4567 or 11 234 5678';
    if (!inp.getAttribute('aria-label')) inp.setAttribute('aria-label', (mobile ? 'Mobile number' : 'Phone number') + ', after +94');
    inp.value = pretty(local(inp.value));
    inp.addEventListener('blur', function () { if (inp.value.trim()) inp.value = pretty(local(inp.value)); });
    inp.addEventListener('input', function () { inp.setCustomValidity(''); });
    var form = inp.form;
    if (form && !form.__tel94) {
      form.__tel94 = true;
      form.addEventListener('submit', function (e) {
        var bad = null;
        [].forEach.call(form.querySelectorAll('[data-tel94]'), function (f) {
          if (!f.value.trim()) return;
          var n = e164(f.value, f.hasAttribute('data-sl-mobile'));
          if (n) { f.value = n; f.setCustomValidity(''); } else { f.setCustomValidity('Enter a Sri Lankan number, like 77 123 4567.'); bad = bad || f; }
        });
        if (bad) { e.preventDefault(); e.stopImmediatePropagation(); bad.reportValidity(); return; }
        var c = form.querySelector('[name="address[country]"]');
        if (c) c.value = 'Sri Lanka';
        else if (form.querySelector('[name^="address["]')) { var h = document.createElement('input'); h.type = 'hidden'; h.name = 'address[country]'; h.value = 'Sri Lanka'; form.appendChild(h); }
      }, true);
    }
  }
  function init(scope) { [].forEach.call((scope || document).querySelectorAll('input[data-tel94]'), bind); }
  window.SNHTel = { e164: e164, local: local, init: init };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(); }); else init();
  document.addEventListener('shopify:section:load', function (e) { init(e.target); });
})();
