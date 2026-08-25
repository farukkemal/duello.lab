import { useState, useEffect } from 'react';
import { useSignalR } from '../contexts/SignalRContext';
import {
  getFriendsList,
  getPendingFriendRequests,
  sendFriendRequest,
  respondFriendRequest,
  removeFriend,
  type Friend,
  type PendingFriendRequest
} from '../api/social';

interface FriendsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FriendsDrawer({ isOpen, onClose }: FriendsDrawerProps) {
  const { connection } = useSignalR();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<PendingFriendRequest[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'add'>('friends');
  const [addUsername, setAddUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = () => {
    getFriendsList().then(({ data }) => setFriends(data)).catch(console.error);
    getPendingFriendRequests().then(({ data }) => setPending(data)).catch(console.error);
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setLoading(true);
    setStatusMsg(null);
    try {
      await sendFriendRequest(addUsername.trim());
      setStatusMsg(`🎉 '${addUsername}' kullanıcısına istek gönderildi!`);
      setAddUsername('');
      loadData();
    } catch (err: any) {
      setStatusMsg(`❌ ${err.response?.data?.error || 'İstek gönderilemedi.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    try {
      await respondFriendRequest(friendshipId, accept);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemove = async (friendshipId: string) => {
    if (!confirm('Arkadaşı silmek istediğinize emin misiniz?')) return;
    try {
      await removeFriend(friendshipId);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleInviteToDuel = (targetUserId: string) => {
    if (!connection) return;
    connection.invoke('SendDuelInvite', targetUserId, 'TYT').catch(console.error);
    alert('⚔️ Düello daveti gönderildi!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤝</span>
            <h3 className="text-lg font-black text-white">Arkadaşlar & Sosyal</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-[#1b2046] p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'friends' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            Arkadaşlar ({friends.length})
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition relative ${
              activeTab === 'pending' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            İstekler
            {pending.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black">
                {pending.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'add' ? 'bg-violet-600 text-white shadow' : 'text-slate-400'
            }`}
          >
            + Arkadaş Ekle
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 min-h-[220px]">
          
          {/* TAB 1: FRIENDS LIST */}
          {activeTab === 'friends' && (
            <div className="space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Henüz arkadaş eklemedin. "+ Arkadaş Ekle" sekmesinden yeni arkadaşlar ekleyebilirsin!
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="bg-[#1b2046] border border-white/10 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px]">
                          <div className="w-full h-full bg-[#0d0f22] rounded-[10px] flex items-center justify-center font-black text-white text-xs">
                            {f?.username ? f.username.charAt(0).toUpperCase() : 'U'}
                          </div>
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#131631] ${
                          f.isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                        }`} />
                      </div>

                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{f?.username || 'Arkadaş'}</span>
                          <span className="text-[9px] text-amber-300 font-mono">Lv.{f.level}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {f.isOnline ? '🟢 Çevrimiçi' : '⚫ Çevrimdışı'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {f.isOnline && (
                        <button
                          onClick={() => handleInviteToDuel(f.userId)}
                          className="px-3 py-1.5 rounded-xl btn-game-gold font-black text-[10px] uppercase cursor-pointer"
                        >
                          ⚔️ Düello
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(f.friendshipId)}
                        className="text-slate-400 hover:text-rose-400 p-1 text-xs"
                        title="Arkadaşı Sil"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: PENDING REQUESTS */}
          {activeTab === 'pending' && (
            <div className="space-y-2">
              {pending.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Bekleyen arkadaşlık isteği yok.
                </div>
              ) : (
                pending.map((p) => (
                  <div
                    key={p.friendshipId}
                    className="bg-[#1b2046] border border-white/10 rounded-2xl p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-black text-white">{p.requesterUsername}</div>
                      <div className="text-[10px] text-amber-300 font-mono">Seviye {p.requesterLevel}</div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespond(p.friendshipId, false)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-400"
                      >
                        Reddet
                      </button>
                      <button
                        onClick={() => handleRespond(p.friendshipId, true)}
                        className="px-3 py-1.5 rounded-xl btn-game-success text-xs font-black text-white"
                      >
                        Kabul Et ✓
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ADD FRIEND */}
          {activeTab === 'add' && (
            <form onSubmit={handleSendRequest} className="space-y-3 pt-2">
              {statusMsg && (
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-center">
                  {statusMsg}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">
                  Kullanıcı Adı Gir
                </label>
                <input
                  type="text"
                  placeholder="örn: yks_canavari"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value)}
                  className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3.5 py-3 text-white text-xs font-bold focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !addUsername.trim()}
                className="w-full py-3.5 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Gönderiliyor...' : 'İstek Gönder ➔'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
