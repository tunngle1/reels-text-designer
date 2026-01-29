import React, { useState, useEffect } from 'react';
import { Font, Tab } from './types';
import { STORAGE_KEYS } from './constants';
import { fetchGoogleFonts, loadGoogleFont, loadGoogleFontsBatch, GoogleFont } from './googleFontsApi';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('calligraphy');
  const [text, setText] = useState('Привет');
  const [selectedFontId, setSelectedFontId] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [googleFonts, setGoogleFonts] = useState<Font[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [fontsReady, setFontsReady] = useState(0);

  // Загрузка шрифтов
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const fonts = await fetchGoogleFonts();
        const converted: Font[] = fonts.map((gf: GoogleFont) => ({
          id: `g_${gf.family.replace(/\s+/g, '_').toLowerCase()}`,
          name: gf.family,
          family: gf.family,
          source: 'google' as const,
          subsets: gf.subsets,
          category: gf.category,
        }));
        setGoogleFonts(converted);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    const saved = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (saved) setFavorites(JSON.parse(saved));

    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.ready();
      tg.WebApp.expand();
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  }, [favorites]);

  // Фильтрация: только с кириллицей
  const cyrillicFonts = googleFonts.filter(f => {
    const s = f.subsets || [];
    return s.includes('cyrillic') || s.includes('cyrillic-ext');
  });

  // Каллиграфия = handwriting с кириллицей
  const calligraphyFonts = cyrillicFonts.filter(f => f.category === 'handwriting');
  // Шрифты = остальные с кириллицей
  const regularFonts = cyrillicFonts.filter(f => f.category !== 'handwriting');

  const currentList = activeTab === 'calligraphy' ? calligraphyFonts
    : activeTab === 'fonts' ? regularFonts
    : cyrillicFonts.filter(f => favorites.includes(f.id));

  const displayed = currentList.slice(0, visibleCount);

  // Подгрузка CSS
  useEffect(() => {
    if (displayed.length === 0) return;
    const families = displayed.map(f => f.family);
    loadGoogleFontsBatch(families, 20).then(() => setFontsReady(n => n + 1));
  }, [displayed.map(f => f.id).join(',')]);

  const selectedFont = cyrillicFonts.find(f => f.id === selectedFontId);

  // ========== КОПИРОВАНИЕ СТИКЕРА ==========
  const copySticker = async () => {
    if (!selectedFont || isCopying || !text.trim()) return;
    setIsCopying(true);

    try {
      await loadGoogleFont(selectedFont.family);
      await new Promise(r => setTimeout(r, 100));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const fontSize = 72;
      const padding = 30;

      ctx.font = `600 ${fontSize}px "${selectedFont.family}", sans-serif`;
      const lines = text.split('\n');
      let maxW = 0;
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxW) maxW = w;
      }

      canvas.width = Math.ceil(maxW + padding * 2);
      canvas.height = Math.ceil(lines.length * fontSize * 1.3 + padding * 2);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = `600 ${fontSize}px "${selectedFont.family}", sans-serif`;
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], canvas.width / 2, padding + i * fontSize * 1.3);
      }

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'));
      if (!blob) throw new Error('Blob fail');

      const file = new File([blob], 'sticker.png', { type: 'image/png' });

      // Share API — это то, что работало раньше
      const nav = navigator as any;
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file] });
        return;
      }

      // Fallback: сохраняем PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'sticker.png';
      a.click();
      URL.revokeObjectURL(url);
      
      const tg = (window as any).Telegram;
      if (tg?.WebApp) {
        tg.WebApp.showAlert('PNG сохранён.');
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка: ' + (e as any)?.message);
    } finally {
      setIsCopying(false);
    }
  };

  const toggleFav = (id: string) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Поле ввода */}
      <div className="p-4">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Введите текст..."
          className="w-full p-4 rounded-2xl bg-white/10 border border-white/20 text-white text-xl"
        />
      </div>

      {/* Превью */}
      <div className="px-4 pb-4">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 min-h-[120px] flex items-center justify-center">
          <div
            key={fontsReady}
            className="text-white text-center break-words"
            style={{
              fontFamily: selectedFont ? `"${selectedFont.family}", sans-serif` : 'sans-serif',
              fontSize: 48,
              fontWeight: 600,
            }}
          >
            {text || 'Выбери шрифт'}
          </div>
        </div>

        {/* Кнопка копирования */}
        <button
          onClick={copySticker}
          disabled={!selectedFont || isCopying}
          className={`w-full mt-4 py-4 rounded-2xl font-bold text-lg ${
            selectedFont && !isCopying
              ? 'bg-gradient-to-r from-purple-600 to-pink-600'
              : 'bg-gray-700 text-gray-400'
          }`}
        >
          {isCopying ? 'Создаю...' : 'Скопировать стикер'}
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex border-b border-white/10">
        {(['calligraphy', 'fonts', 'favorites'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setVisibleCount(40); }}
            className={`flex-1 py-3 text-sm font-medium ${activeTab === tab ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500'}`}
          >
            {tab === 'calligraphy' ? 'Каллиграфия' : tab === 'fonts' ? 'Шрифты' : 'Избранное'}
          </button>
        ))}
      </div>

      {/* Список шрифтов */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {isLoading ? (
          <p className="text-center text-gray-500 py-10">Загрузка...</p>
        ) : currentList.length === 0 ? (
          <p className="text-center text-gray-500 py-10">
            {activeTab === 'favorites' ? 'Нет избранных' : 'Нет шрифтов'}
          </p>
        ) : (
          <>
            <p className="text-xs text-gray-500 text-center mb-3">
              {displayed.length} из {currentList.length}
            </p>
            <div className="grid grid-cols-2 gap-3" key={fontsReady}>
              {displayed.map(font => (
                <div
                  key={font.id}
                  onClick={() => {
                    setSelectedFontId(font.id);
                    loadGoogleFont(font.family);
                  }}
                  className={`p-4 rounded-2xl cursor-pointer border ${
                    selectedFontId === font.id
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] text-gray-400 uppercase truncate pr-2">{font.name}</span>
                    <button
                      onClick={e => { e.stopPropagation(); toggleFav(font.id); }}
                      className={favorites.includes(font.id) ? 'text-pink-500' : 'text-gray-600'}
                    >
                      ♥
                    </button>
                  </div>
                  <div
                    className="text-white text-xl min-h-[50px]"
                    style={{ fontFamily: `"${font.family}", sans-serif` }}
                  >
                    {text || font.name}
                  </div>
                </div>
              ))}
            </div>
            {displayed.length < currentList.length && (
              <button
                onClick={() => setVisibleCount(n => n + 40)}
                className="w-full mt-4 py-3 rounded-2xl bg-white/10 text-white"
              >
                Показать ещё
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;
