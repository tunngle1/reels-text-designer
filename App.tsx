import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Font, Tab } from './types';
import { INITIAL_FONTS, STORAGE_KEYS } from './constants';
import { fetchGoogleFonts, loadGoogleFont, loadGoogleFontsBatch, GoogleFont } from './googleFontsApi';
import { UNICODE_STYLES, applyStyle, UnicodeStyleDef } from './unicodeStyles';

// Компонент заголовка
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

// Карточка Unicode-стиля (для раздела Каллиграфия)
const StyleCard: React.FC<{
  style: UnicodeStyleDef;
  text: string;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
}> = ({ style, text, isSelected, isFavorite, onSelect, onToggleFavorite, onCopy }) => {
  const styledText = applyStyle(text || 'Пример текста', style.id);
  
  return (
    <div
      onClick={onSelect}
      className={`relative p-4 rounded-2xl cursor-pointer transition-all ${
        isSelected
          ? 'bg-gradient-to-br from-purple-600/30 to-pink-600/30 border-2 border-purple-500'
          : 'bg-white/5 border border-white/10 hover:bg-white/10'
      }`}
    >
      {/* Название стиля */}
      <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">
        {style.nameRu}
        {style.supportsCyrillic && <span className="ml-1 text-green-400">•</span>}
      </div>
      
      {/* Превью текста */}
      <div className="text-white text-lg leading-relaxed min-h-[48px] break-words">
        {styledText}
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
          className="absolute bottom-3 right-3 px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs text-white font-medium transition-colors"
        >
          Копировать
        </button>
      )}
    </div>
  );
};

