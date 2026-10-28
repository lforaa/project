import { useState } from 'react';
import { ZoomIn } from 'lucide-react';

interface PhotoGalleryProps {
  images: string[];
  productName: string;
}

export function PhotoGallery({ images, productName }: PhotoGalleryProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zooming, setZooming] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  if (images.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200">
        <p className="text-slate-400">Bu ürün için fotoğraf bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 cursor-zoom-in group"
        onMouseEnter={() => setZooming(true)}
        onMouseLeave={() => setZooming(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={images[activeIdx]}
          alt={productName}
          className="w-full h-full object-cover transition-transform duration-300"
          style={
            zooming
              ? {
                  transform: `scale(2)`,
                  transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                }
              : undefined
          }
          draggable={false}
        />
        <div className="absolute top-4 right-4 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <ZoomIn className="w-3.5 h-3.5" />
          Detay için fareyi gezdirin
        </div>
      </div>

      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                i === activeIdx
                  ? 'border-slate-800 ring-2 ring-slate-300'
                  : 'border-slate-200 hover:border-slate-400'
              }`}
            >
              <img src={img} alt={`${productName} ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
