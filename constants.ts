
import { Font } from './types';

export const INITIAL_FONTS: Font[] = [
  { id: 'system', name: 'Системный', family: 'sans-serif', source: 'system', subsets: ['cyrillic'], category: 'sans-serif' },
];

export const STORAGE_KEYS = {
  FAVORITES: 'reels_designer_favorites',
  CUSTOM_FONTS: 'reels_designer_custom_fonts',
};
