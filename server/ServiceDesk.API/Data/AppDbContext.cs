using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<DeviceType> DeviceTypes => Set<DeviceType>();
    public DbSet<Manufacturer> Manufacturers => Set<Manufacturer>();
    public DbSet<DeviceModel> DeviceModels => Set<DeviceModel>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<FinancialTransaction> FinancialTransactions => Set<FinancialTransaction>();
    public DbSet<InventoryItem> InventoryItems => Set<InventoryItem>();
    public DbSet<ActivityLog> ActivityLogs => Set<ActivityLog>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Ticket>(e =>
        {
            e.HasIndex(x => x.PublicNumber).IsUnique();
            e.Property(x => x.Cost).HasPrecision(18, 2);
            e.HasOne(x => x.Client)
                .WithMany()
                .HasForeignKey(x => x.ClientUserId)
                .OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Master)
                .WithMany()
                .HasForeignKey(x => x.MasterUserId)
                .OnDelete(DeleteBehavior.SetNull);
            e.HasOne(x => x.DeviceType).WithMany().HasForeignKey(x => x.DeviceTypeId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.Manufacturer).WithMany().HasForeignKey(x => x.ManufacturerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.DeviceModel).WithMany().HasForeignKey(x => x.DeviceModelId).OnDelete(DeleteBehavior.Restrict);
        });

        builder.Entity<FinancialTransaction>(e =>
        {
            e.HasIndex(x => x.PublicNumber).IsUnique();
            e.Property(x => x.Amount).HasPrecision(18, 2);
            e.HasOne(x => x.Ticket)
                .WithMany()
                .HasForeignKey(x => x.TicketId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<InventoryItem>(e =>
        {
            e.Property(x => x.UnitPrice).HasPrecision(18, 2);
        });
    }
}
