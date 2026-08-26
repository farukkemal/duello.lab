using System.Text;
using DuelloLab.Api.Data;
using DuelloLab.Api.Data.Seed;
using DuelloLab.Api.Hubs;
using DuelloLab.Api.Middleware;
using DuelloLab.Api.Services;
using DuelloLab.Api.Services.Realtime;
using DuelloLab.Api.Services.Social;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);

// Database - configure Npgsql data source with dynamic JSON for JSONB
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string not configured");

var dataSourceBuilder = new Npgsql.NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.EnableDynamicJson();
var dataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(dataSource));

// Redis - Resilient connection
var redisConnectionString = builder.Configuration.GetConnectionString("Redis") ?? "localhost:6379,abortConnect=false,connectTimeout=2000";
IConnectionMultiplexer? redisMultiplexer = null;
try
{
    var redisOptions = ConfigurationOptions.Parse(redisConnectionString);
    redisOptions.AbortOnConnectFail = false;
    redisOptions.ConnectTimeout = 2000;
    redisMultiplexer = ConnectionMultiplexer.Connect(redisOptions);
    builder.Services.AddSingleton<IConnectionMultiplexer>(redisMultiplexer);
}
catch (Exception ex)
{
    Console.WriteLine($"[Warning] Redis initial connect failed: {ex.Message}. Fallback will be used.");
}

// Room State Service (Redis + In-Memory Fallback)
builder.Services.AddSingleton<IRoomStateService, RedisRoomStateService>();

// SignalR
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.KeepAliveInterval = TimeSpan.FromSeconds(15);
    options.ClientTimeoutInterval = TimeSpan.FromSeconds(30);
});

// JWT Authentication
var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("JWT Secret not configured");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };

        // Support token in query string for SignalR WebSocket connections
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                {
                    context.Token = accessToken;
                }
                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
});

// DI - Application Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IExamService, ExamService>();
builder.Services.AddScoped<IRoomService, RoomService>();
builder.Services.AddScoped<IBattlegroundService, BattlegroundService>();
builder.Services.AddScoped<IClanService, ClanService>();
builder.Services.AddScoped<IFriendService, FriendService>();
builder.Services.AddScoped<DuelloLab.Api.Services.Analytics.IAnalyticsService, DuelloLab.Api.Services.Analytics.AnalyticsService>();

// Matchmaking Engine Singleton & Hosted Service
builder.Services.AddSingleton<MatchmakingService>();
builder.Services.AddSingleton<IMatchmakingService>(sp => sp.GetRequiredService<MatchmakingService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<MatchmakingService>());

// Bot Match Service
builder.Services.AddSingleton<IBotService, BotService>();


// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// CORS - allow React frontend (local + Netlify / production) + SignalR credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin => true)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddOpenApi();

var app = builder.Build();

// Middleware pipeline
app.UseMiddleware<ExceptionMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<DuelloHub>("/hubs/duello");

// Health check endpoint for Render and browser verification
app.MapGet("/", () => Results.Ok(new 
{ 
    status = "healthy", 
    service = "DuelloLab API", 
    version = "1.0.0", 
    time = DateTime.UtcNow 
}));

// Initialize database tables and seeds (both Dev and Prod on first boot)
using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Ensure database tables exist
        await db.Database.EnsureCreatedAsync();

        // Ensure Clans, ClanMembers, Friendships, ClanMessages tables exist
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""Clans"" (
                ""Id"" uuid PRIMARY KEY,
                ""Name"" varchar(50) NOT NULL UNIQUE,
                ""Description"" varchar(200) NOT NULL DEFAULT '',
                ""Tag"" varchar(6) NOT NULL DEFAULT 'YKS',
                ""BadgeIcon"" varchar(10) NOT NULL DEFAULT '🛡️',
                ""MinLevel"" integer NOT NULL DEFAULT 1,
                ""IsOpen"" boolean NOT NULL DEFAULT true,
                ""LeaderUserId"" uuid NOT NULL,
                ""LeaderUsername"" varchar(50) NOT NULL DEFAULT '',
                ""TotalXp"" integer NOT NULL DEFAULT 0,
                ""MemberCount"" integer NOT NULL DEFAULT 1,
                ""CreatedAt"" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS ""ClanMembers"" (
                ""Id"" uuid PRIMARY KEY,
                ""ClanId"" uuid NOT NULL REFERENCES ""Clans""(""Id"") ON DELETE CASCADE,
                ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""Username"" varchar(50) NOT NULL DEFAULT '',
                ""Level"" integer NOT NULL DEFAULT 1,
                ""XpContributed"" integer NOT NULL DEFAULT 0,
                ""Role"" integer NOT NULL DEFAULT 0,
                ""JoinedAt"" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT ""UQ_ClanMember"" UNIQUE (""ClanId"", ""UserId"")
            );

            CREATE TABLE IF NOT EXISTS ""Friendships"" (
                ""Id"" uuid PRIMARY KEY,
                ""RequesterId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""AddresseeId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""Status"" integer NOT NULL DEFAULT 0,
                ""CreatedAt"" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ""UpdatedAt"" timestamptz NULL,
                CONSTRAINT ""UQ_Friendship"" UNIQUE (""RequesterId"", ""AddresseeId"")
            );

            CREATE TABLE IF NOT EXISTS ""ClanMessages"" (
                ""Id"" uuid PRIMARY KEY,
                ""ClanId"" uuid NOT NULL REFERENCES ""Clans""(""Id"") ON DELETE CASCADE,
                ""UserId"" uuid NOT NULL REFERENCES ""Users""(""Id"") ON DELETE CASCADE,
                ""Username"" varchar(50) NOT NULL DEFAULT '',
                ""UserLevel"" integer NOT NULL DEFAULT 1,
                ""Role"" integer NOT NULL DEFAULT 0,
                ""Content"" varchar(500) NOT NULL DEFAULT '',
                ""IsSystem"" boolean NOT NULL DEFAULT false,
                ""CreatedAt"" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""Role"" varchar(20) NOT NULL DEFAULT 'User';
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""IsBanned"" boolean NOT NULL DEFAULT false;
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""JokerEliminateThree"" integer NOT NULL DEFAULT 1;
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""JokerDoubleChance"" integer NOT NULL DEFAULT 1;
            ALTER TABLE ""Users"" ADD COLUMN IF NOT EXISTS ""JokerExtraTime"" integer NOT NULL DEFAULT 1;
        ");

        if (app.Environment.IsDevelopment())
        {
            await ExamSeeder.SeedAsync(db, app.Environment.ContentRootPath);
        }

        // Seed founder accounts as Admin
        var founders = new[] { "meteogr", "farukkemal" };
        foreach (var username in founders)
        {
            await db.Database.ExecuteSqlRawAsync(
                @"UPDATE ""Users"" SET ""Role"" = 'Admin' WHERE ""Username"" = {0}",
                username);
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"[Startup] Database init note: {ex.Message}");
    }
}

app.Run();
