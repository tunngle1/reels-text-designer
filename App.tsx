import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Font, Tab } from './types';
import { INITIAL_FONTS, STORAGE_KEYS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('calligraphy');
  const [text, setText] = useState('Привет');
  const [selectedFontId, setSelectedFontId] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [myskotomFonts, setMyskotomFonts] = useState<Font[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);
  const [fontsReady, setFontsReady] = useState(0);
  const loadedFontFamiliesRef = useRef<Set<string>>(new Set());

  // Загрузка шрифтов
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const res = await fetch('/myskotom-index.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Failed to load myskotom-index.json: ${res.status}`);
        const data = await res.json();
        const items: Font[] = Array.isArray(data?.items) ? data.items : [];
        setMyskotomFonts(items);
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

  const allFonts = useMemo(() => {
    return [...INITIAL_FONTS, ...myskotomFonts];
  }, [myskotomFonts]);

  const calligraphyFonts = useMemo(() => {
    // Эвристика: всё, что похоже на рукописные/каллиграфию
    const want = new Set(['рукописный', 'каллиграфия', 'каллиграфический']);
    return allFonts.filter((f) => {
      if (f.source !== 'myskotom') return false;
      const type = (f.tags?.type || []).join(' ').toLowerCase();
      const mood = (f.tags?.mood || []).join(' ').toLowerCase();
      return Array.from(want).some((k) => type.includes(k) || mood.includes(k));
    });
  }, [allFonts]);

  const regularFonts = useMemo(() => {
    const calligraphyIds = new Set(calligraphyFonts.map((f) => f.id));
    return allFonts.filter((f) => f.source !== 'myskotom' || !calligraphyIds.has(f.id));
  }, [allFonts, calligraphyFonts]);

  const currentList = activeTab === 'calligraphy' ? calligraphyFonts
    : activeTab === 'fonts' ? regularFonts
    : allFonts.filter(f => favorites.includes(f.id));

  const displayed = currentList.slice(0, visibleCount);

  const selectedFont = allFonts.find(f => f.id === selectedFontId);

  const ensureFontLoaded = async (font: Font) => {
    if (font.source !== 'myskotom') return;
    if (!font.tproductUrl) return;
    if (loadedFontFamiliesRef.current.has(font.family)) return;

    const res = await fetch(`/api/font?tproduct=${encodeURIComponent(font.tproductUrl)}`);
    if (!res.ok) throw new Error(`Failed to download font: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    try {
      const face = new FontFace(font.family, `url(${url})`);
      await face.load();
      (document as any).fonts.add(face);
      loadedFontFamiliesRef.current.add(font.family);
      setFontsReady((n) => n + 1);
    } finally {
      // keep object URL alive briefly; FontFace should have loaded the data
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    }
  };

  const showMsg = (message: string) => {
    const tg = (window as any).Telegram;
    if (tg?.WebApp) {
      tg.WebApp.showAlert(message);
      return;
    }
    alert(message);
  };

  const openInExternalBrowser = () => {
    const tg = (window as any).Telegram;
    const href = window.location.href;
    if (tg?.WebApp?.openLink) {
      tg.WebApp.openLink(href);
      return;
    }
    window.open(href, '_blank');
  };

  const isTelegramWebView = () => {
    const tg = (window as any).Telegram;
    if (tg?.WebApp) return true;
    const ua = navigator.userAgent || '';
    return ua.toLowerCase().includes('telegram');
  };

  const canCopyStickerToClipboard = () => {
    return (window as any).isSecureContext === true &&
      typeof (window as any).ClipboardItem === 'function' &&
      !!navigator.clipboard &&
      typeof (navigator.clipboard as any).write === 'function';
  };

  const getCopyBlockReason = () => {
    if (isTelegramWebView()) return 'TELEGRAM_WEBVIEW';
    if ((window as any).isSecureContext !== true) return 'NOT_HTTPS';
    if (typeof (window as any).ClipboardItem !== 'function') return 'NO_CLIPBOARD_ITEM';
    if (!navigator.clipboard || typeof (navigator.clipboard as any).write !== 'function') return 'NO_CLIPBOARD_WRITE';
    return null;
  };

  const buildStickerPng = async (): Promise<{ blob: Blob; file: File }> => {
    if (!selectedFont) throw new Error('No font selected');

    await ensureFontLoaded(selectedFont);
    await new Promise(r => setTimeout(r, 50));

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unsupported');

    const fontSize = 72;
    const padding = 30;

    ctx.font = `600 ${fontSize}px "${selectedFont.family}", sans-serif`;
    const lines = text.split('\n');
    let maxW = 0;
    for (const line of lines) {
      const w = ctx.measureText(line).width;
      if (w > maxW) maxW = w;
    }

    canvas.width = Math.max(200, Math.ceil(maxW + padding * 2));
    canvas.height = Math.max(120, Math.ceil(lines.length * fontSize * 1.3 + padding * 2));

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
    return { blob, file };
  };

  // Кнопка 1: КОПИРОВАТЬ (PNG в буфер). На iOS/Telegram это может быть запрещено или “успешно”, но фактически не вставляться.
  const copySticker = async () => {
    if (!selectedFont || isCopying || !text.trim()) return;
    setIsCopying(true);

    try {
      const reason = getCopyBlockReason();
      if (reason) {
        if (reason === 'TELEGRAM_WEBVIEW') {
          showMsg(
            'В Telegram WebView iOS копирование PNG в буфер (для вставки как стикер) обычно заблокировано.\n\n' +
            'Сейчас открою эту же страницу во внешнем браузере (Safari/Chrome) — там шанс вставки как стикер максимальный.'
          );
          openInExternalBrowser();
          return;
        }
        if (reason === 'NOT_HTTPS') {
          showMsg('Для копирования PNG-стикера нужен HTTPS. Открой приложение по https:// и попробуй снова.');
          return;
        }
        showMsg('Этот браузер не поддерживает копирование PNG-изображений в буфер как стикер. Открой в Safari/Chrome и попробуй снова.');
        return;
      }

      const { blob } = await buildStickerPng();

      await (navigator.clipboard as any).write([
        new (window as any).ClipboardItem({ 'image/png': blob })
      ]);

      showMsg('Стикер скопирован (PNG с прозрачностью). Открой Instagram и вставь из буфера.');
    } catch (e) {
      console.error(e);
      const err: any = e;
      const name = String(err?.name || '');
      const msg = String(err?.message || '');
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        showMsg(
          'Копирование PNG в буфер заблокировано браузером.\n\n' +
          'Решение: открой эту страницу во внешнем Safari/Chrome (и по HTTPS), затем нажми «Копировать».\n\n' +
          `Ошибка: ${name}${msg ? `: ${msg}` : ''}`
        );
        return;
      }
      showMsg(
        'Не удалось скопировать PNG-стикер в буфер.\n\n' +
        `Ошибка: ${name}${msg ? `: ${msg}` : ''}\n` +
        'Попробуй открыть в Safari/Chrome (по HTTPS) и повторить.'
      );
    } finally {
      setIsCopying(false);
    }
  };

  // Кнопка 2: ПОДЕЛИТЬСЯ (самый стабильный путь на iOS/Telegram)
  const shareSticker = async () => {
    if (!selectedFont || isCopying || !text.trim()) return;
    setIsCopying(true);

    try {
      const { blob, file } = await buildStickerPng();
      const nav = navigator as any;

      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
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
      showMsg('PNG сохранён. Открой его и отправь в Instagram.');
    } catch (e) {
      console.error(e);
      showMsg('Не удалось создать PNG. Попробуй ещё раз.');
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

        {/* Две кнопки как раньше: Копировать / Поделиться */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={copySticker}
            disabled={!selectedFont || isCopying}
            className={`py-4 rounded-2xl font-bold text-base ${
              selectedFont && !isCopying
                ? 'bg-white/10 border border-white/20 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {isCopying ? '...' : 'Копировать'}
          </button>
          <button
            onClick={shareSticker}
            disabled={!selectedFont || isCopying}
            className={`py-4 rounded-2xl font-bold text-base ${
              selectedFont && !isCopying
                ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {isCopying ? '...' : 'Поделиться'}
          </button>
        </div>

        {/* Помощь для Telegram WebView/iOS */}
        {!canCopyStickerToClipboard() && (
          <button
            onClick={openInExternalBrowser}
            className="w-full mt-3 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm text-gray-200"
          >
            Открыть в Safari/Chrome для копирования стикера
          </button>
        )}
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
                    ensureFontLoaded(font).catch(() => {});
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
