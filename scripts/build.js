#!/usr/bin/env node
// Builds the store packages: dist/domtack-chrome-<version>.zip and dist/domtack-firefox-<version>.zip.
// Each gets a manifest trimmed to what that browser understands; the development `key` goes from both.
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'extension');
const DIST = path.join(ROOT, 'dist');
if (!zlib.crc32) throw new Error('building needs Node 22.2 or later (zlib.crc32)');

const manifest = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
const { version } = require('../package.json');
if (manifest.version !== version) throw new Error(`extension ${manifest.version} and npm package ${version} versions differ`);

const variants = {
  chrome: manifestCopy => {
    delete manifestCopy.browser_specific_settings;
    manifestCopy.background = { service_worker: manifestCopy.background.service_worker };
    return manifestCopy;
  },
  firefox: manifestCopy => {
    manifestCopy.permissions = manifestCopy.permissions.filter(permission => permission !== 'favicon'); // Chrome-only
    manifestCopy.background = { scripts: manifestCopy.background.scripts };
    return manifestCopy;
  },
};

const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]);

// Minimal ZIP writer (deflate, no directory entries): enough for browser stores, without dependencies.
function zip(entries) {
  const local = [], central = [];
  let offset = 0;
  for (const [name, data] of entries) {
    const deflated = zlib.deflateRawSync(data, { level: 9 });
    const nameBuf = Buffer.from(name);
    const fields = (h, at) => {
      h.writeUInt16LE(20, at); // version needed
      h.writeUInt16LE(0x0800, at + 2); // UTF-8 names
      h.writeUInt16LE(8, at + 4); // deflate
      h.writeUInt32LE(0x00210000, at + 6); // fixed 1980-01-01 timestamp, for reproducible builds
      h.writeUInt32LE(zlib.crc32(data), at + 10);
      h.writeUInt32LE(deflated.length, at + 14);
      h.writeUInt32LE(data.length, at + 18);
      h.writeUInt16LE(nameBuf.length, at + 22);
    };
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    fields(lh, 4);
    local.push(lh, nameBuf, deflated);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0);
    ch.writeUInt16LE(20, 4); // version made by
    fields(ch, 6);
    ch.writeUInt32LE(offset, 42);
    central.push(ch, nameBuf);
    offset += lh.length + nameBuf.length + deflated.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}

fs.mkdirSync(DIST, { recursive: true });
const sources = files(SRC).filter(f => path.basename(f) !== 'manifest.json').sort();
for (const [browser, trim] of Object.entries(variants)) {
  const manifestCopy = trim(structuredClone(manifest));
  delete manifestCopy.key;
  const entries = [['manifest.json', Buffer.from(JSON.stringify(manifestCopy, null, 2) + '\n')],
    ...sources.map(file => [path.relative(SRC, file).split(path.sep).join('/'), fs.readFileSync(file)])];
  const out = path.join(DIST, `domtack-${browser}-${version}.zip`);
  fs.writeFileSync(out, zip(entries));
  console.log(`${path.relative(ROOT, out)}  ${entries.length} files`);
}
