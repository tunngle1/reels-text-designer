import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const OUT_DIR = path.resolve('public', 'fonts');
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest.json');

/**
 * Extract Google Drive file id from common share links.
 */
function extractDriveId(url) {
  // https://drive.google.com/file/d/<id>/view?...
  let m = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m) return m[1];
  // https://drive.google.com/open?id=<id>
  m = url.match(/[?&]id=([^&]+)/i);
  if (m) return m[1];
  // https://drive.google.com/uc?export=download&id=<id>
  m = url.match(/drive\.google\.com\/uc\?[^#]*\bid=([^&]+)/i);
  if (m) return m[1];
  return null;
}

function listExtractedFontFiles(dirAbs) {
  const allowed = new Set(['.ttf', '.otf', '.woff', '.woff2']);
  const out = [];
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      if (ent.isDirectory()) walk(p);
      else {
        const ext = path.extname(ent.name).toLowerCase();
        if (allowed.has(ext)) out.push(p);
      }
    }
  };
  walk(dirAbs);
  return out;
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  // Clean destination for idempotency
  fs.rmSync(destDir, { recursive: true, force: true });
  fs.mkdirSync(destDir, { recursive: true });

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
}

function driveDirectDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

function safeSlug(s) {
  return String(s)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_.а-яё]/gi, '')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80) || 'font';
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; reels-text-designer/1.0)',
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseTproduct(html) {
  // Title
  const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  const title = titleMatch ? titleMatch[1].trim() : null;

  // Download link: look for anchor with text СКАЧАТЬ
  let downloadUrl = null;
  const downloadMatch = html.match(/<a[^>]+href="([^"]+)"[^>]*>\s*СКАЧАТЬ\s*<\/a>/i);
  if (downloadMatch) downloadUrl = downloadMatch[1];

  // Author and license
  const authorMatch = html.match(/АВТОР:\s*([^<\n\r]+)/i);
  const licenseMatch = html.match(/ЛИЦЕНЗИЯ:\s*([^<\n\r]+)/i);

  return {
    title,
    downloadUrl,
    author: authorMatch ? authorMatch[1].trim() : null,
    license: licenseMatch ? licenseMatch[1].trim() : null,
  };
}

async function downloadToFile(url, targetPath) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'Mozilla/5.0 (compatible; reels-text-designer/1.0)',
    },
  });
  if (!res.ok) throw new Error(`Download failed: HTTP ${res.status} ${res.statusText}`);

  await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });

  const fileStream = fs.createWriteStream(targetPath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on('error', reject);
    fileStream.on('finish', resolve);
    fileStream.on('error', reject);
  });
}

function readManifest() {
  try {
    const raw = fs.readFileSync(MANIFEST_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { generatedAt: new Date().toISOString(), items: [] };
  }
}

function writeManifest(manifest) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

async function main() {
  const urls = process.argv.slice(2);
  if (urls.length === 0) {
    console.log('Usage: npm run myskotom:download -- <tproduct-url> [more urls...]');
    console.log('Example: npm run myskotom:download -- https://myskotom.ru/tproduct/504619321-521303932722-beryozka');
    process.exit(1);
  }

  const manifest = readManifest();

  for (const url of urls) {
    console.log(`\n[+] Fetch: ${url}`);
    const html = await fetchHtml(url);
    const meta = parseTproduct(html);

    if (!meta.title) {
      console.warn('  ! Could not parse title');
    }
    if (!meta.downloadUrl) {
      console.warn('  ! Could not find download url (СКАЧАТЬ)');
      continue;
    }

    const driveId = extractDriveId(meta.downloadUrl);
    if (!driveId) {
      console.warn(`  ! Download url is not recognized Google Drive link: ${meta.downloadUrl}`);
      continue;
    }

    const dl = driveDirectDownloadUrl(driveId);
    const slug = safeSlug(meta.title || driveId);
    const target = path.join(OUT_DIR, `${slug}.zip`);
    const extractDir = path.join(OUT_DIR, slug);

    console.log(`  title: ${meta.title ?? '(unknown)'}`);
    console.log(`  author: ${meta.author ?? '(unknown)'}`);
    console.log(`  license: ${meta.license ?? '(unknown)'}`);
    console.log(`  driveId: ${driveId}`);
    console.log(`  -> ${target}`);

    await downloadToFile(dl, target);

    extractZip(target, extractDir);

    const extractedFilesAbs = listExtractedFontFiles(extractDir);
    const extractedFilesRel = extractedFilesAbs
      .map((abs) => path.relative(path.resolve('public'), abs))
      .map((p) => p.split(path.sep).join('/'));

    if (extractedFilesRel.length === 0) {
      console.warn('  ! No .ttf/.otf/.woff/.woff2 found inside zip');
    } else {
      console.log(`  extracted font files: ${extractedFilesRel.length}`);
    }

    const existingIdx = manifest.items.findIndex((it) => it.sourceUrl === url);
    const entry = {
      title: meta.title,
      slug,
      author: meta.author,
      license: meta.license,
      sourceUrl: url,
      downloadUrl: meta.downloadUrl,
      driveId,
      archive: `fonts/${slug}.zip`,
      files: extractedFilesRel,
    };

    if (existingIdx >= 0) manifest.items[existingIdx] = entry;
    else manifest.items.push(entry);

    manifest.generatedAt = new Date().toISOString();
    writeManifest(manifest);

    console.log('  ✓ downloaded');
  }

  console.log(`\nDone. Manifest: ${MANIFEST_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
