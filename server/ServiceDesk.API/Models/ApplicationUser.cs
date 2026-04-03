using Microsoft.AspNetCore.Identity;

namespace ServiceDesk.API.Models;

public class ApplicationUser : IdentityUser
{
    public string DisplayName { get; set; } = string.Empty;
}
