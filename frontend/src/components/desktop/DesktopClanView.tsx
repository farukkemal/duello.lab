import React from 'react';
import type { Clan, ClanMessage } from '../../api/social';
import type { UserDto } from '../../api/auth';

interface DesktopClanViewProps {
  myClan: Clan | null;
  user: UserDto | null;
  messages: ClanMessage[];
  chatLoading: boolean;
  sendingMsg: boolean;
  chatInput: string;
  setChatInput: (val: string) => void;
  onSendMessage: (text?: string) => void;
  onLeaveClan: () => void;
  onRefreshMessages: () => void;
  onOpenCreateModal: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export default function DesktopClanView({
  myClan,
  user,
  messages,
  chatLoading,
  sendingMsg,
  chatInput,
  setChatInput,
  onSendMessage,
  onLeaveClan,
  onRefreshMessages,
  onOpenCreateModal,
  messagesEndRef
}: DesktopClanViewProps) {
  if (!myClan) {
    return (
      <div className="max-w-xl mx-auto py-12 px-6">
        <div className="game-card-3d p-8 text-center space-y-4">
          <div className="text-6xl animate-bounce-subtle">🛡️</div>
          <h2 className="text-2xl font-black text-white">Bir Klana Katıl ya da Yeni Lonca Kur!</h2>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            Arkadaşlarınla birlikte çalışma loncası kurarak haftalık klan sıralamasında yarışabilir ve klan bonusları kazanabilirsin.
          </p>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="px-6 py-3 rounded-2xl btn-game-gold font-black text-xs uppercase cursor-pointer shadow-xl hover:scale-105 transition"
            >
              👑 Yeni Klan Kur (Ücretsiz)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* ========================================================
            LEFT COLUMN (Col 1-4): Clan Overview & Members List
            ======================================================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Clan Info Card */}
          <div className="game-card-3d p-5 text-center space-y-3 relative overflow-hidden">
            <div className="text-5xl animate-bounce-subtle">{myClan.badgeIcon}</div>
            <div>
              <div className="inline-block bg-violet-500/20 border border-violet-500/30 text-violet-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase mb-1">
                [{myClan.tag}]
              </div>
              <h2 className="text-2xl font-black text-white">{myClan.name}</h2>
              <p className="text-xs text-slate-300 mt-1">{myClan.description}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <div className="text-[10px] text-slate-400 font-bold">Toplam XP</div>
                <div className="text-sm font-mono font-black text-cyan-400">{myClan.totalXp.toLocaleString()}</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <div className="text-[10px] text-slate-400 font-bold">Üye Sayısı</div>
                <div className="text-sm font-mono font-black text-amber-300">{myClan.memberCount} / 50</div>
              </div>
              <div className="bg-black/30 rounded-xl p-2 border border-white/5">
                <div className="text-[10px] text-slate-400 font-bold">Klan Sırası</div>
                <div className="text-sm font-mono font-black text-emerald-400">#{myClan.rank}</div>
              </div>
            </div>
          </div>

          {/* Members List */}
          <div className="game-card-3d p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-black text-white">Klan Üyeleri ({myClan.members.length})</span>
              <span className="text-slate-400 text-[10px]">Lider: {myClan.leaderUsername}</span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
              {myClan.members.map((m) => (
                <div
                  key={m.userId}
                  className="bg-black/30 hover:bg-white/5 border border-white/5 rounded-xl p-2.5 flex items-center justify-between transition"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-cyan-400 p-[1.5px]">
                      <div className="w-full h-full bg-[#0d0f22] rounded-[9px] flex items-center justify-center font-black text-white text-xs">
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>{m.username}</span>
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
              onClick={onLeaveClan}
              className="w-full py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 font-bold text-xs uppercase cursor-pointer transition"
            >
              Klandan Ayrıl
            </button>
          </div>

        </div>

        {/* ========================================================
            RIGHT COLUMN (Col 5-12): Expanded Live Clan Chat Room
            ======================================================== */}
        <div className="lg:col-span-8 bg-[#121533] border border-white/10 rounded-3xl p-5 flex flex-col h-[580px] shadow-2xl relative overflow-hidden">
          
          {/* Chat Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{myClan.badgeIcon}</span>
              <div>
                <h3 className="text-sm font-black text-white">[{myClan.tag}] {myClan.name} • Canlı Lonca Sohbeti</h3>
                <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{myClan.members.length} Üye • SignalR Gerçek Zamanlı Bağlantı</span>
                </p>
              </div>
            </div>

            <button
              onClick={onRefreshMessages}
              title="Sohbeti Yenile"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer active:scale-95 transition"
            >
              <span>🔄</span>
              <span>Yenile</span>
            </button>
          </div>

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto no-scrollbar py-4 space-y-3">
            {chatLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold gap-2">
                <span className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                Mesajlar yükleniyor...
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm text-center p-6">
                <span className="text-4xl mb-2">💬</span>
                <span className="font-bold text-white text-base">Henüz mesaj yok</span>
                <span className="text-xs text-slate-400 mt-1 max-w-sm">
                  Klan arkadaşlarınla düello stratejileri konuşmak veya soru sormak için ilk mesajı sen yaz!
                </span>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.userId === user?.id;
                const isLeader = msg.role === 2;
                const isElder = msg.role === 1;

                if (msg.isSystem) {
                  return (
                    <div key={msg.id} className="text-center my-2">
                      <span className="inline-block bg-[#090b1c] text-violet-300 border border-violet-500/20 text-[10px] font-bold px-4 py-1.5 rounded-full shadow">
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
                    {!isMe && (
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-xs font-black text-slate-200">{msg.username}</span>
                        {isLeader && (
                          <span className="text-[9px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black px-1.5 py-0.2 rounded-full">
                            👑 LİDER
                          </span>
                        )}
                        {isElder && (
                          <span className="text-[9px] bg-violet-600 text-white font-black px-1.5 py-0.2 rounded-full">
                            ⚡ BÜYÜK
                          </span>
                        )}
                        <span className="text-[9px] text-slate-400 font-mono">Lv.{msg.userLevel}</span>
                      </div>
                    )}

                    <div
                      className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed break-words shadow-md ${
                        isMe
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-br-none border border-violet-400/40'
                          : isLeader
                          ? 'bg-[#181c42] border border-amber-500/40 text-slate-100 rounded-bl-none'
                          : 'bg-[#181c42] border border-white/10 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      <div className="font-medium text-xs whitespace-pre-wrap">{msg.content}</div>
                      <div
                        className={`text-[9px] mt-1 text-right font-mono ${
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
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2 shrink-0 border-t border-white/5">
            {["🔥 Selam!", "⚔️ Düelloya gelin!", "🎯 Soru çözelim", "👑 Harika!", "💪 Başarılar", "👍"].map((quick) => (
              <button
                key={quick}
                onClick={() => onSendMessage(quick)}
                disabled={sendingMsg}
                className="bg-black/40 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-bold px-3 py-1 rounded-xl whitespace-nowrap cursor-pointer active:scale-95 transition shrink-0"
              >
                {quick}
              </button>
            ))}
          </div>

          {/* Message Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSendMessage(chatInput);
            }}
            className="pt-3 flex items-center gap-2 shrink-0 border-t border-white/10"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Klan arkadaşlarına bir şeyler yaz..."
              maxLength={500}
              className="flex-1 bg-[#090b1c] border border-white/15 focus:border-violet-500 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={sendingMsg || !chatInput.trim()}
              className="px-6 py-3 rounded-2xl btn-game-primary text-white font-black text-xs uppercase cursor-pointer disabled:opacity-50 active:scale-95 transition shrink-0 flex items-center gap-1.5 shadow-lg"
            >
              <span>{sendingMsg ? '...' : 'Gönder'}</span>
              <span>🚀</span>
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
