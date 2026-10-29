import { useEffect, useState } from 'react';
import { Product, getModelSignedUrl } from '@/lib/api';
import { getModelThumbnail } from '@/lib/modelThumbnail';

export function useModelThumbnails(products: Product[]) {
  const [thumbs, setThumbs] = useState<Record<number, string[]>>({});
  const [failed, setFailed] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const targets = products.filter((p) => p.has_3d_model && p.model_url);

    (async () => {
      for (const p of targets) {
        if (cancelled) return;
        try {
          const url = await getModelSignedUrl(p.model_url!);
          if (!url) throw new Error('Model URL bulunamadı');
          const img = await getModelThumbnail(url);
          if (!cancelled) setThumbs((t) => ({ ...t, [p.id]: img }));
        } catch (err) {
          console.warn(`Küçük resim üretilemedi (ürün ${p.id}):`, err);
          if (!cancelled) setFailed((f) => new Set(f).add(p.id));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [products]);

  return { thumbs, failed };
}