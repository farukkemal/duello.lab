import { useState, useEffect } from 'react';
import { getPublicProfile, type PublicProfileDto } from '../api/auth';
import { getAvatarIcon, getAvatarBg } from '../utils/avatars';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIdOrUsername?: string | null;
  onInviteDuel?: (userId: string) => void;
}

export default function UserProfileModal({
  isOpen,
  onClose,
  userIdOrUsername,
  onInviteDuel
}: UserProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userIdOrUsername) {
      setProfile(null);
      return;
    }

    setLoading(true);
    setError(null);

    getPublicProfile(userIdOrUsername)
      .then(({ data }) => {
        setProfile(data);
      })
      .catch((err) => {
        console.error('Failed to load profile:', err);
        setError('Kullanıcı profili yüklenemedi.');
      })
      .finally(() => setLoading(false));
  }, [isOpen, userIdOrUsername]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="w-full max-w-md bg-[#0e1126] border-t sm:border border-white/15 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[88vh] flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👤</span>
            <div>
              <h3 className="text-lg font-black text-white">Oyuncu Profili</h3>
              <p className="text-[10px] text-slate-400">Performans, branş başarıları ve klan detayları</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Profil Verileri Yükleniyor...
          </div>
        ) : error || !profile ? (
          <div className="py-12 text-center text-rose-400 text-xs font-bold space-y-2">
            <div>⚠️ {error || 'Kullanıcı bulunamadı.'}</div>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs cursor-pointer"
            >
              Kapat
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pr-0.5">
            
            {/* User Identity Card */}
            <div className="bg-[#141838] border border-white/10 rounded-2xl p-4 flex items-center gap-3.5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative shrink-0">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${getAvatarBg(profile.avatar)} p-[2px] shadow-xl flex items-center justify-center`}>
                  <div className="w-full h-full bg-[#0d0f22] rounded-[14px] flex items-center justify-center text-3xl select-none">
                    {getAvatarIcon(profile.avatar, profile.username)}
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-full border-2 border-[#0d0f26] shadow">
                  Lv.{profile.level}
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-black text-white truncate">{profile.username}</h4>
                </div>
                <div className="inline-block px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {profile.title || 'Savaşçı'}
                </div>
                {profile.bio && (
                  <p className="text-[11px] text-slate-300 italic line-clamp-2 leading-tight">
                    "{profile.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Clan Badge Card (if member of a clan) */}
            {profile.clanName && (
              <div className="bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between shadow">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{profile.clanBadge || '🛡️'}</span>
                  <div>
                    <div className="text-[9px] text-cyan-400 font-bold uppercase">Klan Üyeliği</div>
                    <div className="text-xs font-black text-white flex items-center gap-1.5">
                      <span>{profile.clanName}</span>
                      {profile.clanTag && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-mono">
                          [{profile.clanTag}]
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {profile.clanRole && (
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-lg bg-white/10 text-slate-300">
                    {profile.clanRole}
                  </span>
                )}
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-[#121533] border border-white/5 rounded-xl p-2 text-center">
                <div className="text-xs mb-0.5">⚡</div>
                <div className="text-[9px] text-slate-400 font-bold">Toplam Soru</div>
                <div className="text-[11px] font-mono font-black text-cyan-400">{profile.totalQuestionsSolved}</div>
              </div>
              <div className="bg-[#121533] border border-white/5 rounded-xl p-2 text-center">
                <div className="text-xs mb-0.5">🎯</div>
                <div className="text-[9px] text-slate-400 font-bold">Başarı</div>
                <div className="text-[11px] font-mono font-black text-emerald-400">%{profile.overallAccuracyRate}</div>
              </div>
              <div className="bg-[#121533] border border-white/5 rounded-xl p-2 text-center">
                <div className="text-xs mb-0.5">📊</div>
                <div className="text-[9px] text-slate-400 font-bold">Ort. Net</div>
                <div className="text-[11px] font-mono font-black text-amber-400">{profile.averageNetScore}</div>
              </div>
              <div className="bg-[#121533] border border-white/5 rounded-xl p-2 text-center">
                <div className="text-xs mb-0.5">🏆</div>
                <div className="text-[9px] text-slate-400 font-bold">Toplam Maç</div>
                <div className="text-[11px] font-mono font-black text-violet-400">{profile.totalExamsTaken}</div>
              </div>
            </div>

            {/* Strength & Weakness */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-2.5 flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <div className="min-w-0">
                  <div className="text-[8px] text-emerald-400 font-bold uppercase">En Güçlü Branş</div>
                  <div className="text-xs font-black text-white truncate">{profile.strongestBranch || 'Matematik'}</div>
                </div>
              </div>
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-2.5 flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div className="min-w-0">
                  <div className="text-[8px] text-rose-400 font-bold uppercase">Geliştirilmeli</div>
                  <div className="text-xs font-black text-white truncate">{profile.weakestBranch || 'Türkçe'}</div>
                </div>
              </div>
            </div>

            {/* DERS BAŞARI ISI HARİTASI (BRANCH ACCURACY HEATMAP) */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-black text-white">
                <span className="flex items-center gap-1.5">
                  <span>🗺️</span> <span>Ders Başarı Isı Haritası</span>
                </span>
                <span className="text-[9px] text-slate-400 font-normal">Branş Net & Doğruluk</span>
              </div>

              <div className="space-y-2">
                {(profile.branchHeatmap || []).map((b) => {
                  const masteryBadge = b.accuracyRate >= 75
                    ? { text: '🌟 Uzman', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' }
                    : b.accuracyRate >= 50
                      ? { text: '⚡ Gelişiyor', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' }
                      : { text: '⚠️ Kritik', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' };

                  return (
                    <div
                      key={b.branch}
                      className="bg-[#121533] border border-white/5 rounded-2xl p-3 space-y-1.5 shadow"
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-white flex items-center gap-1.5">
                          <span>{b.branch}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded border ${masteryBadge.color}`}>
                            {masteryBadge.text}
                          </span>
                          <span className="font-mono font-black text-cyan-400">%{b.accuracyRate}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden p-[0.5px]">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            b.accuracyRate >= 75
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : b.accuracyRate >= 50
                                ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                : 'bg-gradient-to-r from-rose-600 to-red-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(8, b.accuracyRate))}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-400">
                        <span>{b.correctCount}/{b.totalAnswered} Doğru Çözüm</span>
                        <span className="italic truncate max-w-[200px]">{b.recommendation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t border-white/10">
          {onInviteDuel && profile && (
            <button
              onClick={() => {
                onInviteDuel(profile.id);
                onClose();
              }}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs uppercase cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition"
            >
              ⚔️ Düelloya Davet Et
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase cursor-pointer transition"
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
}
