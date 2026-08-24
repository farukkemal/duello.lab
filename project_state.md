# duello.lab — Project State

## Technology Stack
| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | .NET 10 Web API (C#, Code-First)    |
| Database       | PostgreSQL + EF Core (Npgsql)       |
| Real-time      | ASP.NET Core SignalR (WebSockets)   |
| Cache / State  | Redis (`StackExchange.Redis`) + In-Memory Fallback |
| Matchmaking    | `MatchmakingService` (Background Worker Queue + Smart AI Bots) |
| Battleground   | `BattlegroundService` (22-Day Cooldown & Safe Zone) |
| Social & Clans | `ClanService`, `FriendService`, `EmoteBroadcasting` |
| AI & Analytics | `AnalyticsService` (Weakness Heatmap, Mistake Review, AI Advice) |
| Audio & SFX    | Zero-dependency Web Audio API Procedural Synthesizer |
| Frontend       | React 19 + Vite + Tailwind CSS v4   |
| UI / UX Mode   | **Mobile Game UI (Brawl Stars & Clash Royale Style - Seamless Tab Sync)** |
| Animation/FX   | `canvas-confetti` + 3D Tactile Game Styling |
| Authentication | JWT (JSON Web Token)                |
| Language       | C# / TypeScript                     |

## UI/UX & Navigation Layout
- **Fixed Mobile Frame (`.mobile-app-shell`)**: `100dvh` flex-column mimarisi.
- **Top HUD**: Sayfanın en üstüne sabitlenmiş (`shrink-0`), profil, XP barı, 🤝 sosyal butonu, 💰 coin cüzdanı ve 🔊 ses açma/kapama butonu.
- **Main Area**: `flex-1 overflow-y-auto no-scrollbar` bağımsız dikey kaydırma alanı.
- **Bottom Navigation (`MobileBottomNav.tsx`)**: Ekranın en altına sabitlenmiş (`shrink-0`), asla kaybolmayan ve kaydırma gerektirmeyen dokunsal menü.
- **Tab State & URL Synchronization**:
  - `ShopPage.tsx` veya `ClanPage.tsx` sayfalarından herhangi bir alt menü sekmesine (örn: `Profil`) tıklandığında anında `/dashboard?tab=profil` ile doğrudan ilgili sekmeye yönlendirme sağlandı (Arena'ya geri atma sorunu çözüldü).
