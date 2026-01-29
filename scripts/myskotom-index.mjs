import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (compatible; reels-text-designer/1.0)';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

async function fetchJson(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      accept: 'application/json,text/plain,*/*',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const text = await res.text();
  // Some Tilda endpoints return JSON without proper content-type
  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Failed to parse JSON');
  }
}

function pickCharacteristic(characteristics, title) {
  if (!Array.isArray(characteristics)) return null;
  const found = characteristics.find((c) => String(c?.title || '').toUpperCase() === title);
  return found ? String(found.value || '').trim() : null;
}

function pickAllCharacteristics(characteristics, title) {
  if (!Array.isArray(characteristics)) return [];
  return characteristics
    .filter((c) => String(c?.title || '').toUpperCase() === title)
    .map((c) => String(c.value || '').trim())
    .filter(Boolean);
}

async function main() {
  const args = process.argv.slice(2);

  // Default: use Tilda store API endpoint discovered in Network.
  let baseApiUrl = 'https://store.tildaapi.com/api/getproductslist/?storepartuid=610736424061&recid=532283879&getparts=true&getoptions=true&sort%5Bcreated%5D=desc';
  let size = 50;
  let delayMs = 150;
  let maxSlices = 500;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--api') {
      const v = args[i + 1];
      i++;
      if (v) baseApiUrl = v;
      continue;
    }
    if (a === '--size') {
      const v = parseInt(args[i + 1] || '', 10);
      i++;
      if (Number.isFinite(v) && v > 0) size = v;
      continue;
    }
    if (a === '--delayMs') {
      const v = parseInt(args[i + 1] || '', 10);
      i++;
      if (Number.isFinite(v) && v >= 0) delayMs = v;
      continue;
    }
    if (a === '--maxSlices') {
      const v = parseInt(args[i + 1] || '', 10);
      i++;
      if (Number.isFinite(v) && v > 0) maxSlices = v;
      continue;
    }
  }

  const items = [];
  const seen = new Set();

  const buildUrl = (slice) => {
    const u = new URL(baseApiUrl);
    u.searchParams.set('slice', String(slice));
    u.searchParams.set('size', String(size));
    // cachebuster
    u.searchParams.set('c', String(Date.now()));
    return u.toString();
  };

  console.log(`API: ${baseApiUrl}`);
  console.log(`size=${size} delayMs=${delayMs} maxSlices=${maxSlices}`);

  for (let slice = 1; slice <= maxSlices; slice++) {
    const url = buildUrl(slice);
    const data = await fetchJson(url);

    const products = data?.products || data?.items || data?.result || [];
    const list = Array.isArray(products) ? products : [];

    if (list.length === 0) {
      console.log(`slice=${slice}: empty, stop`);
      break;
    }

    for (const p of list) {
      const tproductUrl = p?.url ? String(p.url).replace(/\\\//g, '/') : null;
      const title = p?.title ? String(p.title).trim() : null;
      if (!tproductUrl || !title) continue;
      if (seen.has(tproductUrl)) continue;
      seen.add(tproductUrl);

      const characteristics = p?.characteristics;
      const author = pickCharacteristic(characteristics, 'АВТОР');
      const license = pickCharacteristic(characteristics, 'ЛИЦЕНЗИЯ');
      const type = pickAllCharacteristics(characteristics, 'ТИП');
      const mood = pickAllCharacteristics(characteristics, 'ХАРАКТЕР');

      items.push({
        id: `myskotom_${safeSlug(title)}_${p?.uid ?? ''}`,
        name: title,
        family: title,
        source: 'myskotom',
        subsets: ['cyrillic'],
        category: type?.[0] || null,
        tproductUrl,
        author,
        license,
        tags: {
          type,
          mood,
        },
      });
    }

    console.log(`slice=${slice}: got=${list.length} totalIndexed=${items.length}`);
    if (list.length < size) {
      console.log('Last page reached (got < size), stop');
      break;
    }
    if (delayMs > 0) await sleep(delayMs);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    count: items.length,
    items,
  };

  const outPath = path.resolve('public', 'myskotom-index.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(`\nSaved: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
