using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.API.DTOs.Auth;

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Password
);
