import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSignalR } from '../contexts/SignalRContext';
import { useViewMode } from '../contexts/ViewModeContext';
import {
  getMyClan,
  getTopClans,
  searchClans,
  createClan,
  joinClan,
  leaveClan,
  getClanMessages,
  sendClanMessage,
  type Clan,
  type ClanListItem,
  type ClanMessage
} from '../api/social';
import { triggerLevelUpConfetti } from '../utils/confetti';
import MobileTopHUD from '../components/MobileTopHUD';
import MobileBottomNav, { type MobileTab } from '../components/MobileBottomNav';
import DesktopNavbar from '../components/DesktopNavbar';
import DesktopClanView from '../components/desktop/DesktopClanView';
import ViewModeToggle from '../components/ViewModeToggle';

export default function ClanPage() {
  const { user, refreshUser } = useAuth();
  const { connection } = useSignalR();
  const { isDesktop } = useViewMode();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'my_clan' | 'search' | 'leaderboard'>('my_clan');
  const [clanSubTab, setClanSubTab] = useState<'chat' | 'info'>('chat');
  const [myClan, setMyClan] = useState<Clan | null>(null);
  const [topClans, setTopClans] = useState<ClanListItem[]>([]);
  const [searchResults, setSearchResults] = useState<ClanListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Clan Chat State
  const [messages, setMessages] = useState<ClanMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('YKS');
  const [badgeIcon, setBadgeIcon] = useState('🛡️');
  const [minLevel, setMinLevel] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatMessages = async (clanId: string) => {
    setChatLoading(true);
    try {
      const { data } = await getClanMessages(clanId, 50);
      setMessages(data);
      setTimeout(scrollToBottom, 100);
    } catch (e) {
      console.error('Failed to load clan messages:', e);
    } finally {
      setChatLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [myClanRes, topRes] = await Promise.all([
        getMyClan(),
        getTopClans(20)
      ]);
      setMyClan(myClanRes.data);
      setTopClans(topRes.data);
      setSearchResults(topRes.data);

      if (myClanRes.data) {
        loadChatMessages(myClanRes.data.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // SignalR Real-time Clan Chat Listener
  useEffect(() => {
    if (!connection || !myClan) return;

    // Join clan chat group
    connection.invoke('JoinClanChat', myClan.id).catch(console.error);

    const handleIncomingMessage = (msg: ClanMessage) => {
      if (msg.clanId === myClan.id) {
        setMessages((prev) => [...prev, msg]);
        setTimeout(scrollToBottom, 100);
      }
    };

    connection.on('ClanMessageReceived', handleIncomingMessage);

    return () => {
      connection.off('ClanMessageReceived', handleIncomingMessage);
      connection.invoke('LeaveClanChat', myClan.id).catch(console.error);
    };
  }, [connection, myClan?.id]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInput).trim();
    if (!text || !myClan || sendingMsg) return;

    setSendingMsg(true);
    try {
      await sendClanMessage(myClan.id, text);
      setChatInput('');
      setTimeout(scrollToBottom, 100);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Mesaj gönderilemedi.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await searchClans(searchQuery);
      setSearchResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateClan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);
    try {
      const { data } = await createClan({
        name,
        description,
        tag,
        badgeIcon,
        minLevel,
        isOpen
      });
      setMyClan(data);
      setShowCreateModal(false);
      triggerLevelUpConfetti();
      await refreshUser();
      await loadData();
    } catch (err: any) {
      setCreateError(err.response?.data?.error || 'Klan kurulamadı.');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinClan = async (clanId: string) => {
    try {
      const { data } = await joinClan(clanId);
      setMyClan(data);
      setActiveTab('my_clan');
      triggerLevelUpConfetti();
      await refreshUser();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Klana katılınamadı.');
    }
  };

  const handleLeaveClan = async () => {
    if (!myClan) return;
    if (!confirm('Klandan ayrılmak istediğinize emin misiniz?')) return;
    try {
      await leaveClan(myClan.id);
      setMyClan(null);
      await refreshUser();
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNavTab = (tab: MobileTab) => {
    if (tab === 'klan') return;
    if (tab === 'magaza') {
      navigate('/shop');
    } else {
      navigate(`/dashboard?tab=${tab}`, { state: { tab } });
    }
  };

  const badgeIcons = ['🛡️', '🔥', '⚡', '👑', '🦅', '🦁', '⚔️', '💎'];

  // ==========================================
  // DESKTOP CLAN VIEWPORT RENDER
  // ==========================================
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-[#060710] text-slate-100 flex flex-col relative overflow-x-hidden">
        {/* Desktop Navbar */}
        <DesktopNavbar activeTab="klan" onSelectTab={handleNavTab} />

        {/* Desktop Clan Page Body */}
        <main className="flex-1 pb-10">
          <DesktopClanView
            myClan={myClan}
            user={user}
            messages={messages}
            chatLoading={chatLoading}
            sendingMsg={sendingMsg}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSendMessage={handleSendMessage}
            onLeaveClan={handleLeaveClan}
            onRefreshMessages={() => myClan && loadChatMessages(myClan.id)}
            onOpenCreateModal={() => setShowCreateModal(true)}
            messagesEndRef={messagesEndRef}
          />
        </main>

        {/* CREATE MODAL (DESKTOP) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-lg font-black text-white">Yeni Çalışma Loncası Kur</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {createError && (
                <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs rounded-xl p-2.5 font-bold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateClan} className="space-y-3.5">
                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Klan Adı</label>
                  <input
                    type="text"
                    placeholder="örn: Sayısal Gladyatörleri"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Etiket (Tag)</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="FEN"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toUpperCase())}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold font-mono uppercase focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Min. Seviye</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={minLevel}
                      onChange={(e) => setMinLevel(Number(e.target.value))}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Klan Rozeti</label>
                  <div className="flex gap-2 justify-center py-1">
                    {badgeIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setBadgeIcon(icon)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition ${
                          badgeIcon === icon ? 'bg-violet-600 border-white shadow' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Açıklama</label>
                  <textarea
                    rows={2}
                    placeholder="Klan hedefleri ve kuralları..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isOpenCheckboxDesk"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600"
                  />
                  <label htmlFor="isOpenCheckboxDesk" className="text-xs font-bold text-slate-300 select-none cursor-pointer">
                    Açık Klan (Herkes onaysız katılabilir)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={createLoading || !name.trim()}
                  className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Klan Kuruluyor...' : '🏰 Klanı Kur ve Lider Ol'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // MOBILE CLAN VIEWPORT RENDER
  // ==========================================
  return (
    <div className="h-screen h-[100dvh] bg-[#060710] flex justify-center overflow-hidden relative">
      {/* Floating View Switcher */}
      <ViewModeToggle isFloating />

      <div className="w-full max-w-md mobile-app-shell flex flex-col relative overflow-hidden">
        
        {/* Top Game HUD */}
        <MobileTopHUD />

        {/* Content */}
        <main className="flex-1 px-4 py-4 overflow-y-auto no-scrollbar pb-6 space-y-4 animate-fadeIn">
          
          {/* Header Banner */}
          <div className="text-center pt-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/40 text-violet-300 text-[10px] font-black uppercase tracking-wider mb-1">
              <span>🏰 KLANLAR & LONCALAR</span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">
              Çalışma Loncaları & Klan Savaşları
            </h1>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 bg-[#171b38] p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => setActiveTab('my_clan')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'my_clan' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400'
              }`}
            >
              🛡️ Klanım
            </button>

            <button
              onClick={() => setActiveTab('search')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'search' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400'
              }`}
            >
              🔍 Klan Ara
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'leaderboard' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-400'
              }`}
            >
              🏆 Sıralama
            </button>
          </div>

          {loading && (
            <div className="py-8 text-center text-xs font-bold text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              Klan bilgileri yükleniyor...
            </div>
          )}

          {/* ==========================================
              TAB 1: MY CLAN (OR CREATE CLAN CALLOUT)
              ========================================== */}
          {!loading && activeTab === 'my_clan' && (
            <div className="space-y-4 animate-fadeIn">
              {myClan ? (
                /* USER HAS A CLAN */
                <div className="space-y-3">
                  
                  {/* Clan Sub-Tabs: Chat vs Info */}
                  <div className="flex bg-[#12152e] p-1 rounded-2xl border border-white/10 gap-1 shadow-inner">
                    <button
                      onClick={() => { setClanSubTab('chat'); setTimeout(scrollToBottom, 100); }}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        clanSubTab === 'chat'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>💬</span> <span>Klan Sohbeti</span>
                      {messages.length > 0 && (
                        <span className="text-[9px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                          {messages.length}
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => setClanSubTab('info')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        clanSubTab === 'info'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>🛡️</span> <span>Klan Bilgisi & Üyeler</span>
                    </button>
                  </div>

                  {/* SUB-VIEW 1: LIVE CLAN CHAT */}
                  {clanSubTab === 'chat' && (
                    <div className="bg-[#121533] border border-white/10 rounded-3xl p-3 flex flex-col h-[460px] shadow-2xl relative overflow-hidden animate-fadeIn">
                      {/* Chat Top Bar */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-white/10 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{myClan.badgeIcon}</span>
                          <div>
                            <h4 className="text-xs font-black text-white leading-tight">[{myClan.tag}] {myClan.name}</h4>
                            <p className="text-[9px] text-emerald-400 font-mono flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>{myClan.members.length} Üye • Canlı Klan Sohbeti</span>
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => loadChatMessages(myClan.id)}
                          title="Sohbeti Yenile"
                          className="w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-xs text-slate-300 cursor-pointer active:scale-95 transition"
                        >
                          🔄
                        </button>
                      </div>

                      {/* Messages Scroll Area */}
                      <div className="flex-1 overflow-y-auto no-scrollbar py-3 space-y-2.5">
                        {chatLoading ? (
                          <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
                            <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            Mesajlar yükleniyor...
                          </div>
                        ) : messages.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center p-4">
                            <span className="text-3xl mb-2">💬</span>
                            <span className="font-bold text-white">Henüz mesaj yok</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                              İlk mesajı sen gönder ve klan arkadaşlarına selam ver!
                            </span>
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMe = msg.userId === user?.id;
                            const isLeader = msg.role === 2;
                            const isElder = msg.role === 1;

                            if (msg.isSystem) {
                              return (
                                <div key={msg.id} className="text-center my-1.5">
                                  <span className="inline-block bg-[#090b1c] text-violet-300 border border-violet-500/20 text-[9px] font-bold px-3 py-1 rounded-full shadow-sm">
                                    {msg.content}
                                  </span>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={msg.id}
                                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                              >
                                {/* Sender Info */}
                                {!isMe && (
                                  <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                    <span className="text-[10px] font-black text-slate-300">{msg.username}</span>
                                    {isLeader && (
                                      <span className="text-[8px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                                        👑 LİDER
                                      </span>
                                    )}
                                    {isElder && (
                                      <span className="text-[8px] bg-violet-600 text-white font-black px-1.5 py-0.2 rounded-full">
                                        ⚡ BÜYÜK
                                      </span>
                                    )}
                                    <span className="text-[8px] text-slate-500 font-mono">Lv.{msg.userLevel}</span>
                                  </div>
                                )}

                                {/* Message Bubble */}
                                <div
                                  className={`max-w-[82%] px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                                    isMe
                                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-none border border-violet-400/40'
                                      : isLeader
                                      ? 'bg-[#181c42] border border-amber-500/40 text-slate-100 rounded-bl-none'
                                      : 'bg-[#181c42] border border-white/10 text-slate-200 rounded-bl-none'
                                  }`}
                                >
                                  <div className="font-medium text-[11px] whitespace-pre-wrap">{msg.content}</div>
                                  <div
                                    className={`text-[8px] mt-0.5 text-right font-mono ${
                                      isMe ? 'text-violet-200' : 'text-slate-400'
                                    }`}
                                  >
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Quick Reaction Chips */}
                      <div className="flex gap-1 overflow-x-auto no-scrollbar py-1 shrink-0">
                        {["🔥 Selam!", "⚔️ Düelloya gelin!", "🎯 Soru çözelim", "👑 Harika!", "💪 Başarılar", "👍"].map((quick) => (
                          <button
                            key={quick}
                            onClick={() => handleSendMessage(quick)}
                            disabled={sendingMsg}
                            className="bg-black/30 hover:bg-white/10 border border-white/10 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-lg whitespace-nowrap cursor-pointer active:scale-95 transition-all shrink-0"
                          >
                            {quick}
                          </button>
                        ))}
                      </div>

                      {/* Message Input Form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessage(chatInput);
                        }}
                        className="pt-2 flex items-center gap-1.5 shrink-0 border-t border-white/10"
                      >
                        <input
                          type="text"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          placeholder="Klan arkadaşlarına yaz..."
                          maxLength={500}
                          className="flex-1 bg-[#090b1c] border border-white/15 focus:border-violet-500 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition"
                        />
                        <button
                          type="submit"
                          disabled={sendingMsg || !chatInput.trim()}
                          className="px-3.5 py-2 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer disabled:opacity-50 active:scale-95 transition-all shrink-0 flex items-center gap-1"
                        >
                          <span>{sendingMsg ? '...' : 'Gönder'}</span>
                          <span>🚀</span>
                        </button>
                      </form>
                    </div>
                  )}

                  {/* SUB-VIEW 2: CLAN INFO & MEMBERS */}
                  {clanSubTab === 'info' && (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="game-card-3d p-5 text-center space-y-3 relative overflow-hidden">
                        <div className="text-4xl animate-bounce-subtle">{myClan.badgeIcon}</div>
                        <div>
                          <div className="inline-block bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase mb-1">
                            [{myClan.tag}]
                          </div>
                          <h2 className="text-xl font-black text-white">{myClan.name}</h2>
                          <p className="text-xs text-slate-300 mt-1 max-w-xs mx-auto">{myClan.description}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                            <div className="text-[9px] text-slate-400 font-bold">Toplam XP</div>
                            <div className="text-sm font-mono font-black text-cyan-400">{(myClan?.totalXp ?? 0).toLocaleString()}</div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                            <div className="text-[9px] text-slate-400 font-bold">Üye Sayısı</div>
                            <div className="text-sm font-mono font-black text-amber-300">{myClan.memberCount} / 50</div>
                          </div>
                          <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                            <div className="text-[9px] text-slate-400 font-bold">Klan Sırası</div>
                            <div className="text-sm font-mono font-black text-emerald-400">#{myClan.rank}</div>
                          </div>
                        </div>
                      </div>

                      {/* Members List */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-black px-1">
                          <span className="text-white">Klan Üyeleri ({myClan.members.length})</span>
                          <span className="text-slate-400 text-[10px]">Lider: {myClan.leaderUsername}</span>
                        </div>

                        {myClan.members.map((m) => (
                          <div
                            key={m.userId}
                            className="bg-[#171b38] border border-white/10 rounded-2xl p-3 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px]">
                                <div className="w-full h-full bg-[#0d0f22] rounded-[9px] flex items-center justify-center font-black text-white text-xs">
                                  {m?.username ? m.username.charAt(0).toUpperCase() : 'U'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs font-black text-white flex items-center gap-1.5">
                                  <span>{m?.username || 'Üye'}</span>
                                  {m.role === 2 && <span className="text-[8px] bg-amber-500 text-slate-950 px-1 rounded font-black">LİDER</span>}
                                  {m.role === 1 && <span className="text-[8px] bg-violet-500 text-white px-1 rounded font-bold">BÜYÜK</span>}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">Seviye {m.level}</div>
                              </div>
                            </div>

                            <div className="text-right font-mono font-black text-cyan-400 text-xs">
                              +{m.xpContributed} XP
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleLeaveClan}
                        className="w-full py-3 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-bold text-xs uppercase cursor-pointer transition"
                      >
                        Klandan Ayrıl
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                /* USER DOES NOT HAVE A CLAN */
                <div className="space-y-4">
                  <div className="game-card-3d p-6 text-center space-y-3">
                    <div className="text-5xl animate-bounce-subtle">🛡️</div>
                    <h3 className="text-lg font-black text-white">Bir Klana Katıl ya da Klan Kur!</h3>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto">
                      Arkadaşlarınla birlikte çalışma loncası kurarak haftalık klan sıralamasında yarışabilir ve klan bonusları kazanabilirsin.
                    </p>

                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer"
                      >
                        👑 Yeni Klan Kur (Ücretsiz)
                      </button>

                      <button
                        onClick={() => setActiveTab('search')}
                        className="w-full py-3 rounded-2xl btn-game-primary text-white font-bold text-xs uppercase cursor-pointer"
                      >
                        🔍 Açık Klanları Keşfet
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==========================================
              TAB 2: SEARCH CLANS
              ========================================== */}
          {activeTab === 'search' && (
            <div className="space-y-3 animate-fadeIn">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Klan adı veya etiket ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-[#171b38] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-bold focus:outline-none focus:border-violet-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer"
                >
                  Ara
                </button>
              </form>

              <div className="space-y-2">
                {searchResults.map((c) => (
                  <div
                    key={c.id}
                    className="game-card-3d p-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{c.badgeIcon}</div>
                      <div>
                        <div className="text-xs font-black text-white flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span className="text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.2 rounded font-black">
                            [{c.tag}]
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {c.memberCount} Üye • {(c?.totalXp ?? 0).toLocaleString()} XP • Min. Lv.{c.minLevel}
                        </div>
                      </div>
                    </div>

                    {!myClan && (
                      <button
                        onClick={() => handleJoinClan(c.id)}
                        disabled={user.level < c.minLevel || joiningClanId === c.id}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs uppercase transition cursor-pointer disabled:opacity-40 ${
                          user.level >= c.minLevel
                            ? 'btn-game-primary text-white'
                            : 'bg-slate-800 text-slate-500 border border-white/5'
                        }`}
                      >
                        {joiningClanId === c.id ? '...' : user.level < c.minLevel ? `Lv.${c.minLevel} Gerekli` : 'Katıl'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==========================================
              TAB 3: CLAN LEADERBOARD
              ========================================== */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-2 animate-fadeIn">
              <div className="text-xs font-black text-slate-300 px-1 mb-2">
                🏆 Haftalık En Güçlü Loncalar
              </div>

              {topClans.map((c, idx) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                    idx === 0
                      ? 'bg-amber-500/10 border-amber-400/40'
                      : idx === 1
                        ? 'bg-slate-500/10 border-slate-400/40'
                        : idx === 2
                          ? 'bg-amber-900/15 border-amber-700/40'
                          : 'bg-[#171b38] border-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-base w-6 text-center">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </span>
                    <span className="text-2xl">{c.badgeIcon}</span>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{c.name}</span>
                        <span className="text-[9px] text-violet-300 font-mono">[{c.tag}]</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {c.memberCount} Üye
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono font-black text-amber-300 text-xs">
                    {(c?.totalXp ?? 0).toLocaleString()} XP
                  </div>
                </div>
              ))}
            </div>
          )}

        </main>

        {/* Bottom Nav */}
        <MobileBottomNav activeTab="klan" onSelectTab={handleNavTab} />

        {/* CREATE CLAN MODAL */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-[#131631] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">👑</span>
                  <h3 className="text-lg font-black text-white">Yeni Klan Kur</h3>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {createError && (
                <div className="bg-rose-500/20 border border-rose-500 text-rose-300 text-xs rounded-xl p-2.5 font-bold">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateClan} className="space-y-3">
                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Klan Adı</label>
                  <input
                    type="text"
                    placeholder="örn: Sayısal Gladyatörleri"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold focus:outline-none focus:border-violet-500"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Etiket (Tag)</label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="FEN"
                      value={tag}
                      onChange={(e) => setTag(e.target.value.toUpperCase())}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold font-mono uppercase focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Min. Seviye</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={minLevel}
                      onChange={(e) => setMinLevel(Number(e.target.value))}
                      className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs font-bold font-mono focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Klan Rozeti</label>
                  <div className="flex gap-2 justify-center py-1">
                    {badgeIcons.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setBadgeIcon(icon)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition ${
                          badgeIcon === icon ? 'bg-violet-600 border-white shadow' : 'bg-white/5 border-white/10'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-1 uppercase">Açıklama</label>
                  <textarea
                    rows={2}
                    placeholder="Klan hedefleri ve kuralları..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-[#1b2046] border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isOpenCheckbox"
                    checked={isOpen}
                    onChange={(e) => setIsOpen(e.target.checked)}
                    className="w-4 h-4 rounded accent-violet-600"
                  />
                  <label htmlFor="isOpenCheckbox" className="text-xs font-bold text-slate-300 select-none cursor-pointer">
                    Açık Klan (Herkes onaysız katılabilir)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={createLoading || !name.trim()}
                  className="w-full py-3.5 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer disabled:opacity-50"
                >
                  {createLoading ? 'Klan Kuruluyor...' : '🏰 Klanı Kur ve Lider Ol'}
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
