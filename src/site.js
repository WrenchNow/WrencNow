// WrenchNow marketing pages: mobile menu + earnings calculator. (Old app links are forwarded by an inline script in <head>.)
(function () {
  var nav = document.querySelector('.nav'), btn = document.querySelector('.menu-btn');
  if (nav && btn) btn.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  // mechanics page: hours × rate, after 5% platform fee and ~3% card processing
  var h = document.getElementById('cHours'), r = document.getElementById('cRate'), out = document.getElementById('cOut');
  if (h && r && out) {
    var hv = document.getElementById('cHoursV'), rv = document.getElementById('cRateV');
    var calc = function () {
      var gross = +h.value * +r.value * 4.33;
      out.textContent = '$' + (Math.round(gross * 0.92 / 10) * 10).toLocaleString();
      hv.textContent = h.value; rv.textContent = '$' + r.value;
    };
    h.addEventListener('input', calc); r.addEventListener('input', calc); calc();
  }
})();
