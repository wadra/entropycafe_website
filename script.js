// Small enhancements; every page still reads fine without this file.
document.documentElement.classList.add("js");
const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reveal sections as they scroll into view; count the stats up once.
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    e.target.classList.add("in");
    seen.unobserve(e.target);
    const b = e.target.querySelector?.("[data-count]");
    if (b && !still) {
      const end = Number(b.dataset.count), t0 = performance.now();
      const tick = (t) => { const k = Math.min(1, (t - t0) / 900); b.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }
  }
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => seen.observe(el));

// Entropy figure: spread the dots on hover or with the button.
const fig = document.getElementById("entropyFig");
if (fig) {
  const btn = document.getElementById("stir"), state = fig.querySelector(".state");
  const set = (on) => {
    fig.classList.toggle("spread", on);
    state.textContent = on ? "High entropy: spread through the room, countless arrangements" : "Low entropy: gathered in the cup, few arrangements";
    btn.textContent = on ? "Gather it again" : "Let it spread";
  };
  btn.addEventListener("click", () => set(!fig.classList.contains("spread")));
  fig.querySelector("svg").addEventListener("mouseenter", () => set(true));
}

// Videos page: filter by format or field.
const grid = document.getElementById("grid");
if (grid) {
  const chips = [...document.querySelectorAll(".chip")], count = document.getElementById("count");
  const apply = (f) => {
    let n = 0;
    for (const li of grid.children) {
      const show = f === "all" || li.dataset.format === f || f === "topic:" + li.dataset.topic;
      li.hidden = !show; if (show) n++;
    }
    chips.forEach((c) => c.setAttribute("aria-pressed", String(c.dataset.filter === f)));
    count.textContent = `Showing ${n} video${n === 1 ? "" : "s"}`;
  };
  chips.forEach((c) => c.addEventListener("click", () => apply(c.dataset.filter)));
  apply("all");
}
