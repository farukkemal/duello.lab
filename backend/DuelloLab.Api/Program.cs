using System.Text;
using DuelloLab.Api.Data;
using DuelloLab.Api.Hubs;
using DuelloLab.Api.Middleware;
using DuelloLab.Api.Services;
using DuelloLab.Api.Services.Realtime;
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

builder.Services.AddAuthorization();

// DI - Application Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IExamService, ExamService>();
builder.Services.AddScoped<IRoomService, RoomService>();

// Controllers + JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

// CORS - allow React dev server + SignalR credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
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

app.Run();
