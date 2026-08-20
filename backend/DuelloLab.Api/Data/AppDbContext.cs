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
    }
}
