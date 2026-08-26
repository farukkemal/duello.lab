# duello.lab — Project State & Architecture

**Son Güncelleme:** 2026-08-26  
**Durum:** Aktif Geliştirme / Cloud Database & Full-Stack Entegrasyonu

---

## 1. Teknoloji Yığını (Technology Stack)

| Katman | Teknoloji / Kütüphane | Açıklama |
|---|---|---|
| **Backend API** | **.NET 10 Web API** (C# 13, Native Performance) | Yüksek hızlı REST API, Dynamic JSONB, Entity Framework Core (Npgsql) |
| **Cloud Database** | **Supabase PostgreSQL** (`db.irvpnvzbxeovhcbbwgrz.supabase.co:5432/postgres`) | Merkezi bulut veri tabanı (Kullanıcılar, Soru Havuzu, Sınavlar, Klanlar, Arkadaşlıklar, Jokerler) |
| **Environment Loader** | **`EnvLoader` (.NET Custom Auto-Parser)** | `.env` dosyalarını hiyerarşik arayıp okur, `postgresql://` URI ve ADO.NET formatlarını SSL zorunluluğu ile otomatik normalize eder |
| **Real-time Engine** | **ASP.NET Core SignalR** (WebSockets) | 1v1 canlı düello eşleşmesi, anlık soru/cevap senkronizasyonu, süre yönetimi ve emote yayını (`/hubs/duello`) |
| **Cache & Room State** | **Redis (`StackExchange.Redis`) + In-Memory Fallback** | Odaların ve eşleşme kuyruklarının anlık durumu |
| **Matchmaking** | **`MatchmakingService` + `BotService`** | Background Worker eşleşme kuyruğu + oyuncu bulunamadığında devreye giren akıllı AI botlar |
| **Frontend** | **React 19 + TypeScript + Vite + Tailwind CSS v4** | Brawl Stars & Clash Royale mobil oyun estetiği, dokunsal 3D butonlar, canlı animasyonlar |
| **Audio Engine** | **Web Audio API Procedural Synthesizer** (`soundService.ts`) | Dış bağımlılıksız, 8-bit / arcade retro ses efektleri (tıklama, doğru/yanlış, zafer, yenilgi) |
| **Kimlik Doğrulama** | **JWT (JSON Web Token) + Google OAuth 2.0** | Güvenli token bazlı oturum ve Google Login desteği |

---

## 2. Veri Tabanı Mimarisi & Supabase Entegrasyonu

Veri tabanı bağlantısı Supabase PostgreSQL bulut servisine taşınmıştır. Soru havuzu, kullanıcı bilgileri, sınav istatistikleri ve klan verileri bu merkezden yönetilmektedir.

### 2.1. Environment (.env) Yapılandırması
```env
# Supabase PostgreSQL Connection String
DATABASE_URL=postgresql://postgres:c7EZCn^!$A2xp#W@db.irvpnvzbxeovhcbbwgrz.supabase.co:5432/postgres

# Direct ADO.NET Connection String for Npgsql
ConnectionStrings__DefaultConnection=Host=db.irvpnvzbxeovhcbbwgrz.supabase.co;Port=5432;Database=postgres;Username=postgres;Password=c7EZCn^!$A2xp#W;SSL Mode=Require;Trust Server Certificate=true

# Database Credentials
POSTGRES_HOST=db.irvpnvzbxeovhcbbwgrz.supabase.co
POSTGRES_PORT=5432
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=c7EZCn^!$A2xp#W

# JWT Security
JWT_SECRET=DuelloLabSuperSecretKeyThatIsAtLeast32CharactersLong!
```

### 2.2. Tablo Şeması (Entities)
1. **`Users`**: Kullanıcı profilleri, şifre hashleri, coin/gem bakiyeleri, seviye/XP, roller (`User`, `Admin`), joker envanteri (`JokerEliminateThree`, `JokerDoubleChance`, `JokerExtraTime`).
2. **`Exams`**: Sınav tanımları, kategoriler (TYT, AYT vb.), aktiflik durumu.
3. **`Questions`**: JSONB formatında çoktan seçmeli şıklar (`Choices`), branşlar (Türkçe, Matematik, Fizik, Kimya, Biyoloji, Tarih, Coğrafya, Felsefe), doğru cevap, çözüm metni, görsel URL'si, havuz türü (`Battleground`, `Solo`, `Duel`).
4. **`UserResults`**: Kullanıcının çözdüğü sınav sonuçları, net puanlar, branş bazlı doğru/yanlış sayıları ve süre analizleri.
5. **`Clans` & `ClanMembers` & `ClanMessages`**: Klan profilleri, liderlik hiyerarşisi, klan içi canlı sohbet ve haftalık klan XP katkıları.
6. **`Friendships`**: Arkadaşlık istekleri, onaylanan arkadaşlar, durum takibi.

---

## 3. Temel Oyun Modları ve Mekanikleri

### 3.1. 1v1 Hızlı Düello (Quick Duel)
- Oyuncular rastgele veya klan arkadaşlarıyla eşleşir.
- 5 veya 10 soruluk turlarda gerçek zamanlı SignalR WebSocket bağlantısı üzerinden aynı sorular eşzamanlı olarak gelir.
- Canlı skor tablosu, rakibin cevap durumu ve anlık emote gönderme desteği bulunur.

### 3.2. Sıralamalı Battleground (Ranked Arena)
- 22 günlük sezon döngüsü ve Safe Zone mekaniği.
- Havuzdan dinamik elenen soru sistemi.

### 3.3. Joker Sistemi (In-Game Powerups)
- **%50 Eleme (Eliminate 3)**: Yanlış şıklardan 3 tanesini devre dışı bırakır.
- **Çift Şans (Double Chance)**: İlk denemede yanlış yapılsa dahi bir hak daha tanır.
- **Ek Süre (Extra Time)**: Soru süresine anında ek saniye kazandırır.

### 3.4. AI & İstatistik Analiz Paneli
- Branş bazlı zayıflık haritası (Weakness Heatmap).
- Yanlış yapılan sorular defteri (Mistake Review).
- Yapay zeka destekli çalışma önerileri.

---

## 4. UI / UX & Mobil Oyun Kabuğu

- **Fixed Mobile Shell (`.mobile-app-shell`)**: Mobil cihazlarda `100dvh` tam ekran stabil oyun deneyimi.
- **Top HUD**: Profil avatarı, seviye/XP ilerleme çubuğu, klan etiketi, altın/elmas cüzdanı, ses efekti açma/kapama ve sosyal çekmece butonu.
- **Dokunsal Alt Menü (`MobileBottomNav.tsx`)**:
  - `Arena` (Ana lobi ve oyun modları)
  - `Klan` (Klan yönetimi, sohbet, klan ligi)
  - `Mağaza` (Joker, avatar ve sandık satın alımı)
  - `İstatistik` (Gelişim grafikleri ve analiz)
  - `Profil` (Kişisel ayarlar, rozetler ve geçmiş maçlar)
- **Tab State & URL Synchronization**: Sayfalar arası geçişlerde URL query (`/dashboard?tab=...`) senkronize çalışır.

---

## 5. Başlatma ve Dağıtım

### Backend Başlatma (Geliştirme / Yerel):
```bash
cd backend/DuelloLab.Api
dotnet run
```
*API http://localhost:5000 adresinde ayağa kalkar, `.env` dosyasındaki Supabase PostgreSQL bağlantısını otomatik yükler ve ilk açılışta tabloları & tohum soru havuzunu hazırlar.*

### Frontend Başlatma:
```bash
cd frontend
npm run dev
```
*Frontend http://localhost:5173 adresinde açılır.*

### Docker ile Çalıştırma:
```bash
docker-compose up --build
```
