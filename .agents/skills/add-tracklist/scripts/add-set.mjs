#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yq(s) {
  return '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function mdCell(s) {
  return String(s).replace(/\|/g, '\\|').trim();
}

function linkLabel(url) {
  return url.replace(/^https?:\/\//, '');
}

function main() {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error('Usage: node add-set.mjs <input.json>');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const title = data.title || 'Untitled set';
  const artist = data.artist || '';
  if (!artist) {
    console.error('Error: input JSON is missing required "artist".');
    process.exit(1);
  }
  const event = data.event || '';
  const date = data.date || '';
  const source = data.source || '';
  const duration = data.duration || '';
  if (!duration) {
    console.error('Error: input JSON is missing required "duration" (H:MM:SS, from the video length).');
    process.exit(1);
  }
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const slug = data.slug || slugify(title) || 'set';

  const hasTime = tracks.some((t) => t.time);

  // ---- Markdown ----
  const headers = ['#', ...(hasTime ? ['Time'] : []), 'Artist', 'Track', 'Bandcamp', 'Beatport'];
  const md = [];
  md.push('# ' + title);
  if (source) md.push('', 'Source: ' + source);
  md.push('', '| ' + headers.join(' | ') + ' |');
  md.push('|' + headers.map(() => '---').join('|') + '|');
  tracks.forEach((t, i) => {
    const cells = [String(i + 1).padStart(2, '0')];
    if (hasTime) cells.push(mdCell(t.time || ''));
    cells.push(mdCell(t.artist || ''), mdCell(t.title || ''));
    cells.push(t.bandcamp ? `[${linkLabel(t.bandcamp)}](${t.bandcamp})` : '');
    cells.push(t.beatport ? `[${linkLabel(t.beatport)}](${t.beatport})` : '');
    md.push('| ' + cells.join(' | ') + ' |');
  });

  // ---- YAML ----
  const yml = [];
  yml.push('title: ' + yq(title));
  yml.push('artist: ' + yq(artist));
  if (event) yml.push('event: ' + yq(event));
  if (date) yml.push('date: ' + yq(date));
  if (source) yml.push('source: ' + yq(source));
  yml.push('duration: ' + yq(duration));
  yml.push('tracks:');
  tracks.forEach((t, i) => {
    yml.push('  - number: ' + (i + 1));
    if (t.time) yml.push('    time: ' + yq(t.time));
    yml.push('    artist: ' + yq(t.artist || ''));
    yml.push('    title: ' + yq(t.title || ''));
    if (t.bandcamp) yml.push('    bandcamp: ' + yq(t.bandcamp));
    if (t.beatport) yml.push('    beatport: ' + yq(t.beatport));
  });

  const mixesDir = process.env.MIXES_DIR || path.join(os.homedir(), 'Documents', 'mixes');
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  fs.mkdirSync(mixesDir, { recursive: true });
  fs.mkdirSync(dataDir, { recursive: true });

  const mdPath = path.join(mixesDir, slug + '.md');
  const yamlPath = path.join(dataDir, slug + '.yaml');
  fs.writeFileSync(mdPath, md.join('\n') + '\n');
  fs.writeFileSync(yamlPath, yml.join('\n') + '\n');

  const withBandcamp = tracks.filter((t) => t.bandcamp).length;
  const withBeatport = tracks.filter((t) => t.beatport).length;
  console.log('Wrote ' + mdPath);
  console.log('Wrote ' + yamlPath);
  console.log(
    `${tracks.length} tracks, ${withBandcamp} with Bandcamp links, ${withBeatport} with Beatport links`
  );
}

main();
