import AdmZip from 'adm-zip';

const UA = 'Mozilla/5.0 (compatible; reels-text-designer/1.0)';

function extractDriveId(url) {
  let m = String(url).match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (m) return m[1];
  m = String(url).match(/[?&]id=([^&]+)/i);
  if (m) return m[1];
  m = String(url).match(/drive\.google\.com\/uc\?[^#]*\bid=([^&]+)/i);
  if (m) return m[1];
  return null;
}

function driveDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return await res.text();
}

function parseTproductDownloadUrl(html) {
  const m = html.match(/<a[^>]+href="([^"]+)"[^>]*>\s*СКАЧАТЬ\s*<\/a>/i);
  return m ? m[1] : null;
}

async function driveFetchWithConfirm(fileId) {
  // 1) First attempt
  const url = driveDownloadUrl(fileId);
  const res1 = await fetch(url, {
    redirect: 'manual',
    headers: {
      'user-agent': UA,
    },
  });

  // Direct file
  const ct1 = res1.headers.get('content-type') || '';
  if (res1.ok && !ct1.includes('text/html')) {
    const buf = Buffer.from(await res1.arrayBuffer());
    return buf;
  }

  // Some cases redirect to a different URL
  if (res1.status >= 300 && res1.status < 400) {
    const loc = res1.headers.get('location');
    if (loc) {
      const resR = await fetch(loc, { headers: { 'user-agent': UA } });
      const ctR = resR.headers.get('content-type') || '';
      if (resR.ok && !ctR.includes('text/html')) {
        const buf = Buffer.from(await resR.arrayBuffer());
        return buf;
      }
    }
  }

  // HTML confirm page
  const html = await res1.text();
  const confirmMatch = html.match(/confirm=([0-9A-Za-z_\-]+)/);
  if (!confirmMatch) {
    throw new Error('Google Drive confirm token not found');
  }
  const confirm = confirmMatch[1];

  // Grab cookies (Drive uses them for confirmation)
  const cookie = res1.headers.get('set-cookie') || '';

  const url2 = `https://drive.google.com/uc?export=download&confirm=${encodeURIComponent(confirm)}&id=${encodeURIComponent(fileId)}`;
  const res2 = await fetch(url2, {
    redirect: 'follow',
    headers: {
      'user-agent': UA,
      cookie,
    },
  });
  if (!res2.ok) throw new Error(`Drive confirm download failed: HTTP ${res2.status} ${res2.statusText}`);
  return Buffer.from(await res2.arrayBuffer());
}

function pickBestFontFile(entries) {
  const prefer = ['.woff2', '.woff', '.otf', '.ttf'];
  const candidates = entries
    .filter((e) => !e.isDirectory)
    .map((e) => ({
      name: e.entryName,
      ext: (e.entryName.match(/\.[^./\\]+$/) || [''])[0].toLowerCase(),
      size: e.header?.size ?? 0,
      entry: e,
    }))
    .filter((c) => prefer.includes(c.ext));

  for (const ext of prefer) {
    const byExt = candidates.filter((c) => c.ext === ext);
    if (byExt.length > 0) {
      byExt.sort((a, b) => b.size - a.size);
      return byExt[0];
    }
  }
  return null;
}

function contentTypeForExt(ext) {
  switch (ext) {
    case '.woff2':
      return 'font/woff2';
    case '.woff':
      return 'font/woff';
    case '.otf':
      return 'font/otf';
    case '.ttf':
      return 'font/ttf';
    default:
      return 'application/octet-stream';
  }
}

export default async function handler(req, res) {
  try {
    const { tproduct, url } = req.query || {};
    const srcUrl = tproduct || url;
    if (!srcUrl || typeof srcUrl !== 'string') {
      res.status(400).json({ error: 'Provide ?tproduct=<myskotom tproduct url>' });
      return;
    }

    const html = await fetchText(srcUrl);
    const downloadUrl = parseTproductDownloadUrl(html);
    if (!downloadUrl) {
      res.status(400).json({ error: 'Download link not found on tproduct page' });
      return;
    }

    const fileId = extractDriveId(downloadUrl);
    if (!fileId) {
      res.status(400).json({ error: 'Unsupported download url (expected Google Drive file link)', downloadUrl });
      return;
    }

    const zipBuf = await driveFetchWithConfirm(fileId);
    const zip = new AdmZip(zipBuf);
    const picked = pickBestFontFile(zip.getEntries());
    if (!picked) {
      res.status(400).json({ error: 'No font files found in archive (expected woff2/woff/otf/ttf)' });
      return;
    }

    const fontBuf = picked.entry.getData();

    res.setHeader('Content-Type', contentTypeForExt(picked.ext));
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(picked.name.split('/').pop() || 'font')}${picked.ext}"`);
    // Cache on Vercel CDN
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    res.status(200).send(fontBuf);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
}
