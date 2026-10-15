#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

function norm(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseYamlValue(v) {
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  return v;
}

function loadKnown(dataDir) {
  const map = new Map();
  let files = [];
  try {
    files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.yaml'));
  } catch {
    return map;
  }
  for (const f of files) {
    const lines = fs.readFileSync(path.join(dataDir, f), 'utf8').split('\n');
    let cur = {};
    const flush = () => {
      if (cur.artist && cur.title && (cur.bandcamp || cur.beatport)) {
        const key = `${norm(cur.artist)}|${norm(cur.title)}`;
        const prev = map.get(key) || {};
        map.set(key, {
          bandcamp: prev.bandcamp || cur.bandcamp,
          beatport: prev.beatport || cur.beatport,
        });
      }
    };
    for (const ln of lines) {
      if (/^  - number: /.test(ln)) {
        flush();
        cur = {};
      } else if (/^    (artist|title|bandcamp|beatport): /.test(ln)) {
        const m = ln.match(/^    (\w+): (.*)$/);
        cur[m[1]] = parseYamlValue(m[2]);
      }
    }
    flush();
  }
  return map;
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node resolve-known.mjs <input.json>');
    process.exit(1);
  }
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const known = loadKnown(dataDir);

  let resolvedBandcamp = 0;
  let resolvedBeatport = 0;
  const unresolved = [];
  for (const t of tracks) {
    const entry = known.get(`${norm(t.artist)}|${norm(t.title)}`);
    if (entry) {
      if (!t.bandcamp && entry.bandcamp) {
        t.bandcamp = entry.bandcamp;
        resolvedBandcamp++;
      }
      if (!t.beatport && entry.beatport) {
        t.beatport = entry.beatport;
        resolvedBeatport++;
      }
    }
    const need = [];
    if (!t.bandcamp) need.push('bandcamp');
    if (!t.beatport) need.push('beatport');
    if (need.length) unresolved.push(`${t.artist} — ${t.title} (${need.join(', ')})`);
  }

  fs.writeFileSync(inputPath, JSON.stringify(data, null, 2) + '\n');
  console.log(
    `Resolved ${resolvedBandcamp} bandcamp and ${resolvedBeatport} beatport links from data/ (${known.size} known tracks loaded).`
  );
  if (unresolved.length) {
    console.log('\nStill need research (bandcamp / beatport):');
    unresolved.forEach((u) => console.log('  - ' + u));
  }
}

main();
