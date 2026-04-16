using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Data;

public static class DbInitializer
{
    private record SeedUser(string Email, string Password, string DisplayName, string Role);

    private static readonly SeedUser[] Users =
    [
        new("admin@demo.com", "Admin123!", "Анна Админова", "admin"),
        new("alex@example.com", "Master123!", "Алексей Мастеров", "master"),
        new("dmitry@example.com", "Master123!", "Дмитрий Сервисов", "master"),
        new("ivan@example.com", "Client123!", "Иван Петров", "client"),
        new("maria@example.com", "Client123!", "Мария Сидорова", "client"),
    ];

    public static async Task SeedAsync(IServiceProvider services)
    {
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        foreach (var role in new[] { "client", "master", "admin" })
        {
            if (!await roleManager.RoleExistsAsync(role))
                await roleManager.CreateAsync(new IdentityRole(role));
        }

        foreach (var seed in Users)
        {
            if (await userManager.FindByEmailAsync(seed.Email) is not null)
                continue;

            var user = new ApplicationUser
            {
                UserName = seed.Email,
                Email = seed.Email,
                DisplayName = seed.DisplayName,
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(user, seed.Password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, seed.Role);
        }

        await SeedDomainAsync(services);
    }

    private static async Task SeedDomainAsync(IServiceProvider services)
    {
        var db = services.GetRequiredService<AppDbContext>();
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        if (await db.DeviceTypes.AnyAsync())
            return;

        var laptop = new DeviceType { Name = "Ноутбук" };
        var phone = new DeviceType { Name = "Смартфон" };
        var pc = new DeviceType { Name = "ПК" };
        db.DeviceTypes.AddRange(laptop, phone, pc);
        await db.SaveChangesAsync();

        var dell = new Manufacturer { DeviceTypeId = laptop.Id, Name = "Dell" };
        var hp = new Manufacturer { DeviceTypeId = laptop.Id, Name = "HP" };
        var samsung = new Manufacturer { DeviceTypeId = phone.Id, Name = "Samsung" };
        var apple = new Manufacturer { DeviceTypeId = phone.Id, Name = "Apple" };
        var custom = new Manufacturer { DeviceTypeId = pc.Id, Name = "Custom" };
        db.Manufacturers.AddRange(dell, hp, samsung, apple, custom);
        await db.SaveChangesAsync();

        var mXps = new DeviceModel { ManufacturerId = dell.Id, Name = "XPS 15" };
        var mPav = new DeviceModel { ManufacturerId = hp.Id, Name = "Pavilion" };
        var mS21 = new DeviceModel { ManufacturerId = samsung.Id, Name = "Galaxy S21" };
        var mI12 = new DeviceModel { ManufacturerId = apple.Id, Name = "iPhone 12" };
        var mGaming = new DeviceModel { ManufacturerId = custom.Id, Name = "Gaming PC" };
        db.DeviceModels.AddRange(mXps, mPav, mS21, mI12, mGaming);
        await db.SaveChangesAsync();

        async Task<string> UserId(string email)
        {
            var u = await userManager.FindByEmailAsync(email);
            return u?.Id ?? throw new InvalidOperationException($"Seed user {email} not found.");
        }

        var ivanId = await UserId("ivan@example.com");
        var mariaId = await UserId("maria@example.com");
        var alexId = await UserId("alex@example.com");
        var dmitryId = await UserId("dmitry@example.com");

        var t1 = new Ticket
        {
            PublicNumber = "REQ-001",
            ClientUserId = ivanId,
            MasterUserId = alexId,
            DeviceTypeId = laptop.Id,
            ManufacturerId = dell.Id,
            DeviceModelId = mXps.Id,
            Description = "Не включается",
            Status = TicketStatus.Ready,
            Priority = TicketPriority.Normal,
            Cost = 5000m,
            CreatedAtUtc = new DateTime(2026, 4, 8, 10, 0, 0, DateTimeKind.Utc)
        };
        var t2 = new Ticket
        {
            PublicNumber = "REQ-002",
            ClientUserId = ivanId,
            MasterUserId = alexId,
            DeviceTypeId = phone.Id,
            ManufacturerId = samsung.Id,
            DeviceModelId = mS21.Id,
            Description = "Разбит экран",
            Status = TicketStatus.InProgress,
            Priority = TicketPriority.High,
            Cost = 3500m,
            CreatedAtUtc = new DateTime(2026, 4, 5, 12, 0, 0, DateTimeKind.Utc)
        };
        var t3 = new Ticket
        {
            PublicNumber = "REQ-003",
            ClientUserId = mariaId,
            MasterUserId = dmitryId,
            DeviceTypeId = laptop.Id,
            ManufacturerId = hp.Id,
            DeviceModelId = mPav.Id,
            Description = "Перегрев",
            Status = TicketStatus.Diagnostics,
            Priority = TicketPriority.Low,
            Cost = null,
            CreatedAtUtc = new DateTime(2026, 4, 3, 9, 0, 0, DateTimeKind.Utc)
        };
        var t4 = new Ticket
        {
            PublicNumber = "REQ-004",
            ClientUserId = mariaId,
            MasterUserId = null,
            DeviceTypeId = pc.Id,
            ManufacturerId = custom.Id,
            DeviceModelId = mGaming.Id,
            Description = "Закупка запчастей",
            Status = TicketStatus.New,
            Priority = TicketPriority.Urgent,
            Cost = null,
            CreatedAtUtc = new DateTime(2026, 4, 6, 8, 0, 0, DateTimeKind.Utc)
        };
        var t5 = new Ticket
        {
            PublicNumber = "REQ-005",
            ClientUserId = ivanId,
            MasterUserId = null,
            DeviceTypeId = pc.Id,
            ManufacturerId = custom.Id,
            DeviceModelId = mGaming.Id,
            Description = "Не запускается",
            Status = TicketStatus.New,
            Priority = TicketPriority.Low,
            Cost = null,
            CreatedAtUtc = new DateTime(2026, 4, 12, 14, 0, 0, DateTimeKind.Utc)
        };

        db.Tickets.AddRange(t1, t2, t3, t4, t5);
        await db.SaveChangesAsync();

        db.FinancialTransactions.AddRange(
            new FinancialTransaction
            {
                PublicNumber = "TRX-001",
                TicketId = t2.Id,
                Description = "Оплата ремонта",
                Type = TransactionType.Income,
                Amount = 3500m,
                DateUtc = new DateTime(2026, 4, 10, 12, 0, 0, DateTimeKind.Utc),
                Status = TransactionRecordStatus.Completed
            },
            new FinancialTransaction
            {
                PublicNumber = "TRX-002",
                TicketId = t4.Id,
                Description = "Закупка запчастей",
                Type = TransactionType.Expense,
                Amount = 2500m,
                DateUtc = new DateTime(2026, 4, 9, 10, 0, 0, DateTimeKind.Utc),
                Status = TransactionRecordStatus.Completed
            },
            new FinancialTransaction
            {
                PublicNumber = "TRX-003",
                TicketId = t1.Id,
                Description = "Оплата ремонта",
                Type = TransactionType.Income,
                Amount = 5000m,
                DateUtc = new DateTime(2026, 4, 11, 9, 0, 0, DateTimeKind.Utc),
                Status = TransactionRecordStatus.Pending
            });

        db.InventoryItems.AddRange(
            new InventoryItem
            {
                Name = "Экран Samsung Gal",
                Category = "Дисплеи",
                Quantity = 5,
                MinQuantity = 2,
                UnitPrice = 4500m,
                SupplierName = "TechSupply"
            },
            new InventoryItem
            {
                Name = "Батарея iPhone 12",
                Category = "Аккумуляторы",
                Quantity = 1,
                MinQuantity = 1,
                UnitPrice = 3200m,
                SupplierName = "AppleParts"
            },
            new InventoryItem
            {
                Name = "SSD 1TB",
                Category = "Накопители",
                Quantity = 0,
                MinQuantity = 1,
                UnitPrice = 5500m,
                SupplierName = "StoragePro"
            },
            new InventoryItem
            {
                Name = "ОЗУ DDR4 16GB",
                Category = "Память",
                Quantity = 10,
                MinQuantity = 2,
                UnitPrice = 2800m,
                SupplierName = "MemoryHouse"
            });

        var now = DateTime.UtcNow;
        db.ActivityLogs.AddRange(
            new ActivityLog
            {
                Title = "Новая заявка создана",
                Subtitle = "Иван Петров",
                Kind = ActivityKind.NewTicket,
                CreatedAtUtc = now.AddMinutes(-5)
            },
            new ActivityLog
            {
                Title = "Заявка завершена",
                Subtitle = "Алексей Мастеров",
                Kind = ActivityKind.TicketCompleted,
                CreatedAtUtc = now.AddMinutes(-15)
            },
            new ActivityLog
            {
                Title = "Оплата получена",
                Subtitle = "Мария Сидорова",
                Kind = ActivityKind.Payment,
                CreatedAtUtc = now.AddMinutes(-30)
            },
            new ActivityLog
            {
                Title = "Новый клиент зарегистрирован",
                Subtitle = "Пётр Иванов",
                Kind = ActivityKind.UserRegistered,
                CreatedAtUtc = now.AddHours(-1)
            });

        await db.SaveChangesAsync();
    }
}
