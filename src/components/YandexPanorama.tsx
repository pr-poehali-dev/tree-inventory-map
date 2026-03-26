interface Props {
  lat: number;
  lng: number;
  onClose: () => void;
}

export default function YandexPanorama({ lat, lng, onClose }: Props) {
  const src = `https://www.google.com/maps/embed/v1/streetview?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&location=${lat},${lng}&heading=0&pitch=0&fov=90`;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="relative w-full max-w-4xl h-[70vh] rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-white/90 hover:bg-white text-gray-700 rounded-full w-9 h-9 flex items-center justify-center shadow-lg text-lg font-bold transition-all"
        >
          ✕
        </button>
        <div className="absolute top-3 left-3 z-10 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5">
          👁 Street View · {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
        <iframe
          src={src}
          className="w-full h-full border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}
