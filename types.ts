
export interface Font {
  id: string;
  name: string;
  family: string;
  source: 'google' | 'custom' | 'system';
  subsets?: string[];
  category?: string;
  url?: string;
}

export type Tab = 'calligraphy' | 'fonts' | 'favorites';

export interface AppState {
  text: string;
  fontSize: number;
  textColor: string;
  selectedFontId: string;
  favorites: string[];
  customFonts: Font[];
}
