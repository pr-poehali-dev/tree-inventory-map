import { useEffect, useRef } from 'react';

interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

declare global {
  interface Window {
    ymaps: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  }
}

export default function YandexPanorama({ lat, lng, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadAndInit = async () => {
      if (!window.ymaps) {
        await new Promise<void>((resolve, reject) => {
          if (document.querySelector('script[data-ymaps]')) {
            const wait = setInterval(() => {
              if (window.ymaps) { clearInterval(wait); resolve(); }
            }, 50);
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://api-maps.yandex.ru/2.1/?apikey=afad5f2c-891b-43e8-bf0f-01dcf67a93a1&lang=ru_RU';
          script.setAttribute('data-ymaps', '1');
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
      }

      await new Promise<void>(resolve => window.ymaps.ready(resolve));

      if (!containerRef.current) return;

      const player = new window.ymaps.panorama.Player(containerRef.current, {
        point: [lng, lat],
        direction: [0, 0],
      });

      return () => { player.destroy(); };
    };

    const cleanup = loadAndInit();
    return () => { cleanup.then(fn => fn?.()); };
  }, [lat, lng]);

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70">
      <div className="relative w-full max-w-4xl h-[70vh] rounded-2xl overflow-hidden shadow-2xl bg-black">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 rounded-full w-9 h-9 flex items-center justify-center shadow-lg text-lg font-bold transition-all"
        >
          ✕
        </button>
        <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg">
          Яндекс Панорама · {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  );
}
