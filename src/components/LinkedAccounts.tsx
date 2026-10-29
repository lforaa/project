import { useEffect, useState } from 'react';
import { Link2, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { linksApi, LinkProvider, OrderRequirements } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const MESSAGES: Record<string, string> = {
  steam_ok: 'Steam hesabınız bağlandı.',
  discord_ok: 'Discord hesabınız bağlandı.',
  error_taken: 'Bu hesap başka bir kullanıcıya bağlı.',
  error_state: 'Bağlantı isteğinin süresi doldu, lütfen tekrar deneyin.',
  error_steam: 'Steam doğrulaması başarısız oldu.',
  error_discord: 'Discord doğrulaması başarısız oldu ya da iptal edildi.',
};

export function LinkedAccounts({ requirements }: { requirements: OrderRequirements }) {
  const { profile } = useAuth();
  const [busy, setBusy] = useState<LinkProvider | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Bağlama dönüşünde adres "?link=steam_ok" gibi gelir; mesajı göster, adresi temizle.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('link');
    if (!code) return;
    window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    setMsg({ ok: code.endsWith('_ok'), text: MESSAGES[code] ?? 'Bilinmeyen sonuç.' });
  }, []);

  if (!requirements.require_steam && !requirements.require_discord) return null;

  const rows: { key: LinkProvider; label: string; linked: boolean; detail: string; required: boolean }[] = [
    { key: 'steam', label: 'Steam', linked: !!profile?.steam_id, detail: profile?.steam_id ? `SteamID: ${profile.steam_id}` : '', required: requirements.require_steam },
    { key: 'discord', label: 'Discord', linked: !!profile?.discord_id, detail: profile?.discord_name || '', required: requirements.require_discord },
  ];
  const missing = rows.filter(r => r.required && !r.linked).map(r => r.label);

  async function connect(provider: LinkProvider) {
    setBusy(provider);
    setMsg(null);
    try {
      const { url } = await linksApi.start(provider);
      window.location.href = url;
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
      setBusy(null);
    }
  }

  async function disconnect(provider: LinkProvider) {
    setBusy(provider);
    try {
      await linksApi.unlink(provider);
      window.location.reload();
    } catch (err: any) {
      setMsg({ ok: false, text: err.message });
      setBusy(null);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 className="font-semibold text-slate-900 mb-1">Hesap Bağlantıları</h3>
      <p className="text-sm text-slate-500 mb-4">
        {missing.length > 0
          ? `Sipariş verebilmek için ${missing.join(' ve ')} hesabınızı bağlamanız gerekiyor.`
          : 'Gerekli hesaplarınız bağlı, siparişi tamamlayabilirsiniz.'}
      </p>

      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 text-sm">{r.label}</span>
                {r.required && <span className="text-[10px] font-semibold uppercase tracking-wide rounded bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5">Zorunlu</span>}
              </div>
              {r.linked && (
                <p className="flex items-center gap-1 text-xs text-emerald-600 mt-0.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Bağlı{r.detail ? ` · ${r.detail}` : ''}
                </p>
              )}
            </div>
            {r.linked ? (
              <button type="button" onClick={() => disconnect(r.key)} disabled={busy !== null} title="Bağlantıyı kaldır"
                className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors">
                {busy === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            ) : (
              <button type="button" onClick={() => connect(r.key)} disabled={busy !== null}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
                {busy === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                Bağla
              </button>
            )}
          </div>
        ))}
      </div>

      {msg && (
        <div className={`mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {msg.text}
        </div>
      )}
    </div>
  );
}