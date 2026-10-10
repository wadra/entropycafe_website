// Rebuilds index.html, videos.html and about.html (and their pictures) from the studio's published videos and branding.
//   node build.mjs [path to the studio folder]      (default: D:/Earner)
// Needs ffmpeg on PATH (used to shrink thumbnails and branding pictures).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(process.argv[2] ?? "D:/Earner");
const CHANNEL = path.join(STUDIO, "channels", "entropy-cafe");
const VIDEOS = path.join(CHANNEL, "videos"), BRAND = path.join(CHANNEL, "branding");
const YT = "https://www.youtube.com/@entropycafe", IG = "https://www.instagram.com/entropy.cafe.science/", TT = "https://www.tiktok.com/@entropycafe";
const BOOK = "https://www.amazon.com/dp/B0HLD6KB7K";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function shrink(src, dest, width, crop = "") {
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `${crop}scale=${width}:-2:flags=lanczos`, "-q:v", "4", dest]);
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${src}: ${r.stderr}`);
}

// ── Data: published videos, newest first
const db = JSON.parse(fs.readFileSync(path.join(STUDIO, "scheduler", "data", "entropy-cafe", "db.json"), "utf8"));
const published = db.videos
  .filter((v) => v.youtubeId && v.status === "published" && fs.existsSync(path.join(VIDEOS, v.folder, "output", "thumbnail.png")))
  .sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)));
const isLong = (v) => /long/i.test(v.format ?? "");
const longs = published.filter(isLong);

// ── Pictures
for (const d of ["thumbs", "img"]) fs.mkdirSync(path.join(SITE, d), { recursive: true });
for (const v of published) shrink(path.join(VIDEOS, v.folder, "output", "thumbnail.png"), path.join(SITE, "thumbs", `${v.youtubeId}.jpg`), 640);
shrink(path.join(STUDIO, "books", "01-growing-up-with-ai", "pages", "cover-front.jpg"), path.join(SITE, "img", "book-growing-up-with-ai.jpg"), 640);
shrink(path.join(BRAND, "entropy-cafe-banner.png"), path.join(SITE, "img", "banner.jpg"), 1400, "crop=1760:860:480:290,"); // the banner's centre, where the artwork is
shrink(path.join(BRAND, "whatsapp", "business-card-1080.png"), path.join(SITE, "img", "card.jpg"), 720);
shrink(path.join(BRAND, "entropy-cafe-logo.png"), path.join(SITE, "logo.png"), 320);

// ── Topics (the studio's themes), each with a colour and a small line icon
const TOPICS = {
  "Physics": { color: "#0ea5e9", icon: `<ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/>` },
  "Space & astronomy": { color: "#7c5ce0", icon: `<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="11" ry="3.4" transform="rotate(-20 12 12)"/>` },
  "Human body & biology": { color: "#e4572e", icon: `<path d="M12 20s-7-4.4-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6c0 5-7 9.4-7 9.4z"/>` },
  "Engineering & inventions": { color: "#d98a0b", icon: `<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>` },
  "Earth & weather": { color: "#0f9d8a", icon: `<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>` },
  "AI & computers": { color: "#4f46e5", icon: `<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>` },
  "Math": { color: "#be185d", icon: `<path d="M5 7h6M8 4v6M14 8h6M5 16l5 5M10 16l-5 5M14 16h6M14 20h6"/>` },
};
const topicOf = (v) => (TOPICS[v.theme] ? v.theme : null);
const svgIcon = (t, size = 24) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TOPICS[t].icon}</svg>`;
const counts = Object.keys(TOPICS).map((t) => ({ t, n: published.filter((v) => v.theme === t).length, sample: published.find((v) => v.theme === t)?.title }))
  .filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
const maxCount = Math.max(...counts.map((c) => c.n));

