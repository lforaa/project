import { useEffect, useState } from 'react';

interface WatermarkProps {
  text: string;
}

export function Watermark({ text }: WatermarkProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let raf: number;
    const animate = () => {
      setOffset(o => (o + 0.3) % 200);
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, []);

  const tiles: { x: number; y: number }[] = [];
  for (let y = -100; y < 800; y += 160) {
    for (let x = -100; x < 1200; x += 300) {
      tiles.push({ x: x + offset, y: y + (x % 2 === 0 ? 0 : 80) });
    }
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {tiles.map((tile, i) => (
        <div
          key={i}
          className="absolute whitespace-nowrap text-[11px] font-medium text-white/15 select-none"
          style={{
            left: `${tile.x}px`,
            top: `${tile.y}px`,
            transform: 'rotate(-25deg)',
          }}
        >
          {text}
        </div>
      ))}
    </div>
  );
}
