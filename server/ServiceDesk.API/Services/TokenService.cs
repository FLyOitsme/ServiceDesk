using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Services;

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Единый формат роли для JWT и [Authorize(Roles = "...")] — нижний регистр (client | master | admin).
    /// </summary>
    public static string NormalizeRole(string? role) =>
        (role ?? "client").Trim().ToLowerInvariant() switch
        {
            "administrator" => "admin",
            "operator" => "master",
            var r => r is "admin" or "master" or "client" ? r : "client"
        };

    public string GenerateToken(ApplicationUser user, string role)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("Jwt:Key is not configured.");
        var jwtIssuer = _configuration["Jwt:Issuer"]
            ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
        var jwtAudience = _configuration["Jwt:Audience"]
            ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var normalizedRole = NormalizeRole(role);

        // ClaimTypes.Role — то же имя, что RoleClaimType в JwtBearer; иначе [Authorize(Roles)] даёт 403.
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id),
            new Claim(JwtRegisteredClaimNames.Email, user.Email!),
            new Claim(ClaimTypes.Role, normalizedRole),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiresHours = _configuration.GetValue<int>("Jwt:ExpiresHours", 24);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresHours),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
