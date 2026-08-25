import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getStoreProducts,
  buyCoinPack,
  buyStoreItem,
  openDailyChest,
  type StoreProduct,
  type DailyChestResult
} from '../api/store';
import { triggerPodiumConfetti, triggerLevelUpConfetti } from '../utils/confetti';
import MobileTopHUD from '../components/MobileTopHUD';
import MobileBottomNav, { type MobileTab } from '../components/MobileBottomNav';

export default function ShopPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Chest Modal state
  const [chestOpening, setChestOpening] = useState(false);
  const [chestResult, setChestResult] = useState<DailyChestResult | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    getStoreProducts()
      .then(({ data }) => setProducts(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleBuyPack = async (product: StoreProduct) => {
    setProcessingId(product.id);
    try {
      await buyCoinPack(product.id);
      await refreshUser();
      triggerLevelUpConfetti();
      showToast(`🎉 +${product.coinAmount + product.bonusCoins} Coin cüzdanınıza eklendi!`);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Satın alma işlemi başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleBuyItem = async (product: StoreProduct) => {
    if (!user) return;
    if (user.coinBalance < product.costCoins) {
      alert(`Yetersiz Coin! Bu eşya için ${product.costCoins} Coin gerekiyor. Bakiyeniz: ${user.coinBalance} Coin.`);
      return;
    }

    setProcessingId(product.id);
    try {
      await buyStoreItem(product.id);
      await refreshUser();
      triggerPodiumConfetti();
      showToast(`✨ "${product.name}" başarıyla satın alındı! (+25 XP)`);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Satın alma işlemi başarısız.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenDailyChest = async () => {
    if (chestOpening) return;
    setChestOpening(true);
    try {
      const { data } = await openDailyChest();
      await refreshUser();
      triggerPodiumConfetti();
      setChestResult(data);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Sandık açılamadı.');
    } finally {
      setChestOpening(false);
    }
  };

  const handleNavTab = (tab: MobileTab) => {
    if (tab === 'magaza') return;
    if (tab === 'klan') {
      navigate('/clan');
    } else {
      navigate(`/dashboard?tab=${tab}`, { state: { tab } });
    }
  };

  const coinPacks = products.filter((p) => p.category === 'coins');
  const items = products.filter((p) => p.category === 'powerup' || p.category === 'cosmetic');

  return (
    <div className="h-screen h-[100dvh] bg-[#060710] flex justify-center overflow-hidden">
      <div className="w-full max-w-md mobile-app-shell flex flex-col relative overflow-hidden">
        
        {/* Top Game HUD */}
        <MobileTopHUD />

        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-violet-600 to-cyan-500 border border-white/20 text-white px-4 py-2 rounded-2xl shadow-2xl text-xs font-black animate-bounce whitespace-nowrap">
            {toastMessage}
          </div>
        )}

        {/* Main Store Content */}
        <main className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar pb-6 space-y-5 animate-fadeIn">
          
          {/* Header Banner */}
          <div className="text-center pt-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider mb-1.5">
              <span>🛒 ARENA MAĞAZASI</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Coin ve Güçlendirmeler
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Düello odaları aç, XP çarpanlarını aktifleştir ve öne geç!
            </p>
          </div>

          {/* 1. MYSTERY DAILY CHEST (FREE REWARD) */}
          <div className="bg-gradient-to-r from-amber-500/20 via-purple-600/25 to-cyan-500/20 border-2 border-amber-400/40 rounded-3xl p-5 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

            <div className="text-4xl mb-1 animate-bounce-subtle">🎁</div>
            <h3 className="text-base font-black text-amber-300 uppercase tracking-wider">
              Ücretsiz Günlük Sandık
            </h3>
            <p className="text-[11px] text-slate-300 mt-0.5 max-w-xs mx-auto">
              Günün sürpriz ödülünü aç! 50-150 Coin ve ekstra XP şansı.
            </p>

            <button
              onClick={handleOpenDailyChest}
              disabled={chestOpening}
              className="mt-4 w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg active:scale-95 transition-transform"
            >
              {chestOpening ? 'Sandık Açılıyor...' : '✨ Ücretsiz Sandığı Aç'}
            </button>
          </div>

          {/* 2. COIN BUNDLES SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>🪙</span> <span>Coin Paketleri</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Bakiye: {user?.coinBalance} 💰</span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Mağaza ürünleri yükleniyor...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {coinPacks.map((pack) => {
                  const isProcessing = processingId === pack.id;
                  const totalCoins = pack.coinAmount + pack.bonusCoins;

                return (
                  <div
                    key={pack.id}
                    className="game-card-3d p-4 flex flex-col justify-between text-center relative overflow-hidden group"
                  >
                    {pack.tag && (
                      <span className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[8px] px-1.5 py-0.5 rounded-md shadow">
                        {pack.tag}
                      </span>
                    )}

                    <div className="pt-2">
                      <div className="text-3xl mb-1 group-hover:scale-110 transition-transform">
                        {pack.icon}
                      </div>
                      <h4 className="text-xs font-black text-white">{pack.name}</h4>
                      <div className="text-lg font-black text-amber-300 font-mono mt-1">
                        {totalCoins} <span className="text-xs text-amber-400">💰</span>
                      </div>
                      {pack.bonusCoins > 0 && (
                        <span className="text-[9px] font-bold text-emerald-400 block font-mono">
                          +{pack.bonusCoins} Bonus!
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleBuyPack(pack)}
                      disabled={isProcessing}
                      className="mt-3 w-full py-2.5 rounded-xl btn-game-gold font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? '...' : pack.priceTry === 0 ? 'ÜCRETSİZ AL' : `${pack.priceTry.toFixed(2)} ₺`}
                    </button>
                  </div>
                );
              })}
            </div>
            )}
          </div>

          {/* 3. ITEMS & POWERUPS SECTION */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span> <span>Güçlendiriciler ve Eşyalar</span>
              </h3>
            </div>

            <div className="space-y-2.5">
              {items.map((item) => {
                const isProcessing = processingId === item.id;
                const canAfford = (user?.coinBalance ?? 0) >= item.costCoins;

                return (
                  <div
                    key={item.id}
                    className="game-card-3d p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-2xl shrink-0">
                        {item.icon}
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{item.name}</span>
                          <span className="text-[8px] bg-violet-600/30 border border-violet-500/40 text-violet-300 px-1.5 py-0.2 rounded font-bold">
                            {item.tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleBuyItem(item)}
                      disabled={isProcessing || !canAfford}
                      className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase shrink-0 cursor-pointer disabled:opacity-40 transition-transform active:scale-95 ${
                        canAfford ? 'btn-game-primary text-white' : 'bg-slate-800 text-slate-500 border border-white/5'
                      }`}
                    >
                      {isProcessing ? '...' : `${item.costCoins} 💰`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </main>

        {/* Bottom Nav */}
        <MobileBottomNav activeTab="magaza" onSelectTab={handleNavTab} />

        {/* DAILY CHEST REWARD POPUP MODAL */}
        {chestResult && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-sm bg-[#141738] border-2 border-amber-400 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-subtle-pulse">
              <div className="text-6xl animate-bounce">👑</div>

              <div>
                <h3 className="text-2xl font-black text-amber-300 uppercase">
                  Tebrikler!
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Günlük sandıktan muazzam ödüller kazandın!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 py-2">
                <div className="bg-amber-500/20 border border-amber-500/40 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-amber-300 font-mono">
                    +{chestResult.coinsWon}
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase">Coin</div>
                </div>

                <div className="bg-violet-500/20 border border-violet-500/40 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-violet-300 font-mono">
                    +{chestResult.xpWon}
                  </div>
                  <div className="text-[10px] font-bold text-slate-300 uppercase">XP Puanı</div>
                </div>
              </div>

              <button
                onClick={() => setChestResult(null)}
                className="w-full py-4 rounded-2xl btn-game-gold font-black text-sm uppercase cursor-pointer"
              >
                Harika! Devam Et ➔
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
