
import { Font } from './types';

export const INITIAL_FONTS: Font[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', source: 'google' },
  { id: 'playfair', name: 'Playfair Display', family: 'Playfair Display', source: 'google' },
  { id: 'russo', name: 'Russo One', family: 'Russo One', source: 'google' },
  { id: 'caveat', name: 'Caveat (Рукописный)', family: 'Caveat', source: 'google' },
  { id: 'kelly', name: 'Kelly Slab', family: 'Kelly Slab', source: 'google' },
  { id: 'comfortaa', name: 'Comfortaa', family: 'Comfortaa', source: 'google' },
  { id: 'underdog', name: 'Underdog', family: 'Underdog', source: 'google' },
  { id: 'system', name: 'Системный', family: 'sans-serif', source: 'system' },
];

export const STORAGE_KEYS = {
  FAVORITES: 'reels_designer_favorites',
  CUSTOM_FONTS: 'reels_designer_custom_fonts',
};
