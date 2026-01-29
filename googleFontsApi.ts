export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
}

export interface GoogleFontsResponse {
  items: GoogleFont[];
}

const API_KEY = import.meta.env.VITE_GOOGLE_FONTS_API_KEY;

const loadedFamilies = new Set<string>();

export const fetchGoogleFonts = async (limit?: number): Promise<GoogleFont[]> => {
  if (!API_KEY) {
    console.error('Google Fonts API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
    );
    
    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      throw new Error(`Google Fonts API error: ${response.status} ${response.statusText}${bodyText ? ` - ${bodyText}` : ''}`);
    }
    
    const data: GoogleFontsResponse = await response.json();
    if (typeof limit === 'number' && Number.isFinite(limit)) {
      return data.items.slice(0, limit);
    }
    return data.items;
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    return [];
  }
};

export const loadGoogleFont = async (fontFamily: string): Promise<void> => {
  const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
  if (existingLink) {
    // Шрифт уже загружен, ждём готовности
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    return;
  }
  if (loadedFamilies.has(fontFamily)) {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
    return;
  }

  const link = document.createElement('link');
  const familyParam = `${encodeURIComponent(fontFamily).replace(/%20/g, '+')}:wght@100;200;300;400;500;600;700;800;900`;
  link.href = `https://fonts.googleapis.com/css2?family=${familyParam}&display=swap`;
  link.rel = 'stylesheet';
  link.setAttribute('data-font', fontFamily);
  
  const loadPromise = new Promise<void>((resolve) => {
    link.onload = () => resolve();
    link.onerror = () => resolve();
  });
  
  document.head.appendChild(link);
  loadedFamilies.add(fontFamily);
  
  await loadPromise;
  
  // Ждём когда браузер распарсит шрифт
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
};

export const loadMultipleGoogleFonts = (fontFamilies: string[]): void => {
  fontFamilies.forEach(loadGoogleFont);
};

export const loadGoogleFontsBatch = async (fontFamilies: string[], perRequest: number = 20): Promise<void> => {
  const unique = Array.from(new Set(fontFamilies)).filter(f => f && !loadedFamilies.has(f));
  if (unique.length === 0) return;

  const promises: Promise<void>[] = [];

  for (let i = 0; i < unique.length; i += perRequest) {
    const chunk = unique.slice(i, i + perRequest);
    const familyParams = chunk
      .map(f => {
        const family = `${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600`;
        return `family=${family}`;
      })
      .join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    link.rel = 'stylesheet';
    link.setAttribute('data-font-batch', chunk.join('|'));
    
    const loadPromise = new Promise<void>((resolve) => {
      link.onload = () => resolve();
      link.onerror = () => resolve();
    });
    
    document.head.appendChild(link);
    promises.push(loadPromise);

    chunk.forEach(f => loadedFamilies.add(f));
  }

  // Ждём загрузки CSS
  await Promise.all(promises);
  // Ждём когда браузер распарсит шрифты
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
};
