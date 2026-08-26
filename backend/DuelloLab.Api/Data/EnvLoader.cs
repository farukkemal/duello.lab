using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Microsoft.Extensions.Configuration;

namespace DuelloLab.Api.Data;

public static class EnvLoader
{
    public static void Load()
    {
        var dirs = new List<string>
        {
            Directory.GetCurrentDirectory(),
            AppContext.BaseDirectory
        };

        var current = new DirectoryInfo(Directory.GetCurrentDirectory());
        for (int i = 0; i < 4 && current != null; i++)
        {
            dirs.Add(current.FullName);
            current = current.Parent;
        }

        foreach (var dir in dirs.Distinct())
        {
            var envPath = Path.Combine(dir, ".env");
            if (File.Exists(envPath))
            {
                foreach (var line in File.ReadAllLines(envPath))
                {
                    var trimmed = line.Trim();
                    if (string.IsNullOrWhiteSpace(trimmed) || trimmed.StartsWith('#'))
                        continue;

                    var idx = trimmed.IndexOf('=');
                    if (idx > 0)
                    {
                        var key = trimmed[..idx].Trim();
                        var val = trimmed[(idx + 1)..].Trim();

                        if ((val.StartsWith('"') && val.EndsWith('"')) || (val.StartsWith('\'') && val.EndsWith('\'')))
                        {
                            val = val[1..^1];
                        }

                        if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                        {
                            Environment.SetEnvironmentVariable(key, val);
                        }
                    }
                }
                break;
            }
        }
    }

    public static string ResolveConnectionString(IConfiguration configuration)
    {
        var raw = Environment.GetEnvironmentVariable("DATABASE_URL")
            ?? configuration["DATABASE_URL"]
            ?? configuration.GetConnectionString("DefaultConnection")
            ?? Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");

        if (string.IsNullOrWhiteSpace(raw))
        {
            throw new InvalidOperationException("PostgreSQL Connection String / DATABASE_URL is not configured.");
        }

        return NormalizeConnectionString(raw);
    }

    public static string NormalizeConnectionString(string input)
    {
        var trimmed = input.Trim();
        if (trimmed.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
        {
            var schemeIdx = trimmed.IndexOf("://", StringComparison.Ordinal);
            var rest = trimmed[(schemeIdx + 3)..];

            var atIdx = rest.LastIndexOf('@');
            if (atIdx == -1)
            {
                throw new FormatException("Invalid PostgreSQL URI format: missing '@'");
            }

            var userInfo = rest[..atIdx];
            var hostPortAndDb = rest[(atIdx + 1)..];

            var colonIdx = userInfo.IndexOf(':');
            var username = colonIdx != -1 ? userInfo[..colonIdx] : userInfo;
            var rawPassword = colonIdx != -1 ? userInfo[(colonIdx + 1)..] : string.Empty;

            if (rawPassword.StartsWith('[') && rawPassword.EndsWith(']'))
            {
                rawPassword = rawPassword[1..^1];
            }
            var password = Uri.UnescapeDataString(rawPassword);
            username = Uri.UnescapeDataString(username);

            var slashIdx = hostPortAndDb.IndexOf('/');
            var hostAndPort = slashIdx != -1 ? hostPortAndDb[..slashIdx] : hostPortAndDb;
            var dbAndQuery = slashIdx != -1 ? hostPortAndDb[(slashIdx + 1)..] : "postgres";

            var dbName = dbAndQuery.Split('?')[0];
            if (string.IsNullOrWhiteSpace(dbName)) dbName = "postgres";

            var hostParts = hostAndPort.Split(':');
            var host = hostParts[0];
            var port = hostParts.Length > 1 ? hostParts[1] : "5432";

            return $"Host={host};Port={port};Database={dbName};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true";
        }

        // Key-Value format: ensure SSL Mode if remote host (e.g. supabase)
        if (!trimmed.Contains("SSL Mode", StringComparison.OrdinalIgnoreCase) && 
            !trimmed.Contains("localhost", StringComparison.OrdinalIgnoreCase) && 
            !trimmed.Contains("postgres", StringComparison.OrdinalIgnoreCase))
        {
            trimmed += ";SSL Mode=Require;Trust Server Certificate=true";
        }

        return trimmed;
    }
}
