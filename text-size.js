// A− / A+ on the post page. Scales the post body; remembered on this device.
(function () {
  const steps = [0.85, 1, 1.15, 1.3, 1.5];
  const body = document.querySelector('.post-body');
  const down = document.querySelector('.ts-down');
  const up = document.querySelector('.ts-up');
  if (!body || !down || !up) return;

  let i = 1;
  try {
    const saved = parseInt(localStorage.getItem('postScale'), 10);
    if (saved >= 0 && saved < steps.length) i = saved;
  } catch (e) {}

  function apply() {
    body.style.setProperty('--post-scale', steps[i]);
    down.disabled = i === 0;
    up.disabled = i === steps.length - 1;
    try { localStorage.setItem('postScale', i); } catch (e) {}
  }

  down.addEventListener('click', () => { if (i > 0) { i--; apply(); } });
  up.addEventListener('click', () => { if (i < steps.length - 1) { i++; apply(); } });
  apply();
})();