// ── Shared pieces
const mark = fs.readFileSync(path.join(BRAND, "mark.svgpart"), "utf8");
const logo = (cls = "") => `<span class="logo ${cls}" aria-hidden="true"><svg viewBox="-300 -330 600 580">${mark}</svg></span>`;
const page = ({ file, title, desc, body, cls = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="https://wadra.github.io/entropycafe_website/img/banner.jpg">
<link rel="icon" href="logo.png">
<link rel="stylesheet" href="style.css">
</head>
<body class="site ${cls}">
<a class="skip" href="#main">Skip to content</a>
<nav class="top">
  <div class="wrap">
    <a class="brand" href="./">${logo()}<span>Entropy Café</span></a>
    <div class="top-links">
      ${[["videos.html", "Videos"], ["./#books", "Books"], ["about.html", "About"]].map(([h, l]) => `<a href="${h}"${h === file ? ' aria-current="page"' : ""}>${l}</a>`).join("")}
      <a class="btn primary small" href="${YT}?sub_confirmation=1">Subscribe</a>
    </div>
  </div>
</nav>
<main id="main">${body}</main>
<footer class="foot">
  <div class="wrap foot-grid">
    <div><a class="brand" href="./">${logo()}<span>Entropy Café</span></a><p>Your daily cup of curiosity.</p></div>
    <div><h2>Watch</h2><a href="${YT}">YouTube</a><a href="${IG}">Instagram</a><a href="${TT}">TikTok</a></div>
    <div><h2>Explore</h2><a href="videos.html">All videos</a><a href="./#books">Books</a><a href="about.html">About</a></div>
    <div><h2>Legal</h2><a href="terms.html">Terms of Service</a><a href="privacy.html">Privacy Policy</a></div>
  </div>
  <p class="wrap copy">© 2026 Entropy Café</p>
</footer>
<script src="script.js" defer></script>
</body>
</html>
`;
const card = (v) => `
      <li data-format="${isLong(v) ? "long" : "short"}" data-topic="${esc(topicOf(v) ?? "")}"><a class="card" href="https://www.youtube.com/watch?v=${esc(v.youtubeId)}">
        <span class="thumb"><img src="thumbs/${esc(v.youtubeId)}.jpg" alt="" width="640" height="360" loading="lazy"><span class="play" aria-hidden="true"></span></span>
        <span class="card-body"><span class="card-meta">${isLong(v) ? "Deep dive" : "Short"}${topicOf(v) ? ` · ${esc(topicOf(v))}` : ""}</span>
        <span class="card-title">${esc(v.title)}</span></span>
      </a></li>`;

// ── Entropy infographic: dots that start in the cup and spread through the room
function entropyDots() {
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  let out = "";
  for (let i = 0; i < 36; i++) {
    const x0 = 88 + (i % 6) * 13, y0 = 118 + Math.floor(i / 6) * 13;
    const x1 = 30 + rnd() * 540, y1 = 26 + rnd() * 208;
    out += `<circle cx="${x0}" cy="${y0}" r="5" style="--dx:${(x1 - x0).toFixed(0)}px;--dy:${(y1 - y0).toFixed(0)}px;--d:${(rnd() * 0.5).toFixed(2)}s"/>`;
  }
  return out;
}

// ── Home
const feature = longs[0] ?? published[0];
const home = `
<header class="hero">
  <div class="wrap hero-grid">
    <div class="reveal">
      <p class="eyebrow">Science, explained in motion</p>
      <h1>Your daily cup of <em>curiosity</em>.</h1>
      <p class="lede">One real question about the universe, answered with clear animation. No jargon, just the “aha!” moment.</p>
      <p class="cta">
        <a class="btn primary" href="${YT}">Watch on YouTube</a>
        <a class="btn" href="videos.html">Browse the videos</a>
      </p>
      <p class="social">Also on <a href="${IG}">Instagram</a> and <a href="${TT}">TikTok</a></p>
    </div>
    <div class="hero-art reveal">
      <span class="eq e1" aria-hidden="true">S = k ln W</span><span class="eq e2" aria-hidden="true">E = mc²</span><span class="eq e3" aria-hidden="true">F = ma</span>
      <a class="feature" href="https://www.youtube.com/watch?v=${esc(feature.youtubeId)}">
        <span class="thumb"><img src="thumbs/${esc(feature.youtubeId)}.jpg" alt="" width="640" height="360"><span class="play" aria-hidden="true"></span></span>
        <span class="feature-text"><span class="card-meta">Latest deep dive</span><span class="card-title">${esc(feature.title)}</span></span>
      </a>
    </div>
  </div>
</header>

<section class="stats" aria-label="The channel in numbers">
  <div class="wrap stats-grid">
    <div class="stat reveal"><b data-count="${published.length}">${published.length}</b><span>questions answered</span></div>
    <div class="stat reveal"><b data-count="${longs.length}">${longs.length}</b><span>deep dives</span></div>
    <div class="stat reveal"><b data-count="${counts.length}">${counts.length}</b><span>fields of science</span></div>
    <div class="stat reveal"><b>&lt; 60 s</b><span>for every Short</span></div>
  </div>
</section>

<section class="wrap split" id="entropy">
  <div class="reveal">
    <p class="eyebrow">Why “Entropy”?</p>
    <h2>Because everything spreads out.</h2>
    <p>The smell of fresh coffee never stays in the cup. It drifts across the room and never gathers itself back. Physicists call that tendency <strong>entropy</strong>: there are vastly more ways for things to be spread out than to be neatly gathered, so spread out is what you get.</p>
    <p>Curiosity works the same way. One good question never stays put, so every day we pour a new one.</p>
  </div>
  <figure class="entropy reveal" id="entropyFig">
    <svg viewBox="0 0 600 260" role="img" aria-label="Dots that start gathered in a cup and spread out to fill the room">
      <rect x="1" y="1" width="598" height="258" rx="18" class="room"/>
      <path d="M70 108h104l-8 86q-3 14-18 14H96q-15 0-18-14z" class="cup"/><path d="M174 122q30 0 28 26t-34 24" class="cup"/>
      <g class="dots">${entropyDots()}</g>
    </svg>
    <figcaption><span class="state">Low entropy: gathered in the cup, few arrangements</span><button type="button" class="btn small" id="stir">Let it spread</button></figcaption>
  </figure>
</section>

<section class="band-light">
  <div class="wrap split">
    <div class="reveal">
      <p class="eyebrow">What we explore</p>
      <h2>Questions from every corner of science.</h2>
      <p>The chart shows how many published videos each field has so far. Point at a bar to see a question from that field.</p>
      <p><a class="btn" href="videos.html">See all ${published.length} videos</a></p>
    </div>
    <ul class="bars reveal" aria-label="Published videos per field">${counts.map((c) => `
      <li style="--c:${TOPICS[c.t].color};--w:${Math.round((c.n / maxCount) * 100)}%" tabindex="0">
        <span class="bar-icon">${svgIcon(c.t)}</span>
        <span class="bar-main"><span class="bar-name">${esc(c.t)}<b>${c.n}</b></span><span class="bar-track"><span class="bar-fill"></span></span>
        <span class="bar-sample">“${esc(c.sample)}”</span></span>
      </li>`).join("")}
    </ul>
  </div>
</section>

<section class="wrap" id="how">
  <div class="center reveal">
    <p class="eyebrow">How a video is brewed</p>
    <h2>From a question to an answer you can trust.</h2>
  </div>
  <ol class="steps">
    <li class="reveal"><span class="step-n">1</span><h3>Start with a real question</h3><p>The kind you already wonder about: why a mirror swaps left and right, or what really lifts a plane.</p></li>
    <li class="reveal"><span class="step-n">2</span><h3>Go to the source</h3><p>Research leans on primary and authoritative sources such as NASA, NIST, NOAA, CERN and peer-reviewed papers.</p></li>
    <li class="reveal"><span class="step-n">3</span><h3>Check every number</h3><p>Each figure is recomputed and logged in a fact-check table before the script is final. Estimates are called estimates.</p></li>
    <li class="reveal"><span class="step-n">4</span><h3>Explain it in motion</h3><p>Clear animation and a calm voice carry you from the everyday puzzle to the “aha!” moment.</p></li>
  </ol>
</section>

<section class="band-dark">
  <div class="wrap split">
    <img class="reveal banner" src="img/banner.jpg" alt="Entropy Café banner: a steaming cup circled by two orbit rings" width="1400" height="684" loading="lazy">
    <div class="reveal">
      <p class="eyebrow">New every week</p>
      <h2>Shorts all week. Deep dives on Sundays.</h2>
      <p>Subscribe once and a fresh question arrives most days, with a longer explainer to settle into at the weekend.</p>
      <p class="cta"><a class="btn primary" href="${YT}?sub_confirmation=1">Subscribe on YouTube</a><a class="btn ghost" href="${IG}">Follow on Instagram</a></p>
    </div>
  </div>
</section>

<section class="wrap" id="books">
  <div class="center reveal"><p class="eyebrow">Books</p><h2>From the café to the bookshelf.</h2></div>
  <div class="book reveal">
    <a class="book-cover" href="${BOOK}"><img src="img/book-growing-up-with-ai.jpg" alt="Cover of Growing Up with AI" width="640" height="640" loading="lazy"></a>
    <div>
      <p class="card-meta">Entropy Café Kids · Book 1 · Ages 5 to 8</p>
      <h3>Growing Up with AI</h3>
      <p>A warm, honest picture book that gives children a friendly first look at what AI is, and how to use it smart, safe and kind. Zara, Sami and Bit the helper robot find the answer over a cup of cocoa at the Entropy Café.</p>
      <ul class="ticks"><li>How AI learns from examples, and why it can be wrong</li><li>Why some information stays private</li><li>A Parents’ Corner and a mini glossary</li></ul>
      <p><a class="btn primary" href="${BOOK}">See it on Amazon</a></p>
      <p class="soon"><strong>Coming next:</strong> 365 Cups of Curiosity, a year of science questions for grown-ups.</p>
    </div>
  </div>
</section>`;

// ── Videos
const filters = [["all", "All"], ["long", "Deep dives"], ["short", "Shorts"], ...counts.map((c) => [`topic:${c.t}`, c.t])];
const videosPage = `
<header class="page-head"><div class="wrap">
  <p class="eyebrow">Videos</p>
  <h1>Every question so far.</h1>
  <p class="lede">${published.length} videos, newest first. Pick a format or a field, then watch on YouTube.</p>
  <div class="filters" role="group" aria-label="Filter videos">${filters.map(([k, l], i) => `<button type="button" class="chip" data-filter="${esc(k)}" aria-pressed="${i === 0}">${esc(l)}</button>`).join("")}</div>
  <p class="count" id="count" aria-live="polite"></p>
</div></header>
<section class="wrap"><ul class="grid" id="grid">${published.map(card).join("")}
</ul></section>`;

// ── About
const about = `
<header class="page-head"><div class="wrap">
  <p class="eyebrow">About</p>
  <h1>A café for people who can’t stop asking why.</h1>
  <p class="lede">Entropy Café is a science channel built on one habit: take a single real question, and answer it properly.</p>
</div></header>

<section class="wrap split">
  <div class="reveal">
    <h2>The idea</h2>
    <p>Most of us carry around questions we never got a straight answer to. Why doesn’t a moving bicycle fall over? If the Sun vanished, how long until we’d notice? How do you dig a tunnel under a river without the river pouring in?</p>
    <p>Each Entropy Café video takes one of those questions and works through it step by step, with animation that shows what is going on instead of just describing it. Shorts answer one question in under a minute. Deep dives take a few minutes to follow a bigger idea all the way through.</p>
    <p>The name comes from physics. Entropy is the tendency of things to spread out, like the smell of coffee filling a room. Good questions spread the same way.</p>
  </div>
  <img class="reveal pic" src="img/card.jpg" alt="Entropy Café card with the cup logo and the line: one real science question a day" width="720" height="720" loading="lazy">
</section>

<section class="band-light"><div class="wrap">
  <div class="center reveal"><p class="eyebrow">What we promise</p><h2>Three rules behind every video.</h2></div>
  <div class="trio">
    <div class="tile reveal"><h3>Real sources</h3><p>Research starts with primary and authoritative sources: space agencies, standards bodies, peer-reviewed papers and university pages. Well-known facts are still cross-checked.</p></div>
    <div class="tile reveal"><h3>Honest numbers</h3><p>Every figure is recomputed and recorded in a fact-check table. Numbers are rounded honestly, and a model or an estimate is always called one.</p></div>
    <div class="tile reveal"><h3>No jargon</h3><p>If an idea doesn’t fit comfortably, the idea gets simplified, not the explanation rushed. Anything left out is saved for a deep dive.</p></div>
  </div>
</div></section>

<section class="wrap split">
  <img class="reveal pic" src="img/banner.jpg" alt="Entropy Café banner: science questions, explained in motion" width="1400" height="684" loading="lazy">
  <div class="reveal">
    <h2>Who makes it</h2>
    <p>Entropy Café is made by a data scientist with 17 years of experience building AI and data systems, who wanted the kind of science channel that respects both the viewer’s time and the facts.</p>
    <p>The videos are produced in a small custom studio. Scripts, animation and narration are made with the help of AI tools, and every video is reviewed by a person before it is published.</p>
    <h2>Questions and corrections</h2>
    <p>Have a question you’d like answered, or spotted something that looks wrong? Leave a comment on any video on <a href="${YT}">YouTube</a>, or send a message on <a href="${IG}">Instagram</a>. Corrections are welcome and taken seriously.</p>
    <p class="cta"><a class="btn primary" href="${YT}">Watch on YouTube</a><a class="btn" href="videos.html">Browse the videos</a></p>
  </div>
</section>`;

const D = "Entropy Café answers one real science question a day with clear animation. Physics, space, biology, engineering and more.";
fs.writeFileSync(path.join(SITE, "index.html"), page({ file: "./", title: "Entropy Café · Your daily cup of curiosity", desc: D, body: home, cls: "home" }));
fs.writeFileSync(path.join(SITE, "videos.html"), page({ file: "videos.html", title: "Videos · Entropy Café", desc: "Every Entropy Café science explainer, newest first.", body: videosPage }));
fs.writeFileSync(path.join(SITE, "about.html"), page({ file: "about.html", title: "About · Entropy Café", desc: "What Entropy Café is, how its videos are researched and checked, and who makes it.", body: about }));
console.log(`Built 3 pages: ${published.length} videos (${longs.length} deep dives), ${counts.length} fields.`);
