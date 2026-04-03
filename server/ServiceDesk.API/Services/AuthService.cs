using Microsoft.AspNetCore.Identity;
using ServiceDesk.API.DTOs.Auth;
using ServiceDesk.API.Exceptions;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Services;

public class AuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly ITokenService _tokenService;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        ILogger<AuthService> logger)
    {
        _userManager = userManager;
        _tokenService = tokenService;
        _logger = logger;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request)
    {
        var existingUser = await _userManager.FindByEmailAsync(request.Email);
        if (existingUser is not null)
        {
            throw new BusinessException("Email is already registered.");
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join(" ", result.Errors.Select(e => e.Description));
            throw new BusinessException(errors);
        }

        var roleResult = await _userManager.AddToRoleAsync(user, "client");
        if (!roleResult.Succeeded)
        {
            _logger.LogError("Failed to assign client role to user {UserId}", user.Id);
            throw new BusinessException("Failed to assign default role.");
        }

        var token = _tokenService.GenerateToken(user, "client");
        _logger.LogInformation("User {Email} registered successfully", user.Email);

        return new AuthResponse(token);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email);
        if (user is null || !await _userManager.CheckPasswordAsync(user, request.Password))
        {
            throw new UnauthorizedException("Invalid email or password.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "client";

        var token = _tokenService.GenerateToken(user, role);
        _logger.LogInformation("User {Email} logged in successfully", user.Email);

        return new AuthResponse(token);
    }

    public async Task<MeResponse> GetMeAsync(string userId)
    {
        var user = await _userManager.FindByIdAsync(userId);
        if (user is null)
        {
            throw new UnauthorizedException("User not found.");
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? "client";

        return new MeResponse(user.Id, user.Email!, user.DisplayName, role);
    }
}
