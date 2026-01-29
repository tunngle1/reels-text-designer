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

export const loadGoogleFont = (fontFamily: string): void => {
  const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
  if (existingLink) return;
  if (loadedFamilies.has(fontFamily)) return;

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}&display=swap`;
  link.rel = 'stylesheet';
  link.setAttribute('data-font', fontFamily);
  document.head.appendChild(link);
  loadedFamilies.add(fontFamily);
};

export const loadMultipleGoogleFonts = (fontFamilies: string[]): void => {
  fontFamilies.forEach(loadGoogleFont);
};

export const loadGoogleFontsBatch = (fontFamilies: string[], perRequest: number = 20): void => {
  const unique = Array.from(new Set(fontFamilies)).filter(f => f && !loadedFamilies.has(f));
  if (unique.length === 0) return;

  for (let i = 0; i < unique.length; i += perRequest) {
    const chunk = unique.slice(i, i + perRequest);
    const familyParams = chunk
      .map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}`)
      .join('&');

    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?${familyParams}&display=swap`;
    link.rel = 'stylesheet';
    link.setAttribute('data-font-batch', chunk.join('|'));
    document.head.appendChild(link);

    chunk.forEach(f => loadedFamilies.add(f));
  }
};
