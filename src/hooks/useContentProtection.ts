import { useEffect, useState } from 'react';

interface ProtectionState {
  blurred: boolean;
  devtoolsOpen: boolean;
}

export function useContentProtection(enabled: boolean, watermarkText: string) {
  const [state, setState] = useState<ProtectionState>({ blurred: false, devtoolsOpen: false });

  useEffect(() => {
    if (!enabled) return;

    const blockContextMenu = (e: MouseEvent) => e.preventDefault();
    const blockDragStart = (e: DragEvent) => e.preventDefault();
    const blockSelect = (e: Event) => e.preventDefault();

    const blockKeys = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        (ctrl && ['s', 'p', 'u'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (ctrl && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()))
      ) {
        e.preventDefault();
        setState(s => ({ ...s, blurred: true }));
        setTimeout(() => setState(s => ({ ...s, blurred: false })), 2000);
      }
    };

    const threshold = 200;
    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const open = widthDiff > threshold || heightDiff > threshold;
      setState(s => ({ ...s, devtoolsOpen: open, blurred: open }));
    };

    const onVisibility = () => {
      if (document.hidden) {
        setState(s => ({ ...s, blurred: true }));
      } else {
        setState(s => ({ ...s, blurred: false }));
      }
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('dragstart', blockDragStart);
    document.addEventListener('selectstart', blockSelect);
    document.addEventListener('keydown', blockKeys);
    document.addEventListener('visibilitychange', onVisibility);
    const devtoolsInterval = setInterval(checkDevTools, 2000);

    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('dragstart', blockDragStart);
      document.removeEventListener('selectstart', blockSelect);
      document.removeEventListener('keydown', blockKeys);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(devtoolsInterval);
    };
  }, [enabled]);

  return state;
}
