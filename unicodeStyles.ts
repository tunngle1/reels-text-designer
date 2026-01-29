// Unicode стили для текста (работают при копировании в Instagram)
// Включают поддержку кириллицы через комбинируемые диакритики и специальные символы

export interface UnicodeStyleDef {
  id: string;
  name: string;
  nameRu: string;
  transform: (text: string) => string;
  supportsCyrillic: boolean;
  preview?: string;
}

// Комбинируемые диакритики (добавляются к любой букве)
const COMBINING = {
  underline: '\u0332',        // подчёркивание
  strikethrough: '\u0336',    // зачёркивание
  overline: '\u0305',         // надчёркивание
  doubleUnderline: '\u0333',  // двойное подчёркивание
  slashOverlay: '\u0338',     // перечёркивание косой
  enclosingCircle: '\u20DD',  // круг вокруг
  enclosingSquare: '\u20DE',  // квадрат вокруг
  enclosingDiamond: '\u20DF', // ромб вокруг
  dots: '\u0308',             // точки сверху (умляут)
  ring: '\u030A',             // кольцо сверху
  tilde: '\u0303',            // тильда сверху
  acute: '\u0301',            // акут
  grave: '\u0300',            // гравис
  circumflex: '\u0302',       // циркумфлекс
  caron: '\u030C',            // гачек
  breve: '\u0306',            // бреве
  macron: '\u0304',           // макрон
  cedilla: '\u0327',          // седиль
  ogonek: '\u0328',           // огонек
  horn: '\u031B',             // рожок
  dotBelow: '\u0323',         // точка снизу
  ringBelow: '\u0325',        // кольцо снизу
  commaBelow: '\u0326',       // запятая снизу
  bridgeBelow: '\u032A',      // мостик снизу
  invertedBreve: '\u0311',    // перевёрнутый бреве
  xAbove: '\u033D',           // x сверху
  verticalLine: '\u030D',     // вертикальная линия сверху
  doubleVerticalLine: '\u030E', // двойная вертикальная линия
  leftAngle: '\u031A',        // левый угол сверху
  bridge: '\u0346',           // мостик сверху
  equals: '\u0347',           // знак равенства снизу
  leftHalfRing: '\u0351',     // левое полукольцо сверху
  rightHalfRing: '\u0357',    // правое полукольцо сверху
  asterisk: '\u20F0',         // астериск сверху
};

// Zalgo-эффект (много диакритик)
const zalgoUp = ['\u030D', '\u030E', '\u0304', '\u0305', '\u033F', '\u0311', '\u0306', '\u0310', '\u0352', '\u0357', '\u0351', '\u0307', '\u0308', '\u030A', '\u0342', '\u0343', '\u0344', '\u034A', '\u034B', '\u034C', '\u0303', '\u0302', '\u030C', '\u0350', '\u0300', '\u0301', '\u030B', '\u030F', '\u0312', '\u0313', '\u0314', '\u033D', '\u0309', '\u0363', '\u0364', '\u0365', '\u0366', '\u0367', '\u0368', '\u0369', '\u036A', '\u036B', '\u036C', '\u036D', '\u036E', '\u036F', '\u033E', '\u035B'];
const zalgoDown = ['\u0316', '\u0317', '\u0318', '\u0319', '\u031C', '\u031D', '\u031E', '\u031F', '\u0320', '\u0324', '\u0325', '\u0326', '\u0329', '\u032A', '\u032B', '\u032C', '\u032D', '\u032E', '\u032F', '\u0330', '\u0331', '\u0332', '\u0333', '\u0339', '\u033A', '\u033B', '\u033C', '\u0345', '\u0347', '\u0348', '\u0349', '\u034D', '\u034E', '\u0353', '\u0354', '\u0355', '\u0356', '\u0359', '\u035A', '\u0323'];

