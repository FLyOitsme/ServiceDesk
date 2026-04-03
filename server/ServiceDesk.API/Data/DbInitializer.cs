using Microsoft.AspNetCore.Identity;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Data;

public static class DbInitializer
{
    private record SeedUser(string Email, string Password, string DisplayName, string Role);

    private static readonly SeedUser[] Users =
    [
        new("admin@demo.com",    "Admin123!",    "Анна Админова",    "admin"),
        new("master@demo.com", "Master123!", "Иван Мастеров", "master"),
        new("client@demo.com",  "Client123!",  "Андрей Клиентов",  "client"),
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
                UserName       = seed.Email,
                Email          = seed.Email,
                DisplayName    = seed.DisplayName,
                EmailConfirmed = true,
            };

            var result = await userManager.CreateAsync(user, seed.Password);
            if (result.Succeeded)
                await userManager.AddToRoleAsync(user, seed.Role);
        }
    }
}
