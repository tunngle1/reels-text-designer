export interface GoogleFont {
  family: string;
  variants: string[];
  subsets: string[];
  category: string;
}

export interface GoogleFontsResponse {
  items: GoogleFont[];
}

const API_KEY = process.env.GOOGLE_FONTS_API_KEY;

export const fetchGoogleFonts = async (limit: number = 100): Promise<GoogleFont[]> => {
  if (!API_KEY) {
    console.error('Google Fonts API key not found');
    return [];
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/webfonts/v1/webfonts?key=${API_KEY}&sort=popularity`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data: GoogleFontsResponse = await response.json();
    return data.items.slice(0, limit);
  } catch (error) {
    console.error('Error fetching Google Fonts:', error);
    return [];
  }
};

export const loadGoogleFont = (fontFamily: string): void => {
  const existingLink = document.querySelector(`link[data-font="${fontFamily}"]`);
  if (existingLink) return;

  const link = document.createElement('link');
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, '+')}&display=swap`;
  link.rel = 'stylesheet';
  link.setAttribute('data-font', fontFamily);
  document.head.appendChild(link);
};

export const loadMultipleGoogleFonts = (fontFamilies: string[]): void => {
  fontFamilies.forEach(loadGoogleFont);
};
