// Rebuilds index.html and the thumbnails from the studio's list of published videos.
//   node build.mjs [path to the studio folder]      (default: D:/Earner)
// Needs ffmpeg on PATH (used to shrink the thumbnails and the book cover).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SITE = path.dirname(fileURLToPath(import.meta.url));
const STUDIO = path.resolve(process.argv[2] ?? "D:/Earner");
const VIDEOS = path.join(STUDIO, "channels", "entropy-cafe", "videos");
const SHORTS_SHOWN = 12;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function shrink(src, dest, width) {
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return;
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `scale=${width}:-2:flags=lanczos`, "-q:v", "4", dest]);
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${src}: ${r.stderr}`);
}

const db = JSON.parse(fs.readFileSync(path.join(STUDIO, "scheduler", "data", "entropy-cafe", "db.json"), "utf8"));
const published = db.videos
  .filter((v) => v.youtubeId && v.status === "published" && fs.existsSync(path.join(VIDEOS, v.folder, "output", "thumbnail.png")))
  .sort((a, b) => String(b.publishAt).localeCompare(String(a.publishAt)));
fs.mkdirSync(path.join(SITE, "thumbs"), { recursive: true });
for (const v of published) shrink(path.join(VIDEOS, v.folder, "output", "thumbnail.png"), path.join(SITE, "thumbs", `${v.youtubeId}.jpg`), 640);
shrink(path.join(STUDIO, "books", "01-growing-up-with-ai", "pages", "cover-front.jpg"), path.join(SITE, "book-growing-up-with-ai.jpg"), 640);

const card = (v) => `
      <li><a class="card" href="https://www.youtube.com/watch?v=${esc(v.youtubeId)}">
        <img src="thumbs/${esc(v.youtubeId)}.jpg" alt="" width="640" height="360" loading="lazy">
        <span class="card-title">${esc(v.title)}</span>
      </a></li>`;
const longs = published.filter((v) => /long/i.test(v.format ?? ""));
const shorts = published.filter((v) => !/long/i.test(v.format ?? "")).slice(0, SHORTS_SHOWN);

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Entropy Café · Your daily cup of curiosity</title>
<meta name="description" content="Entropy Café answers one real science question a day with clear animation. Physics, math, biology, engineering and space.">
<meta property="og:title" content="Entropy Café">
<meta property="og:description" content="One real science question a day, answered with clear animation.">
<meta property="og:image" content="https://wadra.github.io/entropycafe_website/logo.png">
<link rel="icon" href="logo.png">
<link rel="stylesheet" href="style.css">
</head>
<body class="home">
<nav class="top">
  <a class="brand" href="./"><img src="logo.png" alt="" width="36" height="36">Entropy Café</a>
  <div class="top-links"><a href="#videos">Videos</a><a href="#books">Books</a><a href="#about">About</a></div>
</nav>

<header class="hero">
  <div class="orbit" aria-hidden="true"><img src="logo.png" alt="" width="200" height="200"></div>
  <h1>Your daily cup of <em>curiosity</em>.</h1>
  <p class="lede">One real question about the universe, answered with clear animation. No jargon, just the “aha!” moment.</p>
  <p class="cta">
    <a class="btn primary" href="https://www.youtube.com/@entropycafe">Watch on YouTube</a>
    <a class="btn" href="https://www.instagram.com/entropy.cafe.science/">Instagram</a>
    <a class="btn" href="https://www.tiktok.com/@entropycafe">TikTok</a>
  </p>
  <ul class="chips" aria-label="Topics">
    <li>Physics</li><li>Math</li><li>Biology</li><li>AI &amp; Engineering</li><li>Space</li>
  </ul>
</header>

<main>
  <section id="videos">
    <h2>Deep dives</h2>
    <p class="section-note">A longer explainer every week.</p>
    <ul class="grid wide">${longs.map(card).join("")}
    </ul>

    <h2>Latest Shorts</h2>
    <p class="section-note">A new question most days, answered in under a minute.</p>
    <ul class="grid">${shorts.map(card).join("")}
    </ul>
    <p class="more"><a class="btn" href="https://www.youtube.com/@entropycafe/videos">See every video on YouTube</a></p>
  </section>

  <section id="books">
    <h2>Books</h2>
    <div class="book">
      <a href="https://www.amazon.com/dp/B0HLD6KB7K"><img src="book-growing-up-with-ai.jpg" alt="Cover of Growing Up with AI" width="640" height="640" loading="lazy"></a>
      <div>
        <p class="eyebrow">Entropy Café Kids · Book 1 · Ages 5 to 8</p>
        <h3>Growing Up with AI</h3>
        <p>A warm, honest picture book that gives children a friendly first look at what AI is, and how to use it smart, safe and kind. Zara, Sami and Bit the helper robot find the answer over a cup of cocoa at the Entropy Café.</p>
        <p><a class="btn primary" href="https://www.amazon.com/dp/B0HLD6KB7K">See it on Amazon</a></p>
        <p class="soon"><strong>Coming next:</strong> 365 Cups of Curiosity, a year of science questions for grown-ups.</p>
      </div>
    </div>
  </section>

  <section id="about">
    <h2>About</h2>
    <p>Entropy Café started with a simple idea: the best science questions are the ones you already wonder about. Why does a mirror swap left and right but not up and down? What really lifts a plane? Why can't you breathe through a long snorkel?</p>
    <p>Each video takes one question and works through it with animation, from the everyday puzzle to the real answer. New Shorts arrive most days and a deeper dive every week. Pull up a chair. The universe is brewing.</p>
  </section>
</main>

<footer>
  <p class="follow"><a href="https://www.youtube.com/@entropycafe">YouTube</a><a href="https://www.instagram.com/entropy.cafe.science/">Instagram</a><a href="https://www.tiktok.com/@entropycafe">TikTok</a></p>
  <p>© 2026 Entropy Café · <a href="terms.html">Terms</a> · <a href="privacy.html">Privacy</a></p>
</footer>
</body>
</html>
`;
fs.writeFileSync(path.join(SITE, "index.html"), html);
console.log(`index.html written: ${longs.length} deep dives, ${shorts.length} Shorts shown (${published.length} published).`);
