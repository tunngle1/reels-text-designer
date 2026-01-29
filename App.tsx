import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Font, Tab } from './types';
import { INITIAL_FONTS, STORAGE_KEYS } from './constants';
import { fetchGoogleFonts, loadGoogleFont, loadGoogleFontsBatch, GoogleFont } from './googleFontsApi';

// Компонент заголовка с полем ввода
const Header: React.FC<{ text: string; onTextChange: (t: string) => void }> = ({ text, onTextChange }) => (
  <header className="p-4 bg-gradient-to-b from-purple-900/50 to-transparent">
    <h1 className="text-2xl font-bold text-white mb-4">Создать</h1>
    <input
      type="text"
      value={text}
      onChange={(e) => onTextChange(e.target.value)}
      placeholder="Введите текст..."
      className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 text-white placeholder-white/50 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
    />
  </header>
);

// Иконки для вкладок
const CalligraphyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const FontsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
  </svg>
);

const FavoritesIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
  </svg>
);

// Компонент вкладки
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
      active ? 'text-purple-400' : 'text-gray-500'
    }`}
  >
    {icon}
    <span className="text-xs">{label}</span>
  </button>
);

// Карточка шрифта (универсальная для обоих разделов)
const FontCard: React.FC<{
  font: Font;
  text: string;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  accentColor?: string;
}> = ({ font, text, isSelected, isFavorite, onSelect, onToggleFavorite, onCopy, accentColor = 'purple' }) => {
  const gradientFrom = accentColor === 'purple' ? 'from-purple-600/30' : 'from-blue-600/30';
  const gradientTo = accentColor === 'purple' ? 'to-pink-600/30' : 'to-cyan-600/30';
  const borderColor = accentColor === 'purple' ? 'border-purple-500' : 'border-blue-500';
  const buttonBg = accentColor === 'purple' ? 'bg-purple-600 hover:bg-purple-500' : 'bg-blue-600 hover:bg-blue-500';

  return (
    <div
      onClick={onSelect}
      className={`relative p-4 rounded-2xl cursor-pointer transition-all ${
        isSelected
          ? `bg-gradient-to-br ${gradientFrom} ${gradientTo} border-2 ${borderColor}`
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
    >
      {/* Название шрифта */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 truncate pr-8">
        {font.name}
      </div>
      
      {/* Превью текста */}
      <div 
        className="text-white text-xl leading-relaxed min-h-[56px] break-words"
        style={{ fontFamily: font.family }}
      >
        {text || font.name}
      </div>
      
      {/* Кнопка избранного */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite();
        }}
        className={`absolute top-3 right-3 p-1 rounded-full transition-colors ${
          isFavorite ? 'text-pink-500' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <svg className="w-5 h-5" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {/* Кнопка копирования при выборе */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className={`absolute bottom-3 right-3 px-3 py-1.5 ${buttonBg} rounded-lg text-xs text-white font-medium transition-colors flex items-center gap-1`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
          </svg>
          Копировать
        </button>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('calligraphy');
  const [text, setText] = useState('владик пуся');
  const [selectedFontId, setSelectedFontId] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [googleFonts, setGoogleFonts] = useState<Font[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [onlyCyrillic, setOnlyCyrillic] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  // Загрузка данных
  useEffect(() => {
    const savedFavorites = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));

    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }

    const loadFonts = async () => {
      setIsLoadingFonts(true);
      try {
        const fonts = await fetchGoogleFonts();
        const convertedFonts: Font[] = fonts.map((gf: GoogleFont) => ({
          id: `google_${gf.family.replace(/\s+/g, '_').toLowerCase()}`,
          name: gf.family,
          family: gf.family,
          source: 'google' as const,
          subsets: gf.subsets,
          category: gf.category
        }));
        // Отладка: сколько шрифтов с кириллицей
        const cyrillicFonts = convertedFonts.filter(f => f.subsets?.includes('cyrillic') || f.subsets?.includes('cyrillic-ext'));
        console.log(`Всего шрифтов: ${convertedFonts.length}, с кириллицей: ${cyrillicFonts.length}`);
        setGoogleFonts(convertedFonts);
        // Предзагружаем первые шрифты
        fonts.slice(0, 20).forEach(f => loadGoogleFont(f.family));
      } catch (error) {
        console.error('Failed to load Google Fonts:', error);
      } finally {
        setIsLoadingFonts(false);
      }
    };
    loadFonts();
  }, []);

  // Сохранение избранного
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  const allFonts = [...INITIAL_FONTS, ...googleFonts];

  // Каллиграфические шрифты (handwriting category)
  const calligraphyFonts = allFonts.filter(f => {
    const isHandwriting = f.category === 'handwriting';
    if (!onlyCyrillic) return isHandwriting;
    if (f.source !== 'google') return isHandwriting;
    const subsets = f.subsets || [];
    return isHandwriting && (subsets.includes('cyrillic') || subsets.includes('cyrillic-ext'));
  });

  // Остальные шрифты
  const regularFonts = allFonts.filter(f => {
    const isNotHandwriting = f.category !== 'handwriting';
    if (!onlyCyrillic) return isNotHandwriting;
    if (f.source !== 'google') return isNotHandwriting;
    const subsets = f.subsets || [];
    return isNotHandwriting && (subsets.includes('cyrillic') || subsets.includes('cyrillic-ext'));
  });

  // Выбор списка в зависимости от вкладки
  const currentFonts = activeTab === 'calligraphy' ? calligraphyFonts 
    : activeTab === 'fonts' ? regularFonts 
    : allFonts.filter(f => favorites.includes(f.id));

  const displayedFonts = currentFonts.slice(0, visibleCount);

  // Подгрузка CSS для видимых шрифтов с принудительной перерисовкой
  const [fontsLoaded, setFontsLoaded] = useState(0);
  
  useEffect(() => {
    const families = displayedFonts
      .filter(f => f.source === 'google')
      .map(f => f.family);
    
    if (families.length === 0) return;
    
    const loadFonts = async () => {
      await loadGoogleFontsBatch(families, 20);
      // Принудительная перерисовка после загрузки шрифтов
      setFontsLoaded(prev => prev + 1);
    };
    
    loadFonts();
  }, [displayedFonts.map(f => f.id).join(',')]);

  // Сброс видимых при смене вкладки
  useEffect(() => {
    setVisibleCount(40);
    setSelectedFontId('');
  }, [activeTab]);

  // ========== ГЛАВНАЯ ФУНКЦИЯ: КОПИРОВАНИЕ КАК PNG-СТИКЕР ==========
  const copyAsSticker = async (fontFamily: string) => {
    if (isCopying || !text.trim()) return;
    setIsCopying(true);

    try {
      // Убеждаемся, что шрифт загружен
      await loadGoogleFont(fontFamily);
      // Небольшая задержка для загрузки шрифта
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const fontSize = 72;
      const fontWeight = 600;
      const padding = 40;
      const fontDecl = `${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`;
      
      ctx.font = fontDecl;
      
      const lines = text.split('\n');
      const lineHeight = fontSize * 1.4;
      let maxWidth = 0;
      lines.forEach(line => {
        const m = ctx.measureText(line);
        if (m.width > maxWidth) maxWidth = m.width;
      });

      canvas.width = Math.max(maxWidth + padding * 2, 200);
      canvas.height = Math.max(lines.length * lineHeight + padding * 2, 120);

      // Прозрачный фон
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Рисуем текст
      ctx.font = fontDecl;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      lines.forEach((line, i) => {
        ctx.fillText(line, canvas.width / 2, padding + i * lineHeight);
      });

      // Конвертируем в blob
      const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Failed to create blob');

      const file = new File([blob], `sticker-${Date.now()}.png`, { type: 'image/png' });

      // 1. Пробуем Clipboard API (работает только на HTTPS)
      const canCopy = (window as any).isSecureContext && 
                      navigator.clipboard && 
                      typeof (navigator.clipboard as any).write === 'function' &&
                      typeof (window as any).ClipboardItem === 'function';
      
      if (canCopy) {
        try {
          await (navigator.clipboard as any).write([
            new (window as any).ClipboardItem({ 'image/png': blob })
          ]);
          showSuccess('Стикер скопирован! Вставьте в Instagram Reels.');
          return;
        } catch (e) {
          console.log('Clipboard API failed:', e);
        }
      }

      // 2. Fallback: Share API (мобильные устройства)
      try {
        const navAny = navigator as any;
        if (typeof navAny.share === 'function' && navAny.canShare?.({ files: [file] })) {
          await navAny.share({ files: [file], title: 'Стикер для Instagram' });
          return;
        }
      } catch (e) {
        console.log('Share API failed:', e);
      }

      // 3. Fallback: скачать файл
      const link = document.createElement('a');
      link.download = file.name;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showSuccess('Стикер скачан! Откройте его в галерее и поделитесь в Instagram.');

    } catch (err) {
      console.error('Copy as sticker failed:', err);
      alert('Не удалось создать стикер. Попробуйте ещё раз.');
    } finally {
      setIsCopying(false);
    }
  };

  const showSuccess = (message: string) => {
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.HapticFeedback.notificationOccurred('success');
      tg.WebApp.showAlert(message);
    } else {
      alert(message);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const selectedFont = allFonts.find(f => f.id === selectedFontId);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <Header text={text} onTextChange={setText} />

      {/* Заголовок раздела */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {activeTab === 'calligraphy' && 'Каллиграфия'}
          {activeTab === 'fonts' && 'Шрифты'}
          {activeTab === 'favorites' && 'Избранное'}
        </h2>
        <div className="text-xs text-gray-500">
          {currentFonts.length} шрифтов
        </div>
      </div>

      {/* Фильтр кириллицы */}
      {activeTab !== 'favorites' && (
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={onlyCyrillic}
              onChange={(e) => setOnlyCyrillic(e.target.checked)}
              className="rounded accent-purple-500"
            />
            Только с кириллицей
          </label>
        </div>
      )}

      {/* Контент */}
      <div className="flex-1 overflow-y-auto px-4 pb-32">
        {isLoadingFonts ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : currentFonts.length === 0 ? (
          <p className="text-center text-gray-400 py-10">
            {activeTab === 'favorites' ? 'Нет избранных шрифтов' : 'Шрифты не найдены'}
          </p>
        ) : (
          <>
            <div className="text-xs text-gray-500 mb-3 text-center">
              Показано {Math.min(displayedFonts.length, currentFonts.length)} из {currentFonts.length}
            </div>
            <div className="grid grid-cols-2 gap-3" key={fontsLoaded}>
              {displayedFonts.map(font => (
                <FontCard
                  key={`${font.id}-${fontsLoaded}`}
                  font={font}
                  text={text}
                  isSelected={selectedFontId === font.id}
                  isFavorite={favorites.includes(font.id)}
                  onSelect={() => {
                    setSelectedFontId(font.id);
                    if (font.source === 'google') loadGoogleFont(font.family);
                  }}
                  onToggleFavorite={() => toggleFavorite(font.id)}
                  onCopy={() => copyAsSticker(font.family)}
                  accentColor={activeTab === 'calligraphy' ? 'purple' : 'blue'}
                />
              ))}
            </div>
            {displayedFonts.length < currentFonts.length && (
              <button
                onClick={() => setVisibleCount(prev => prev + 40)}
                className="w-full mt-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium"
              >
                Показать ещё
              </button>
            )}
          </>
        )}
      </div>


      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-white/10 max-w-md mx-auto">
        <div className="flex">
          <TabButton
            active={activeTab === 'calligraphy'}
            onClick={() => setActiveTab('calligraphy')}
            icon={<CalligraphyIcon />}
            label="Каллиграфия"
          />
          <TabButton
            active={activeTab === 'fonts'}
            onClick={() => setActiveTab('fonts')}
            icon={<FontsIcon />}
            label="Шрифты"
          />
          <TabButton
            active={activeTab === 'favorites'}
            onClick={() => setActiveTab('favorites')}
            icon={<FavoritesIcon />}
            label="Избранное"
          />
        </div>
      </nav>
    </div>
  );
};

export default App;
