# duello.lab — Project State

## Technology Stack
| Layer          | Technology                          |
|----------------|-------------------------------------|
| Backend        | .NET 10 Web API (C#, Code-First)    |
| Database       | PostgreSQL + EF Core (Npgsql)       |
| Real-time      | ASP.NET Core SignalR (WebSockets)   |
| Cache / State  | Redis (`StackExchange.Redis`) + In-Memory Fallback |
| Frontend       | React 19 + Vite + Tailwind CSS v4   |
| Authentication | JWT (JSON Web Token)                |
| Language       | C# / TypeScript                     |

## Database Schema

### Users
| Column       | Type      | Notes                |
|--------------|-----------|----------------------|
| Id           | Guid (PK) | Auto-generated       |
| Username     | string    | Unique               |
| Email        | string    | Unique               |
| PasswordHash | string    | BCrypt                |
| Level        | int       | Default 1            |
| XP           | int       | Default 0            |
| CoinBalance  | int       | Default 100 (Bonus)  |
| CreatedAt    | DateTime  | UTC                  |

### Exams
| Column    | Type      | Notes                |
|-----------|-----------|----------------------|
| Id        | Guid (PK) | Auto-generated       |
| Title     | string    |                      |
| Category  | string    | TYT, AYT, etc.      |
| IsActive  | bool      | Default true         |
| CreatedAt | DateTime  | UTC                  |

### Questions
| Column         | Type       | Notes                          |
|----------------|------------|--------------------------------|
| Id             | Guid (PK)  | Auto-generated                 |
| ExamId         | Guid (FK)  | References Exams               |
| Branch         | string     | Matematik, Fizik, etc.         |
| QuestionText   | string     |                                |
| Choices        | JSONB      | {"A":"...","B":"...","C":"...","D":"...","E":"..."} |
| CorrectAnswer  | string     | A/B/C/D/E                      |
| SolutionText   | string?    | Nullable                       |
| ImageUrl       | string?    | Nullable                       |
| PoolType       | enum       | Solo = 0, Battleground = 1     |
| AvailableAfter | DateTime?  | Nullable, 22-day cooldown      |

### UserResults
| Column       | Type       | Notes                      |
|--------------|------------|----------------------------|
| Id           | Guid (PK)  | Auto-generated             |
| UserId       | Guid (FK)  | References Users           |
| ExamId       | Guid (FK)  | References Exams           |
| CorrectCount | int        |                            |
| WrongCount   | int        |                            |
| BlankCount   | int        |                            |
| NetScore     | decimal    | Correct - (Wrong / 2)     |
| DurationMs   | long       | Server-side calculation    |
| XpGained     | int        |                            |
| CreatedAt    | DateTime   | UTC                        |

## Real-Time Models (Redis & In-Memory)
- **`RoomState`**: `RoomCode`, `Title`, `Category`, `HostUserId`, `HostUsername`, `QuestionCount`, `QuestionIds`, `Questions`, `Status`, `StartTime`, `DurationSeconds`, `Users`
- **`RoomUserInfo`**: `UserId`, `Username`, `Level`, `ConnectionId`, `JoinedAt`, `IsHost`, `IsReady`, `Score`, `CurrentQuestionIndex`, `AnsweredCount`, `ProgressPercentage`, `IsFinished`, `DurationMs`, `NetScore`, `Rank`, `CoinsGained`, `XpGained`, `UserAnswers`
- **`DuelloHub`**: `/hubs/duello` with JWT auth, `JoinLobby`, `LeaveLobby`, `ToggleReady`, `StartMatch`, `UpdateProgress`, `SubmitMatch`, `ForceTimeUp`, `MatchStarting`, `PlayerProgressUpdated`, `PlayerFinished`, `MatchEnded`.

## Feature Status

| Feature                                   | Status      |
|-------------------------------------------|-------------|
| Project Scaffolding                       | ✅ Complete |
| EF Core Entities + DbContext              | ✅ Complete |
| JWT Authentication                        | ✅ Complete |
| JSON Exam Import                          | ✅ Complete |
| Solo Mode APIs                            | ✅ Complete |
| Frontend Dashboard                        | ✅ Complete |
| Frontend Exam UI                          | ✅ Complete |
| Frontend Results UI                       | ✅ Complete |
| **FAZ 2.1: SignalR Hub Setup**            | ✅ Complete |
| **FAZ 2.1: Redis & RoomStateService**     | ✅ Complete |
| **FAZ 2.1: Live Status & Tests**          | ✅ Complete |
| **FAZ 2.2: 50 Coin Room Creation**        | ✅ Complete |
| **FAZ 2.2: 4-Char Room Code & Join**      | ✅ Complete |
| **FAZ 2.2: Live Lobby UI & Sync**         | ✅ Complete |
| **FAZ 2.3: 3-2-1 Synchronized Countdown** | ✅ Complete |
| **FAZ 2.3: Central Server-Synced Timer**  | ✅ Complete |
| **FAZ 2.3: Live Opponents Progress Bar**  | ✅ Complete |
| **FAZ 2.3: Real-time Match Leaderboard**  | ✅ Complete |
| **FAZ 2.4: Dual End Triggers & TimeUp**   | ✅ Complete |
| **FAZ 2.4: 3D Podium (1st, 2nd, 3rd)**    | ✅ Complete |
| **FAZ 2.4: XP & Coin Reward Distribution**| ✅ Complete |
| **FAZ 2.4: PostgreSQL Persistence**       | ✅ Complete |
| **FAZ 2.4: Redis Room Cleanup**           | ✅ Complete |

## Scoring, Tie-Breaker & Podium Rewards
- **Net Score** = Correct - (Wrong / 2)
- **Tie-Breaker**: Eşit Net Skor durumunda sunucu başlangıç-bitiş süresi (`DurationMs`) küçük olan kazanır.
- **🥇 1. Sıra (Şampiyon)**: `(NetScore × 10) + 100 XP` + `40 Coin`
- **🥈 2. Sıra**: `(NetScore × 10) + 50 XP` + `20 Coin`
- **🥉 3. Sıra**: `(NetScore × 10) + 25 XP` + `10 Coin`
- **Diğer Katılımcılar**: `max(0, NetScore × 10) XP` + `5 Coin`
- **Level Up** = Every 1000 XP
- **Room Creation Cost**: 50 Coins
- **Starting Bonus**: 100 Coins

## Connection Strings & Ports
- PostgreSQL: `Host=localhost;Port=5432;Database=duellolab;Username=postgres;Trust Server Certificate=true`
- Redis: `localhost:6379,abortConnect=false,connectTimeout=2000` (auto in-memory fallback enabled)
- Backend API: `http://localhost:5000`
- Frontend: `http://localhost:5173`
- SignalR Hub: `http://localhost:5000/hubs/duello`
