using ServiceDesk.API.DTOs.Auth;

namespace ServiceDesk.API.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<MeResponse> GetMeAsync(string userId);
}