// Карточка шрифта (для раздела Шрифты)
const FontCard: React.FC<{
  font: Font;
  text: string;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}> = ({ font, text, isSelected, isFavorite, onSelect, onToggleFavorite }) => (
  <div
    onClick={onSelect}
    className={`relative p-4 rounded-2xl cursor-pointer transition-all ${
      isSelected
        ? 'bg-gradient-to-br from-blue-600/30 to-cyan-600/30 border-2 border-blue-500'
        : 'bg-white/5 border border-white/10 hover:bg-white/10'
    }`}
  >
    {/* Название шрифта */}
    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 truncate">
      {font.name}
    </div>
    
    {/* Превью текста */}
    <div 
      className="text-white text-lg leading-relaxed min-h-[48px] break-words"
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
  </div>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('calligraphy');
  const [text, setText] = useState('владик пуся');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('normal');
  const [selectedFontId, setSelectedFontId] = useState('montserrat');
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>([]);
  const [favoriteFonts, setFavoriteFonts] = useState<string[]>([]);
  const [googleFonts, setGoogleFonts] = useState<Font[]>([]);
  const [isLoadingFonts, setIsLoadingFonts] = useState(false);
  const [visibleStylesCount, setVisibleStylesCount] = useState(20);
  const [visibleFontsCount, setVisibleFontsCount] = useState(40);
  const [onlyCyrillic, setOnlyCyrillic] = useState(true);
  const [showCyrillicStylesOnly, setShowCyrillicStylesOnly] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Загрузка избранного из localStorage
  useEffect(() => {
    const savedFavoriteStyles = localStorage.getItem('reels_favorite_styles');
    if (savedFavoriteStyles) setFavoriteStyles(JSON.parse(savedFavoriteStyles));
    
    const savedFavoriteFonts = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (savedFavoriteFonts) setFavoriteFonts(JSON.parse(savedFavoriteFonts));

    // Telegram WebApp
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }

    // Загрузка Google Fonts
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
        setGoogleFonts(convertedFonts);
        fonts.slice(0, 10).forEach(f => loadGoogleFont(f.family));
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
    localStorage.setItem('reels_favorite_styles', JSON.stringify(favoriteStyles));
  }, [favoriteStyles]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favoriteFonts));
  }, [favoriteFonts]);

  const allFonts = [...INITIAL_FONTS, ...googleFonts];
  const selectedFont = allFonts.find(f => f.id === selectedFontId) || INITIAL_FONTS[0];

  // Фильтрация шрифтов по кириллице
  const filteredFonts = onlyCyrillic
    ? allFonts.filter(f => {
        if (f.source !== 'google') return true;
        const subsets = f.subsets || [];
        return subsets.includes('cyrillic') || subsets.includes('cyrillic-ext');
      })
    : allFonts;

  // Фильтрация стилей
  const filteredStyles = showCyrillicStylesOnly
    ? UNICODE_STYLES.filter(s => s.supportsCyrillic)
    : UNICODE_STYLES;

  const displayedStyles = filteredStyles.slice(0, visibleStylesCount);
  const displayedFonts = filteredFonts.slice(0, visibleFontsCount);

  // Подгрузка CSS для видимых шрифтов
  useEffect(() => {
    if (activeTab !== 'fonts') return;
    const families = displayedFonts
      .filter(f => f.source === 'google')
      .map(f => f.family);
    loadGoogleFontsBatch(families, 25);
  }, [activeTab, displayedFonts]);

  // Отрисовка Canvas для PNG
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fontSize = 60;
    const fontDecl = `600 ${fontSize}px "${selectedFont.family}"`;
    ctx.font = fontDecl;
    
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width + 40;
    const textHeight = fontSize * 1.5 + 40;

    canvas.width = Math.max(textWidth, 300);
    canvas.height = Math.max(textHeight, 100);

    ctx.font = fontDecl;
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }, [text, selectedFont]);

  useEffect(() => {
    const timeout = setTimeout(drawCanvas, 50);
    return () => clearTimeout(timeout);
  }, [drawCanvas]);

  // Копирование Unicode-текста
  const copyStyledText = async (styleId: string) => {
    const styledText = applyStyle(text, styleId);
    try {
      if (navigator.clipboard && (window as any).isSecureContext) {
        await navigator.clipboard.writeText(styledText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = styledText;
        textarea.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }

      const tg = (window as any).Telegram;
      if (tg?.WebApp) {
        tg.WebApp.HapticFeedback.notificationOccurred('success');
        tg.WebApp.showAlert('Текст скопирован! Вставьте в Instagram.');
      } else {
        alert('Текст скопирован!');
      }
    } catch (err) {
      alert('Не удалось скопировать');
    }
  };

  // Поделиться PNG
  const shareImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const blob: Blob | null = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return;

    const file = new File([blob], `reels-text-${Date.now()}.png`, { type: 'image/png' });

    try {
      const navAny = navigator as any;
      if (typeof navAny.share === 'function') {
        await navAny.share({ files: [file], title: 'Reels Text' });
        return;
      }
    } catch (e) {}

    // Fallback: скачать
    const link = document.createElement('a');
    link.download = file.name;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const toggleFavoriteStyle = (id: string) => {
    setFavoriteStyles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const toggleFavoriteFont = (id: string) => {
    setFavoriteFonts(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header с полем ввода */}
      <Header text={text} onTextChange={setText} />

      {/* Заголовок раздела */}
      <div className="px-4 py-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {activeTab === 'calligraphy' && 'Каллиграфия'}
          {activeTab === 'fonts' && 'Шрифты'}
          {activeTab === 'favorites' && 'Избранное'}
        </h2>
        <div className="flex gap-2">
          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Фильтры */}
      {activeTab === 'calligraphy' && (
        <div className="px-4 pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input
              type="checkbox"
              checked={showCyrillicStylesOnly}
              onChange={(e) => setShowCyrillicStylesOnly(e.target.checked)}
              className="rounded accent-purple-500"
            />
            Только с поддержкой кириллицы
          </label>
        </div>
      )}

      {activeTab === 'fonts' && (
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
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {activeTab === 'calligraphy' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              {displayedStyles.map(style => (
                <StyleCard
                  key={style.id}
                  style={style}
                  text={text}
                  isSelected={selectedStyleId === style.id}
                  isFavorite={favoriteStyles.includes(style.id)}
                  onSelect={() => setSelectedStyleId(style.id)}
                  onToggleFavorite={() => toggleFavoriteStyle(style.id)}
                  onCopy={() => copyStyledText(style.id)}
                />
              ))}
            </div>
            {displayedStyles.length < filteredStyles.length && (
              <button
                onClick={() => setVisibleStylesCount(prev => prev + 20)}
                className="w-full mt-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium"
              >
                Показать ещё
              </button>
            )}
          </>
        )}

        {activeTab === 'fonts' && (
          <>
            {isLoadingFonts ? (
              <p className="text-center text-gray-400 py-10">Загружаю шрифты…</p>
            ) : (
              <>
                <div className="text-xs text-gray-500 mb-3 text-center">
                  Показано {displayedFonts.length} из {filteredFonts.length}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {displayedFonts.map(font => (
                    <FontCard
                      key={font.id}
                      font={font}
                      text={text}
                      isSelected={selectedFontId === font.id}
                      isFavorite={favoriteFonts.includes(font.id)}
                      onSelect={() => {
                        setSelectedFontId(font.id);
                        if (font.source === 'google') loadGoogleFont(font.family);
                      }}
                      onToggleFavorite={() => toggleFavoriteFont(font.id)}
                    />
                  ))}
                </div>
                {displayedFonts.length < filteredFonts.length && (
                  <button
                    onClick={() => setVisibleFontsCount(prev => prev + 40)}
                    className="w-full mt-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-medium"
                  >
                    Показать ещё
                  </button>
                )}
              </>
            )}

            {/* Кнопка экспорта PNG */}
            {selectedFontId && (
              <div className="fixed bottom-20 left-4 right-4 max-w-md mx-auto">
                <button
                  onClick={shareImage}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold text-lg shadow-lg"
                >
                  Поделиться PNG
                </button>
              </div>
            )}
          </>
        )}

        {activeTab === 'favorites' && (
          <>
            {favoriteStyles.length === 0 && favoriteFonts.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Нет избранных</p>
            ) : (
              <>
                {favoriteStyles.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Стили</h3>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      {UNICODE_STYLES.filter(s => favoriteStyles.includes(s.id)).map(style => (
                        <StyleCard
                          key={style.id}
                          style={style}
                          text={text}
                          isSelected={selectedStyleId === style.id}
                          isFavorite={true}
                          onSelect={() => setSelectedStyleId(style.id)}
                          onToggleFavorite={() => toggleFavoriteStyle(style.id)}
                          onCopy={() => copyStyledText(style.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
                {favoriteFonts.length > 0 && (
                  <>
                    <h3 className="text-sm font-bold text-gray-400 uppercase mb-3">Шрифты</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {allFonts.filter(f => favoriteFonts.includes(f.id)).map(font => (
                        <FontCard
                          key={font.id}
                          font={font}
                          text={text}
                          isSelected={selectedFontId === font.id}
                          isFavorite={true}
                          onSelect={() => {
                            setSelectedFontId(font.id);
                            if (font.source === 'google') loadGoogleFont(font.family);
                          }}
                          onToggleFavorite={() => toggleFavoriteFont(font.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* Скрытый Canvas для PNG */}
      <canvas ref={canvasRef} className="hidden" />

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