// Латинские Mathematical Alphanumeric Symbols
const mapLatinRange = (ch: string, upperBase: number, lowerBase: number, digitBase?: number): string => {
  const code = ch.codePointAt(0);
  if (!code) return ch;
  if (code >= 65 && code <= 90) return String.fromCodePoint(upperBase + (code - 65));
  if (code >= 97 && code <= 122) return String.fromCodePoint(lowerBase + (code - 97));
  if (digitBase !== undefined && code >= 48 && code <= 57) return String.fromCodePoint(digitBase + (code - 48));
  return ch;
};

// Fullwidth для ASCII
const toFullwidth = (ch: string): string => {
  const code = ch.codePointAt(0);
  if (!code) return ch;
  if (code === 32) return String.fromCodePoint(0x3000);
  if (code >= 33 && code <= 126) return String.fromCodePoint(0xFF01 + (code - 33));
  return ch;
};

// Добавить комбинируемый символ к каждой букве
const addCombining = (text: string, combining: string): string => {
  return Array.from(text).map(ch => ch + combining).join('');
};

// Добавить несколько комбинируемых символов (для более сложных эффектов)
const addMultipleCombining = (text: string, combinings: string[]): string => {
  return Array.from(text).map(ch => ch + combinings.join('')).join('');
};

// Zalgo-эффект
const toZalgo = (text: string, intensity: 'light' | 'medium' | 'heavy' = 'medium'): string => {
  const counts = { light: 2, medium: 4, heavy: 8 };
  const count = counts[intensity];
  
  return Array.from(text).map(ch => {
    if (ch === ' ' || ch === '\n') return ch;
    let result = ch;
    for (let i = 0; i < count; i++) {
      if (Math.random() > 0.3) result += zalgoUp[Math.floor(Math.random() * zalgoUp.length)];
      if (Math.random() > 0.3) result += zalgoDown[Math.floor(Math.random() * zalgoDown.length)];
    }
    return result;
  }).join('');
};

// Добавить пробелы между буквами
const addSpaces = (text: string): string => {
  return Array.from(text).join(' ');
};

// Обернуть каждую букву в скобки/символы
const wrapChars = (text: string, left: string, right: string): string => {
  return Array.from(text).map(ch => ch === ' ' ? ' ' : `${left}${ch}${right}`).join('');
};

