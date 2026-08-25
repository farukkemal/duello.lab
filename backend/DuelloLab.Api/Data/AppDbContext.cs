using DuelloLab.Api.Entities;
using DuelloLab.Api.Enums;
using Microsoft.EntityFrameworkCore;

namespace DuelloLab.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Exam> Exams => Set<Exam>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<UserResult> UserResults => Set<UserResult>();
    public DbSet<Clan> Clans => Set<Clan>();
    public DbSet<ClanMember> ClanMembers => Set<ClanMember>();
    public DbSet<ClanMessage> ClanMessages => Set<ClanMessage>();
    public DbSet<Friendship> Friendships => Set<Friendship>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Username).IsUnique();
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
            entity.Property(u => u.Email).HasMaxLength(100).IsRequired();
            entity.Property(u => u.PasswordHash).IsRequired();
        });

        // Exam configuration
        modelBuilder.Entity<Exam>(entity =>
        {
            entity.Property(e => e.Title).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Category).HasMaxLength(50).IsRequired();
        });

        // Question configuration
        modelBuilder.Entity<Question>(entity =>
        {
            entity.Property(q => q.Choices)
                .HasColumnType("jsonb");

            entity.Property(q => q.PoolType)
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(q => q.Branch).HasMaxLength(100).IsRequired();
            entity.Property(q => q.QuestionText).IsRequired();
            entity.Property(q => q.CorrectAnswer).HasMaxLength(1).IsRequired();

            entity.HasIndex(q => new { q.PoolType, q.AvailableAfter });
            entity.HasIndex(q => q.ExamId);

            entity.HasOne(q => q.Exam)
                .WithMany(e => e.Questions)
                .HasForeignKey(q => q.ExamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // UserResult configuration
        modelBuilder.Entity<UserResult>(entity =>
        {
            entity.Property(r => r.NetScore).HasPrecision(10, 2);

            entity.HasIndex(r => r.UserId);
            entity.HasIndex(r => r.ExamId);

            entity.HasOne(r => r.User)
                .WithMany(u => u.UserResults)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(r => r.Exam)
                .WithMany(e => e.UserResults)
                .HasForeignKey(r => r.ExamId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Clan configuration
        modelBuilder.Entity<Clan>(entity =>
        {
            entity.HasIndex(c => c.Name).IsUnique();
            entity.Property(c => c.Name).HasMaxLength(50).IsRequired();
            entity.Property(c => c.Description).HasMaxLength(200);
            entity.Property(c => c.Tag).HasMaxLength(6);
            entity.Property(c => c.BadgeIcon).HasMaxLength(10);
        });

        // ClanMember configuration
        modelBuilder.Entity<ClanMember>(entity =>
        {
            entity.HasIndex(cm => new { cm.ClanId, cm.UserId }).IsUnique();

            entity.HasOne(cm => cm.Clan)
                .WithMany(c => c.Members)
                .HasForeignKey(cm => cm.ClanId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cm => cm.User)
                .WithMany()
                .HasForeignKey(cm => cm.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // ClanMessage configuration
        modelBuilder.Entity<ClanMessage>(entity =>
        {
            entity.HasIndex(cm => new { cm.ClanId, cm.CreatedAt });
            entity.Property(cm => cm.Content).HasMaxLength(500).IsRequired();

            entity.HasOne(cm => cm.Clan)
                .WithMany()
                .HasForeignKey(cm => cm.ClanId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(cm => cm.User)
                .WithMany()
                .HasForeignKey(cm => cm.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Friendship configuration
        modelBuilder.Entity<Friendship>(entity =>
        {
            entity.HasIndex(f => new { f.RequesterId, f.AddresseeId }).IsUnique();

            entity.HasOne(f => f.Requester)
                .WithMany()
                .HasForeignKey(f => f.RequesterId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(f => f.Addressee)
                .WithMany()
                .HasForeignKey(f => f.AddresseeId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
