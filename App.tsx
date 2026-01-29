
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Font, Tab, AppState } from './types';
import { INITIAL_FONTS, STORAGE_KEYS } from './constants';
import { fetchGoogleFonts, loadGoogleFont, loadGoogleFontsBatch, GoogleFont } from './googleFontsApi';

// Вспомогательные компоненты
const Header: React.FC = () => (
  <header className="p-4 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 bg-[var(--tg-theme-bg-color)]">
    <h1 className="text-xl font-bold text-center">Reels Designer</h1>
    <p className="text-xs text-center text-gray-500">Красивый текст для ваших видео</p>
  </header>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 ${
      active 
        ? 'border-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-color)]' 
        : 'border-transparent text-gray-500'
    }`}
  >
    {children}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [text, setText] = useState('Текст для Reels');
  const [fontSize, setFontSize] = useState(60);
  const [fontWeight, setFontWeight] = useState(600);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.2);
  const [unicodeStyle, setUnicodeStyle] = useState<'normal' | 'bold' | 'italic' | 'script' | 'fraktur' | 'double' | 'mono' | 'fullwidth'>('normal');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [selectedFontId, setSelectedFontId] = useState('montserrat');
  const [onlyCyrillic, setOnlyCyrillic] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [customFonts, setCustomFonts] = useState<Font[]>([]);
  const [googleFonts, setGoogleFonts] = useState<Font[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [visibleFontsCount, setVisibleFontsCount] = useState(80);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Инициализация данных из localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const savedCustom = localStorage.getItem(STORAGE_KEYS.CUSTOM_FONTS);
    if (savedCustom) {
      const parsed: Font[] = JSON.parse(savedCustom);
      setCustomFonts(parsed);
      // Загружаем FontFace для кастомных шрифтов
      parsed.forEach(f => {
        if (f.url) {
          const fontFace = new FontFace(f.family, `url(${f.url})`);
          fontFace.load().then(loaded => {
            (document as any).fonts.add(loaded);
          }).catch(console.error);
        }
      });
    }

    // Сообщаем Telegram, что приложение готово
    // Fix: Cast window to any to access the Telegram object without TypeScript errors
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }

    // Загружаем шрифты из Google Fonts API
    const loadFonts = async () => {
      setIsLoadingFonts(true);
      try {
        const fonts = await fetchGoogleFonts();
        const convertedFonts: Font[] = fonts.map((gf: GoogleFont) => ({
          id: `google_${gf.family.replace(/\s+/g, '_').toLowerCase()}`,
          name: gf.family,
          family: gf.family,
          source: 'google' as const
          ,
          subsets: gf.subsets,
          category: gf.category
        }));
        setGoogleFonts(convertedFonts);
        // Предзагружаем первые 10 шрифтов
        fonts.slice(0, 10).forEach(f => loadGoogleFont(f.family));
      } catch (error) {
        console.error('Failed to load Google Fonts:', error);
      } finally {
        setIsLoadingFonts(false);
      }
    };
    loadFonts();
  }, []);

  useEffect(() => {
    setVisibleFontsCount(80);
  }, [activeTab]);

  // Сохранение избранного
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  // Сохранение кастомных шрифтов
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_FONTS, JSON.stringify(customFonts));
  }, [customFonts]);

  const allFonts = [...INITIAL_FONTS, ...googleFonts, ...customFonts];
  const selectedFont = allFonts.find(f => f.id === selectedFontId) || INITIAL_FONTS[0];

  // Логика отрисовки на Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const lines = (text || '').split('\n');
    const safeLetterSpacing = Number.isFinite(letterSpacing) ? letterSpacing : 0;
    const safeLineHeight = Number.isFinite(lineHeight) ? lineHeight : 1.2;
    const fontDecl = `${fontWeight} ${fontSize}px "${selectedFont.family}"`;

    const measureLineWidth = (line: string) => {
      if (safeLetterSpacing === 0 || line.length <= 1) {
        ctx.font = fontDecl;
        return ctx.measureText(line).width;
      }
      ctx.font = fontDecl;
      let w = 0;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        w += ctx.measureText(ch).width;
        if (i < line.length - 1) w += safeLetterSpacing;
      }
      return w;
    };

    // Очистка
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Настройка шрифта
    ctx.font = fontDecl;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const lineWidths = lines.map(measureLineWidth);
    const maxWidth = Math.max(0, ...lineWidths);
    const textWidth = maxWidth + 40;
    const textHeight = Math.max(1, lines.length) * fontSize * safeLineHeight + 40;

    // Устанавливаем размер канваса под текст (с запасом)
    canvas.width = Math.max(textWidth, 300);
    canvas.height = Math.max(textHeight, 150);

    // Повторная настройка после изменения размера канваса
    ctx.font = fontDecl;
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const startY = canvas.height / 2 - ((lines.length - 1) * fontSize * safeLineHeight) / 2;

    lines.forEach((line, idx) => {
      const y = startY + idx * fontSize * safeLineHeight;
      if (safeLetterSpacing === 0 || line.length <= 1) {
        ctx.fillText(line, canvas.width / 2, y);
        return;
      }

      const lineWidth = lineWidths[idx] ?? 0;
      let x = canvas.width / 2 - lineWidth / 2;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        ctx.fillText(ch, x, y);
        x += ctx.measureText(ch).width + (i < line.length - 1 ? safeLetterSpacing : 0);
      }
    });
  }, [text, fontSize, fontWeight, letterSpacing, lineHeight, textColor, selectedFont]);

  useEffect(() => {
    // Небольшая задержка чтобы шрифт успел примениться
    const timeout = setTimeout(drawCanvas, 50);
    return () => clearTimeout(timeout);
  }, [drawCanvas]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const fontName = file.name.split('.')[0];
      const fontFamily = `CustomFont_${Date.now()}`;
      
      const newFont: Font = {
        id: fontFamily,
        name: fontName,
        family: fontFamily,
        source: 'custom',
        url: base64
      };

      try {
        const fontFace = new FontFace(fontFamily, `url(${base64})`);
        const loaded = await fontFace.load();
        (document as any).fonts.add(loaded);
        
        setCustomFonts(prev => [...prev, newFont]);
        setSelectedFontId(newFont.id);
        setActiveTab('all');
      } catch (err) {
        alert('Ошибка загрузки шрифта. Убедитесь, что это корректный .ttf или .otf файл.');
      }
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          const item = new ClipboardItem({ 'image/png': blob });
          await navigator.clipboard.write([item]);
          // Fix: Cast window to any to access the Telegram object without TypeScript errors
          const tg = (window as any).Telegram;
          if (tg?.WebApp) {
            tg.WebApp.HapticFeedback.notificationOccurred('success');
            tg.WebApp.showAlert('Изображение скопировано!');
          } else {
            alert('Скопировано в буфер обмена!');
          }
        } catch (err) {
          downloadImage();
        }
      }, 'image/png');
    } catch (err) {
      downloadImage();
    }
  };

  const transformTextToUnicodeStyle = useCallback((input: string) => {
    const mapRange = (ch: string, upperBase: number, lowerBase: number, digitBase?: number) => {
      const code = ch.codePointAt(0);
      if (!code) return ch;
      if (code >= 65 && code <= 90) return String.fromCodePoint(upperBase + (code - 65));
      if (code >= 97 && code <= 122) return String.fromCodePoint(lowerBase + (code - 97));
      if (digitBase !== undefined && code >= 48 && code <= 57) return String.fromCodePoint(digitBase + (code - 48));
      return ch;
    };

    const toFullwidth = (ch: string) => {
      const code = ch.codePointAt(0);
      if (!code) return ch;
      if (code === 32) return String.fromCodePoint(0x3000);
      if (code >= 33 && code <= 126) return String.fromCodePoint(0xFF01 + (code - 33));
      return ch;
    };

    const convertChar = (ch: string) => {
      switch (unicodeStyle) {
        case 'bold':
          return mapRange(ch, 0x1D400, 0x1D41A, 0x1D7CE);
        case 'italic':
          return mapRange(ch, 0x1D434, 0x1D44E);
        case 'script':
          return mapRange(ch, 0x1D49C, 0x1D4B6);
        case 'fraktur':
          return mapRange(ch, 0x1D504, 0x1D51E);
        case 'double':
          return mapRange(ch, 0x1D538, 0x1D552, 0x1D7D8);
        case 'mono':
          return mapRange(ch, 0x1D670, 0x1D68A, 0x1D7F6);
        case 'fullwidth':
          return toFullwidth(ch);
        case 'normal':
        default:
          return ch;
      }
    };

    return Array.from(input).map(convertChar).join('');
  }, [unicodeStyle]);

  const unicodeStyledText = transformTextToUnicodeStyle(text);

  const copyUnicodeText = async () => {
    try {
      const canUseClipboardApi = typeof navigator !== 'undefined' && !!navigator.clipboard && (window as any).isSecureContext;
      if (canUseClipboardApi) {
        await navigator.clipboard.writeText(unicodeStyledText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = unicodeStyledText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('execCommand(copy) failed');
      }

      const tg = (window as any).Telegram;
      if (tg?.WebApp) {
        tg.WebApp.HapticFeedback.notificationOccurred('success');
        tg.WebApp.showAlert('Стилизованный текст скопирован!');
      } else {
        alert('Стилизованный текст скопирован!');
      }
    } catch (err) {
      alert('Не удалось скопировать текст');
    }
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `reels-text-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const copyText = async () => {
    try {
      const canUseClipboardApi = typeof navigator !== 'undefined' && !!navigator.clipboard && (window as any).isSecureContext;
      if (canUseClipboardApi) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '0';
        textarea.style.left = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!ok) throw new Error('execCommand(copy) failed');
      }
      const tg = (window as any).Telegram;
      if (tg?.WebApp) {
        tg.WebApp.HapticFeedback.notificationOccurred('success');
        tg.WebApp.showAlert('Текст скопирован!');
      } else {
        alert('Текст скопирован!');
      }
    } catch (err) {
      alert('Не удалось скопировать текст');
    }
  };

  const filteredFonts = activeTab === 'all' 
    ? allFonts 
    : activeTab === 'favorites' 
      ? allFonts.filter(f => favorites.includes(f.id))
      : [];

  const cyrillicFilteredFonts = activeTab === 'upload' || !onlyCyrillic
    ? filteredFonts
    : filteredFonts.filter(f => {
        if (f.source !== 'google') return true;
        const subsets = f.subsets || [];
        return subsets.includes('cyrillic') || subsets.includes('cyrillic-ext');
      });

  const displayedFonts = activeTab === 'upload' ? cyrillicFilteredFonts : cyrillicFilteredFonts.slice(0, visibleFontsCount);

  useEffect(() => {
    if (activeTab === 'upload') return;
    const families = displayedFonts
      .filter(f => f.source === 'google')
      .map(f => f.family);
    loadGoogleFontsBatch(families, 25);
  }, [activeTab, displayedFonts]);

  const handleListScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    if (activeTab === 'upload') return;

    const thresholdPx = 250;
    const isNearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - thresholdPx;
    if (isNearBottom) {
      setVisibleFontsCount(prev => Math.min(prev + 80, cyrillicFilteredFonts.length));
    }
  }, [activeTab, cyrillicFilteredFonts.length]);

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto">
      <Header />

      {/* Preview Area */}
      <div className="p-4 flex flex-col items-center bg-[var(--tg-theme-secondary-bg-color)] min-h-[250px] justify-center relative overflow-hidden">
        <div className="checkerboard-bg absolute inset-0 opacity-10 pointer-events-none"></div>
        <canvas 
          ref={canvasRef} 
          className="max-w-full h-auto drop-shadow-lg"
          style={{ background: 'transparent' }}
        />
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-mono">PNG / Прозрачный фон</div>
      </div>

      {/* Controls */}
      <div className="p-4 space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Ваш текст</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--tg-theme-bg-color)] focus:ring-2 focus:ring-[var(--tg-theme-button-color)] outline-none"
            placeholder="Введите фразу..."
            rows={2}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Размер: {fontSize}px</label>
            <input
              type="range"
              min="20"
              max="150"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full accent-[var(--tg-theme-button-color)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Цвет</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="w-10 h-10 p-0 border-0 rounded-lg cursor-pointer bg-transparent"
              />
              <button 
                onClick={() => setTextColor('#FFFFFF')}
                className="w-8 h-8 rounded-full border border-gray-300 bg-white"
                title="Белый"
              />
              <button 
                onClick={() => setTextColor('#000000')}
                className="w-8 h-8 rounded-full border border-gray-300 bg-black"
                title="Черный"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Жирность: {fontWeight}</label>
            <input
              type="range"
              min="100"
              max="900"
              step="100"
              value={fontWeight}
              onChange={(e) => setFontWeight(parseInt(e.target.value))}
              className="w-full accent-[var(--tg-theme-button-color)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Межбуквенно: {letterSpacing}px</label>
            <input
              type="range"
              min="-5"
              max="20"
              step="1"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(parseInt(e.target.value))}
              className="w-full accent-[var(--tg-theme-button-color)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Межстрочно: {lineHeight.toFixed(1)}</label>
          <input
            type="range"
            min="0.8"
            max="2.0"
            step="0.1"
            value={lineHeight}
            onChange={(e) => setLineHeight(parseFloat(e.target.value))}
            className="w-full accent-[var(--tg-theme-button-color)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Стиль текста</label>
            <select
              value={unicodeStyle}
              onChange={(e) => setUnicodeStyle(e.target.value as any)}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--tg-theme-bg-color)] outline-none"
            >
              <option value="normal">Обычный</option>
              <option value="bold">Bold</option>
              <option value="italic">Italic</option>
              <option value="script">Script</option>
              <option value="fraktur">Fraktur</option>
              <option value="double">Double</option>
              <option value="mono">Mono</option>
              <option value="fullwidth">Fullwidth</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Превью</label>
            <div className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-[var(--tg-theme-bg-color)] text-sm truncate">
              {unicodeStyledText || '—'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={copyText}
            className="py-4 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border border-gray-200 dark:border-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
              <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
            </svg>
            Копировать текст
          </button>
          <button
            onClick={copyUnicodeText}
            className="py-4 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border border-gray-200 dark:border-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
            </svg>
            Текст для IG
          </button>
          <button
            onClick={copyToClipboard}
            className="py-4 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            Скопировать PNG
          </button>
        </div>

        <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-[var(--tg-theme-secondary-bg-color)]">
          <span className="text-sm text-[var(--tg-theme-text-color)]">Только кириллица</span>
          <input
            type="checkbox"
            checked={onlyCyrillic}
            onChange={(e) => setOnlyCyrillic(e.target.checked)}
            className="h-5 w-5 accent-[var(--tg-theme-button-color)]"
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="flex px-4 border-b border-gray-100 dark:border-gray-900">
        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')}>Все</TabButton>
        <TabButton active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')}>Избранные</TabButton>
        <TabButton active={activeTab === 'upload'} onClick={() => setActiveTab('upload')}>Загрузить</TabButton>
      </div>

      {/* Font List */}
      <div ref={listRef} onScroll={handleListScroll} className="flex-1 overflow-y-auto p-4 pb-24">
        {activeTab === 'upload' ? (
          <div className="text-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl">
            <p className="text-sm text-gray-500 mb-4">Вы можете загрузить свои шрифты формата .ttf или .otf</p>
            <label className="inline-block px-6 py-3 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl cursor-pointer hover:opacity-80 transition-opacity">
              <span className="font-medium">Выбрать файл</span>
              <input type="file" accept=".ttf,.otf" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : activeTab === 'all' && isLoadingFonts ? (
          <p className="text-center text-gray-400 py-10">Загружаю шрифты…</p>
        ) : filteredFonts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">Список пуст</p>
        ) : (
          <div>
            <div className="text-[11px] text-gray-400 mb-3 text-center">
              Показано {Math.min(displayedFonts.length, cyrillicFilteredFonts.length)} из {cyrillicFilteredFonts.length}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {displayedFonts.map(font => (
                <div 
                  key={font.id}
                  onClick={() => {
                    setSelectedFontId(font.id);
                    if (font.source === 'google') {
                      loadGoogleFont(font.family);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 transition-all flex flex-col cursor-pointer ${
                    selectedFontId === font.id 
                      ? 'border-[var(--tg-theme-button-color)] bg-[var(--tg-theme-button-color)] bg-opacity-5' 
                      : 'border-transparent bg-[var(--tg-theme-secondary-bg-color)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-medium text-gray-500 truncate">{font.name}</span>
                      <span className="text-[9px] uppercase tracking-widest text-gray-300">{font.source}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(font.id);
                      }}
                      className={`p-1 rounded-full transition-colors ${
                        favorites.includes(font.id) ? 'text-red-500' : 'text-gray-300'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill={favorites.includes(font.id) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                  </div>
                  <span 
                    className="text-base truncate"
                    style={{ fontFamily: font.family }}
                  >
                    {text || font.name}
                  </span>
                </div>
              ))}
            </div>

            {activeTab !== 'upload' && displayedFonts.length < cyrillicFilteredFonts.length ? (
              <button
                onClick={() => setVisibleFontsCount(prev => Math.min(prev + 80, cyrillicFilteredFonts.length))}
                className="w-full mt-4 py-3 rounded-2xl font-bold bg-[var(--tg-theme-secondary-bg-color)] text-[var(--tg-theme-text-color)] border border-gray-200 dark:border-gray-800"
              >
                Показать ещё
              </button>
            ) : null}
          </div>
        )}
      </div>

      <style>{`
        .checkerboard-bg {
          background-image: linear-gradient(45deg, #808080 25%, transparent 25%), 
                            linear-gradient(-45deg, #808080 25%, transparent 25%), 
                            linear-gradient(45deg, transparent 75%, #808080 75%), 
                            linear-gradient(-45deg, transparent 75%, #808080 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
};

export default App;
