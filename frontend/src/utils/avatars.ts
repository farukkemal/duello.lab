export interface AvatarOption {
  id: string;
  icon: string;
  label: string;
  category: 'savasci' | 'ogrenci' | 'efsane';
  bgGradient: string;
}

export const AVATAR_LIST: AvatarOption[] = [
  // Savaşçı & Gamer
  { id: 'default', icon: '👤', label: 'Klasik', category: 'savasci', bgGradient: 'from-slate-600 to-slate-800' },
  { id: 'ninja', icon: '🥷', label: 'Ninja', category: 'savasci', bgGradient: 'from-neutral-800 to-zinc-950' },
  { id: 'wizard', icon: '🧙‍♂️', label: 'Büyücü', category: 'savasci', bgGradient: 'from-purple-600 to-indigo-900' },
  { id: 'cyborg', icon: '🤖', label: 'Sayborg', category: 'savasci', bgGradient: 'from-cyan-500 to-blue-700' },
  { id: 'wolf', icon: '🐺', label: 'Bozkurt', category: 'savasci', bgGradient: 'from-slate-500 to-zinc-800' },
  { id: 'lion', icon: '🦁', label: 'Aslan', category: 'savasci', bgGradient: 'from-amber-500 to-yellow-700' },
  { id: 'eagle', icon: '🦅', label: 'Kartal', category: 'savasci', bgGradient: 'from-orange-500 to-amber-800' },
  { id: 'dragon', icon: '🐉', label: 'Ejderha', category: 'savasci', bgGradient: 'from-rose-600 to-red-900' },
  { id: 'crown', icon: '👑', label: 'Hükümdar', category: 'savasci', bgGradient: 'from-amber-400 to-yellow-600' },
  { id: 'archer', icon: '🎯', label: 'Nişancı', category: 'savasci', bgGradient: 'from-emerald-500 to-teal-800' },
  { id: 'lightning', icon: '⚡', label: 'Şimşek', category: 'savasci', bgGradient: 'from-yellow-400 to-amber-600' },
  { id: 'astronaut', icon: '🚀', label: 'Astronot', category: 'savasci', bgGradient: 'from-indigo-500 to-violet-800' },

  // Öğrenci & Akademik
  { id: 'grad', icon: '🎓', label: 'Mezun', category: 'ogrenci', bgGradient: 'from-blue-600 to-cyan-700' },
  { id: 'book', icon: '📚', label: 'Kitap Kurdu', category: 'ogrenci', bgGradient: 'from-emerald-600 to-green-800' },
  { id: 'scientist', icon: '🔬', label: 'Bilim İnsanı', category: 'ogrenci', bgGradient: 'from-cyan-600 to-teal-900' },
  { id: 'telescope', icon: '🔭', label: 'Kâşif', category: 'ogrenci', bgGradient: 'from-violet-600 to-purple-900' },
  { id: 'geometry', icon: '📐', label: 'Geometri', category: 'ogrenci', bgGradient: 'from-blue-500 to-indigo-700' },
  { id: 'dna', icon: '🧬', label: 'Genetikçi', category: 'ogrenci', bgGradient: 'from-pink-500 to-rose-700' },
  { id: 'artist', icon: '🎨', label: 'Sanatçı', category: 'ogrenci', bgGradient: 'from-fuchsia-500 to-purple-700' },
  { id: 'brain', icon: '🧠', label: 'Dahî', category: 'ogrenci', bgGradient: 'from-violet-500 to-indigo-700' },

  // Efsanevi Canlılar
  { id: 'owl', icon: '🦉', label: 'Bilge Baykuş', category: 'efsane', bgGradient: 'from-amber-700 to-yellow-900' },
  { id: 'tiger', icon: '🐯', label: 'Kaplan', category: 'efsane', bgGradient: 'from-orange-600 to-amber-700' },
  { id: 'fox', icon: '🦊', label: 'Kurnaz Tilki', category: 'efsane', bgGradient: 'from-orange-500 to-red-600' },
  { id: 'diamond', icon: '💎', label: 'Elmas', category: 'efsane', bgGradient: 'from-cyan-400 to-blue-600' }
];

export const TITLE_LIST: string[] = [
  'Savaşçı',
  'Matematik Avcısı',
  'Edebiyat Dehası',
  'Fen Bilgini',
  'Hızlı Çözücü',
  'Derece Adayı',
  'YKS Şampiyonu',
  'Soruların Efendisi',
  'Geometri Ustası',
  'Tarih Kaşifi',
  'Paragraf Canavarı',
  'Problem Çözücü'
];

export function getAvatarIcon(avatarId?: string | null, fallbackName?: string): string {
  if (!avatarId || avatarId === 'default') {
    if (fallbackName && fallbackName.length > 0) {
      return fallbackName.charAt(0).toUpperCase();
    }
    return '👤';
  }

  if (avatarId === 'bot') return '🤖';

  const found = AVATAR_LIST.find(a => a.id.toLowerCase() === avatarId.toLowerCase());
  if (found) return found.icon;

  // If avatarId is an emoji itself
  if (avatarId.length <= 4) return avatarId;

  if (fallbackName && fallbackName.length > 0) {
    return fallbackName.charAt(0).toUpperCase();
  }

  return '👤';
}

export function getAvatarBg(avatarId?: string | null): string {
  const found = AVATAR_LIST.find(a => a.id.toLowerCase() === (avatarId || '').toLowerCase());
  return found?.bgGradient || 'from-violet-600 via-indigo-500 to-cyan-400';
}
