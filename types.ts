
export interface Font {
  id: string;
  name: string;
  family: string;
  source: 'google' | 'custom' | 'system';
  url?: string;
}

export type Tab = 'all' | 'favorites' | 'upload';

export interface AppState {
  text: string;
  fontSize: number;
  textColor: string;
  selectedFontId: string;
  favorites: string[];
  customFonts: Font[];
}
