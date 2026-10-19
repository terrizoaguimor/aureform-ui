import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const legacyDirectory = resolve(root, "public/assets/legacy/art");
const video = resolve(root, "public/assets/aureform-motion.webm");
const flags = new Set(process.argv.slice(2));
const supportedFlags = new Set(["--legacy", "--video", "--help", "-h"]);
const unknownFlags = [...flags].filter((flag) => !supportedFlags.has(flag));
const usage =
  "Usage: node scripts/generate-demo-assets.mjs [--legacy] [--video]\n" +
  "Default: preserve the generated image collection without writing assets.\n" +
  "--legacy: create old vector samples only in public/assets/legacy/art; preserve existing files.\n" +
  "--video: create only aureform-motion.webm and aureform-motion.vtt.";

const compositions = [
  ["quiet-forms", "#E8EDE1", "#315D48", "#B6C3A6", 0],
  ["studio", "#EBE8DD", "#526754", "#C7BAA3", 1],
  ["arc", "#EDE6DC", "#754F40", "#BE947B", 2],
  ["morrow", "#E7EADE", "#596741", "#AAB99A", 3],
  ["silhouette", "#E8E6E0", "#404A48", "#B2BEBA", 4],
  ["goodform", "#ECE7E3", "#685B6F", "#BEB0C3", 5],
];

async function createLegacyVectors() {
  await mkdir(legacyDirectory, { recursive: true });
  let created = 0;
  let preserved = 0;
  for (const [name, background, ink, accent, index] of compositions) {
    const shapes =
      index % 3 === 0
        ? `<path d="M170 520V260a140 140 0 0 1 280 0v260Z" fill="${ink}"/><circle cx="535" cy="326" r="120" fill="${accent}"/><rect x="480" y="390" width="140" height="130" rx="6" fill="${ink}" opacity=".45"/>`
        : index % 3 === 1
          ? `<rect x="186" y="230" width="310" height="290" rx="12" fill="${accent}" transform="rotate(-12 340 370)"/><path d="M340 490V170a120 120 0 0 1 240 0v320Z" fill="${ink}"/><circle cx="240" cy="190" r="55" fill="${ink}" opacity=".5"/>`
          : `<circle cx="330" cy="310" r="188" fill="${accent}"/><path d="M170 500 400 120l230 380Z" fill="${ink}"/><circle cx="400" cy="348" r="82" fill="${background}"/><path d="M170 520h460" stroke="${ink}" stroke-width="2"/>`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><title>Legacy Aureform geometric composition — ${name}</title><rect width="800" height="600" fill="${background}"/><path d="M0 520h800" stroke="${ink}" opacity=".08"/><ellipse cx="400" cy="520" rx="255" ry="22" fill="${ink}" opacity=".07"/>${shapes}<path d="M54 550h36M54 558h20" stroke="${ink}" stroke-width="2" opacity=".45"/></svg>`;
    try {
      await writeFile(resolve(legacyDirectory, `${name}.svg`), svg, {
        flag: "wx",
      });
      created++;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
      preserved++;
    }
  }
  console.log(
    `Legacy samples: ${created} created, ${preserved} preserved in public/assets/legacy/art. Generated images were not changed.`,
  );
}

async function createVideo() {
  await mkdir(dirname(video), { recursive: true });
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-f",
      "lavfi",
      "-i",
      "color=c=0xE8EDE1:s=960x540:r=24:d=8",
      "-vf",
      `drawbox=x=220:y=140:w=200:h=310:color=0x315D48:t=fill,drawbox=x=470:y=220:w=190:h=230:color=0xB6C3A6:t=fill,drawtext=fontfile=${resolve(root, "src/assets/fonts/Manrope.ttf")}:text=Aureform:x=54:y=58:fontsize=20:fontcolor=0x315D48,zoompan=z='min(zoom+0.0007,1.12)':d=1:s=960x540:fps=24,fade=t=in:st=0:d=1,fade=t=out:st=7:d=1`,
      "-c:v",
      "libvpx-vp9",
      "-pix_fmt",
      "yuv420p",
      "-b:v",
      "0",
      "-crf",
      "34",
      "-deadline",
      "good",
      "-cpu-used",
      "4",
      "-an",
      video,
    ],
    { stdio: "inherit" },
  );
  await writeFile(
    resolve(root, "public/assets/aureform-motion.vtt"),
    "WEBVTT\n\n00:00.000 --> 00:08.000\nOriginal geometric forms, slowly coming into focus.\nFormas geométricas originales, entrando lentamente en foco.\n",
  );
  console.log(
    "Created the eight-second motion video and captions. Generated images were not changed.",
  );
}

if (unknownFlags.length) {
  console.error(`Unknown flags: ${unknownFlags.join(", ")}\n${usage}`);
  process.exitCode = 1;
} else if (flags.has("--help") || flags.has("-h")) {
  console.log(usage);
} else {
  if (flags.has("--legacy")) await createLegacyVectors();
  if (flags.has("--video")) await createVideo();
  if (!flags.has("--legacy") && !flags.has("--video")) {
    console.log(
      "Preserved the generated image collection; no assets were written. See docs/generated-images/catalog.json and use --help for optional legacy/video commands.",
    );
  }
}
