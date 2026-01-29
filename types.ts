
export interface Font {
  id: string;
  name: string;
  family: string;
  source: 'google' | 'custom' | 'system' | 'myskotom';
  subsets?: string[];
  category?: string;
  url?: string;
  tproductUrl?: string;
  author?: string;
  license?: string;
  tags?: {
    type?: string[];
    mood?: string[];
  };
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
