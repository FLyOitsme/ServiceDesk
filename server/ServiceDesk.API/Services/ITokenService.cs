using ServiceDesk.API.Models;

namespace ServiceDesk.API.Services;

public interface ITokenService
{
    string GenerateToken(ApplicationUser user, string role);
}