// Все доступные стили
export const UNICODE_STYLES: UnicodeStyleDef[] = [
  // === Стили для латиницы ===
  {
    id: 'normal',
    name: 'Normal',
    nameRu: 'Обычный',
    transform: (t) => t,
    supportsCyrillic: true,
  },
  {
    id: 'bold',
    name: 'Bold',
    nameRu: 'Жирный',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D400, 0x1D41A, 0x1D7CE)).join(''),
    supportsCyrillic: false,
    preview: '𝐀𝐁𝐂',
  },
  {
    id: 'italic',
    name: 'Italic',
    nameRu: 'Курсив',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D434, 0x1D44E)).join(''),
    supportsCyrillic: false,
    preview: '𝐴𝐵𝐶',
  },
  {
    id: 'boldItalic',
    name: 'Bold Italic',
    nameRu: 'Жирный курсив',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D468, 0x1D482)).join(''),
    supportsCyrillic: false,
    preview: '𝑨𝑩𝑪',
  },
  {
    id: 'script',
    name: 'Script',
    nameRu: 'Рукописный',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D49C, 0x1D4B6)).join(''),
    supportsCyrillic: false,
    preview: '𝒜ℬ𝒞',
  },
  {
    id: 'boldScript',
    name: 'Bold Script',
    nameRu: 'Жирный рукописный',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D4D0, 0x1D4EA)).join(''),
    supportsCyrillic: false,
    preview: '𝓐𝓑𝓒',
  },
  {
    id: 'fraktur',
    name: 'Fraktur',
    nameRu: 'Готический',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D504, 0x1D51E)).join(''),
    supportsCyrillic: false,
    preview: '𝔄𝔅ℭ',
  },
  {
    id: 'boldFraktur',
    name: 'Bold Fraktur',
    nameRu: 'Жирный готический',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D56C, 0x1D586)).join(''),
    supportsCyrillic: false,
    preview: '𝕬𝕭𝕮',
  },
  {
    id: 'double',
    name: 'Double-struck',
    nameRu: 'Двойной',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D538, 0x1D552, 0x1D7D8)).join(''),
    supportsCyrillic: false,
    preview: '𝔸𝔹ℂ',
  },
  {
    id: 'mono',
    name: 'Monospace',
    nameRu: 'Моноширинный',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D670, 0x1D68A, 0x1D7F6)).join(''),
    supportsCyrillic: false,
    preview: '𝙰𝙱𝙲',
  },
  {
    id: 'sansSerif',
    name: 'Sans-serif',
    nameRu: 'Без засечек',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D5A0, 0x1D5BA, 0x1D7E2)).join(''),
    supportsCyrillic: false,
    preview: '𝖠𝖡𝖢',
  },
  {
    id: 'sansSerifBold',
    name: 'Sans-serif Bold',
    nameRu: 'Без засечек жирный',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D5D4, 0x1D5EE, 0x1D7EC)).join(''),
    supportsCyrillic: false,
    preview: '𝗔𝗕𝗖',
  },
  {
    id: 'sansSerifItalic',
    name: 'Sans-serif Italic',
    nameRu: 'Без засечек курсив',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D608, 0x1D622)).join(''),
    supportsCyrillic: false,
    preview: '𝘈𝘉𝘊',
  },
  {
    id: 'sansSerifBoldItalic',
    name: 'Sans-serif Bold Italic',
    nameRu: 'Без засечек жирный курсив',
    transform: (t) => Array.from(t).map(ch => mapLatinRange(ch, 0x1D63C, 0x1D656)).join(''),
    supportsCyrillic: false,
    preview: '𝘼𝘽𝘾',
  },
  {
    id: 'fullwidth',
    name: 'Fullwidth',
    nameRu: 'Широкий',
    transform: (t) => Array.from(t).map(toFullwidth).join(''),
    supportsCyrillic: false,
    preview: 'ＡＢＣ',
  },

  // === Стили с диакритиками (работают для кириллицы!) ===
  {
    id: 'underline',
    name: 'Underline',
    nameRu: 'Подчёркнутый',
    transform: (t) => addCombining(t, COMBINING.underline),
    supportsCyrillic: true,
    preview: 'А̲Б̲В̲',
  },
  {
    id: 'doubleUnderline',
    name: 'Double Underline',
    nameRu: 'Двойное подчёркивание',
    transform: (t) => addCombining(t, COMBINING.doubleUnderline),
    supportsCyrillic: true,
    preview: 'А̳Б̳В̳',
  },
  {
    id: 'strikethrough',
    name: 'Strikethrough',
    nameRu: 'Зачёркнутый',
    transform: (t) => addCombining(t, COMBINING.strikethrough),
    supportsCyrillic: true,
    preview: 'А̶Б̶В̶',
  },
  {
    id: 'slashThrough',
    name: 'Slash Through',
    nameRu: 'Перечёркнутый',
    transform: (t) => addCombining(t, COMBINING.slashOverlay),
    supportsCyrillic: true,
    preview: 'А̸Б̸В̸',
  },
  {
    id: 'overline',
    name: 'Overline',
    nameRu: 'Надчёркнутый',
    transform: (t) => addCombining(t, COMBINING.overline),
    supportsCyrillic: true,
    preview: 'А̅Б̅В̅',
  },
  {
    id: 'dots',
    name: 'Dots',
    nameRu: 'С точками',
    transform: (t) => addCombining(t, COMBINING.dots),
    supportsCyrillic: true,
    preview: 'Ӓ̈Б̈В̈',
  },
  {
    id: 'tilde',
    name: 'Tilde',
    nameRu: 'С тильдой',
    transform: (t) => addCombining(t, COMBINING.tilde),
    supportsCyrillic: true,
    preview: 'А̃Б̃В̃',
  },
  {
    id: 'circumflex',
    name: 'Circumflex',
    nameRu: 'С крышечкой',
    transform: (t) => addCombining(t, COMBINING.circumflex),
    supportsCyrillic: true,
    preview: 'А̂Б̂В̂',
  },
  {
    id: 'ring',
    name: 'Ring',
    nameRu: 'С кольцом',
    transform: (t) => addCombining(t, COMBINING.ring),
    supportsCyrillic: true,
    preview: 'А̊Б̊В̊',
  },
  {
    id: 'acute',
    name: 'Acute',
    nameRu: 'С акутом',
    transform: (t) => addCombining(t, COMBINING.acute),
    supportsCyrillic: true,
    preview: 'А́Б́В́',
  },
  {
    id: 'caron',
    name: 'Caron',
    nameRu: 'С гачеком',
    transform: (t) => addCombining(t, COMBINING.caron),
    supportsCyrillic: true,
    preview: 'А̌Б̌В̌',
  },
  {
    id: 'breve',
    name: 'Breve',
    nameRu: 'С бреве',
    transform: (t) => addCombining(t, COMBINING.breve),
    supportsCyrillic: true,
    preview: 'ӐБ̆В̆',
  },
  {
    id: 'macron',
    name: 'Macron',
    nameRu: 'С макроном',
    transform: (t) => addCombining(t, COMBINING.macron),
    supportsCyrillic: true,
    preview: 'А̄Б̄В̄',
  },
  {
    id: 'xAbove',
    name: 'X Above',
    nameRu: 'С крестиком',
    transform: (t) => addCombining(t, COMBINING.xAbove),
    supportsCyrillic: true,
    preview: 'А͝Б͝В͝',
  },
  {
    id: 'bridge',
    name: 'Bridge',
    nameRu: 'С мостиком',
    transform: (t) => addCombining(t, COMBINING.bridge),
    supportsCyrillic: true,
    preview: 'А͆Б͆В͆',
  },
  {
    id: 'invertedBreve',
    name: 'Inverted Breve',
    nameRu: 'Перевёрнутый бреве',
    transform: (t) => addCombining(t, COMBINING.invertedBreve),
    supportsCyrillic: true,
    preview: 'А̑Б̑В̑',
  },

  // === Комбинированные эффекты ===
  {
    id: 'underlineOverline',
    name: 'Under + Overline',
    nameRu: 'Под + надчёркивание',
    transform: (t) => addMultipleCombining(t, [COMBINING.underline, COMBINING.overline]),
    supportsCyrillic: true,
    preview: 'А̲̅Б̲̅В̲̅',
  },
  {
    id: 'dotsTilde',
    name: 'Dots + Tilde',
    nameRu: 'Точки + тильда',
    transform: (t) => addMultipleCombining(t, [COMBINING.dots, COMBINING.tilde]),
    supportsCyrillic: true,
    preview: 'Ӓ̃Б̈̃В̈̃',
  },
  {
    id: 'underlineDots',
    name: 'Underline + Dots',
    nameRu: 'Подчёркивание + точки',
    transform: (t) => addMultipleCombining(t, [COMBINING.underline, COMBINING.dots]),
    supportsCyrillic: true,
    preview: 'Ӓ̲Б̲̈В̲̈',
  },

  // === Zalgo эффекты ===
  {
    id: 'zalgoLight',
    name: 'Zalgo Light',
    nameRu: 'Залго лёгкий',
    transform: (t) => toZalgo(t, 'light'),
    supportsCyrillic: true,
    preview: 'А̛̓Б̡̈В̢̃',
  },
  {
    id: 'zalgoMedium',
    name: 'Zalgo Medium',
    nameRu: 'Залго средний',
    transform: (t) => toZalgo(t, 'medium'),
    supportsCyrillic: true,
    preview: 'А̛̓̈̃Б̡̈̃̄В̢̃̄̅',
  },
  {
    id: 'zalgoHeavy',
    name: 'Zalgo Heavy',
    nameRu: 'Залго тяжёлый',
    transform: (t) => toZalgo(t, 'heavy'),
    supportsCyrillic: true,
    preview: 'А̛̓̈̃̄̅̆Б̡̈̃̄̅̆̇В̢̃̄̅̆̇̈',
  },

  // === Декоративные эффекты ===
  {
    id: 'spaced',
    name: 'Spaced',
    nameRu: 'С пробелами',
    transform: addSpaces,
    supportsCyrillic: true,
    preview: 'А Б В',
  },
  {
    id: 'parentheses',
    name: 'Parentheses',
    nameRu: 'В скобках',
    transform: (t) => wrapChars(t, '(', ')'),
    supportsCyrillic: true,
    preview: '(А)(Б)(В)',
  },
  {
    id: 'brackets',
    name: 'Brackets',
    nameRu: 'В квадратных скобках',
    transform: (t) => wrapChars(t, '[', ']'),
    supportsCyrillic: true,
    preview: '[А][Б][В]',
  },
  {
    id: 'curlyBraces',
    name: 'Curly Braces',
    nameRu: 'В фигурных скобках',
    transform: (t) => wrapChars(t, '{', '}'),
    supportsCyrillic: true,
    preview: '{А}{Б}{В}',
  },
  {
    id: 'angleBrackets',
    name: 'Angle Brackets',
    nameRu: 'В угловых скобках',
    transform: (t) => wrapChars(t, '«', '»'),
    supportsCyrillic: true,
    preview: '«А»«Б»«В»',
  },
  {
    id: 'stars',
    name: 'Stars',
    nameRu: 'Со звёздами',
    transform: (t) => wrapChars(t, '★', '★'),
    supportsCyrillic: true,
    preview: '★А★★Б★★В★',
  },
  {
    id: 'hearts',
    name: 'Hearts',
    nameRu: 'С сердечками',
    transform: (t) => wrapChars(t, '♡', '♡'),
    supportsCyrillic: true,
    preview: '♡А♡♡Б♡♡В♡',
  },
  {
    id: 'sparkles',
    name: 'Sparkles',
    nameRu: 'С искрами',
    transform: (t) => wrapChars(t, '✧', '✧'),
    supportsCyrillic: true,
    preview: '✧А✧✧Б✧✧В✧',
  },
  {
    id: 'flowers',
    name: 'Flowers',
    nameRu: 'С цветами',
    transform: (t) => wrapChars(t, '❀', '❀'),
    supportsCyrillic: true,
    preview: '❀А❀❀Б❀❀В❀',
  },
  {
    id: 'diamonds',
    name: 'Diamonds',
    nameRu: 'С ромбами',
    transform: (t) => wrapChars(t, '◆', '◆'),
    supportsCyrillic: true,
    preview: '◆А◆◆Б◆◆В◆',
  },
  {
    id: 'arrows',
    name: 'Arrows',
    nameRu: 'Со стрелками',
    transform: (t) => wrapChars(t, '→', '←'),
    supportsCyrillic: true,
    preview: '→А←→Б←→В←',
  },
  {
    id: 'musical',
    name: 'Musical',
    nameRu: 'Музыкальный',
    transform: (t) => wrapChars(t, '♪', '♫'),
    supportsCyrillic: true,
    preview: '♪А♫♪Б♫♪В♫',
  },
];

// Получить стиль по ID
export const getStyleById = (id: string): UnicodeStyleDef | undefined => {
  return UNICODE_STYLES.find(s => s.id === id);
};

// Применить стиль к тексту
export const applyStyle = (text: string, styleId: string): string => {
  const style = getStyleById(styleId);
  if (!style) return text;
  return style.transform(text);
};

// Получить только стили с поддержкой кириллицы
export const getCyrillicStyles = (): UnicodeStyleDef[] => {
  return UNICODE_STYLES.filter(s => s.supportsCyrillic);
};

// Получить только латинские стили
export const getLatinOnlyStyles = (): UnicodeStyleDef[] => {
  return UNICODE_STYLES.filter(s => !s.supportsCyrillic);
};
