using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using ServiceDesk.API.Models;
using ServiceDesk.API.Services;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _users;
    private readonly RoleManager<IdentityRole> _roles;
    private readonly SignInManager<ApplicationUser> _signIn;
    private readonly JwtService _jwt;

    public AuthController(
        UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles,
        SignInManager<ApplicationUser> signIn,
        JwtService jwt)
    {
        _users  = users;
        _roles  = roles;
        _signIn = signIn;
        _jwt    = jwt;
    }

    [HttpPost("register")]
    [ProducesResponseType(typeof(TokenResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 400)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var user = new ApplicationUser
        {
            UserName       = req.Email,
            Email          = req.Email,
            DisplayName    = req.DisplayName,
            PhoneNumber    = req.Phone,
            EmailConfirmed = true,
        };

        var result = await _users.CreateAsync(user, req.Password);
        if (!result.Succeeded)
        {
            foreach (var err in result.Errors)
                ModelState.AddModelError(err.Code, err.Description);
            return ValidationProblem(ModelState);
        }

        if (!await _roles.RoleExistsAsync("client"))
            await _roles.CreateAsync(new IdentityRole("client"));

        await _users.AddToRoleAsync(user, "client");

        var token = _jwt.GenerateToken(user, "client");
        return Ok(new TokenResponse(token));
    }

    [HttpPost("login")]
    [ProducesResponseType(typeof(TokenResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 400)]
    [ProducesResponseType(typeof(ProblemDetails), 401)]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (!ModelState.IsValid)
            return ValidationProblem(ModelState);

        var user = await _users.FindByEmailAsync(req.Email);
        if (user is null)
            return Unauthorized(ProblemOf(401, "Неверный логин или пароль"));

        var check = await _signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: false);
        if (!check.Succeeded)
            return Unauthorized(ProblemOf(401, "Неверный логин или пароль"));

        var roles = await _users.GetRolesAsync(user);
        var role  = TryResolveRole(roles);
        if (role is null)
            return Unauthorized(ProblemOf(401, "У пользователя должна быть роль client, master или admin."));

        var token = _jwt.GenerateToken(user, role);
        return Ok(new TokenResponse(token));
    }

    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(MeResponse), 200)]
    [ProducesResponseType(typeof(ProblemDetails), 401)]
    public async Task<IActionResult> Me()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                  ?? User.FindFirst("sub")?.Value;

        if (userId is null)
            return Unauthorized(ProblemOf(401, "Токен недействителен"));

        var user = await _users.FindByIdAsync(userId);
        if (user is null)
            return Unauthorized(ProblemOf(401, "Пользователь не найден"));

        var roles = await _users.GetRolesAsync(user);
        var role  = TryResolveRole(roles);
        if (role is null)
            return Unauthorized(ProblemOf(401, "У пользователя должна быть роль client, master или admin."));

        return Ok(new MeResponse(user.Id, user.Email!, user.DisplayName, role));
    }

    private static string? TryResolveRole(IList<string> roles)
    {
        var set = new HashSet<string>(roles, StringComparer.OrdinalIgnoreCase);
        if (set.Contains("admin")) return "admin";
        if (set.Contains("master")) return "master";
        if (set.Contains("client")) return "client";
        return null;
    }

    private static ProblemDetails ProblemOf(int status, string detail) => new()
    {
        Status = status,
        Title  = status switch { 401 => "Unauthorized", 403 => "Forbidden", _ => "Error" },
        Detail = detail,
    };
}

public record RegisterRequest(
    [Required, MaxLength(100)] string DisplayName,
    [Required, EmailAddress] string Email,
    [MaxLength(32)] string? Phone,
    [Required, MinLength(6)] string Password);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password);

public record TokenResponse(string AccessToken);

public record MeResponse(string Id, string Email, string DisplayName, string Role);
