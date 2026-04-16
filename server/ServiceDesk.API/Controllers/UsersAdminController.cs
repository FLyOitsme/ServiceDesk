using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.Exceptions;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "admin")]
[Produces("application/json")]
public class UsersAdminController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _users;

    public UsersAdminController(AppDbContext db, UserManager<ApplicationUser> users)
    {
        _db = db;
        _users = users;
    }

    private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedException("Missing user id.");

    [HttpGet("stats")]
    public async Task<ActionResult<UserStatsDto>> Stats(CancellationToken ct)
    {
        var roles = await _db.Roles.AsNoTracking().Where(r =>
                r.Name == "client" || r.Name == "master" || r.Name == "admin")
            .ToDictionaryAsync(r => r.Name!, r => r.Id, ct);

        async Task<int> CountInRole(string name) =>
            roles.TryGetValue(name, out var rid)
                ? await _db.UserRoles.CountAsync(ur => ur.RoleId == rid, ct)
                : 0;

        return Ok(new UserStatsDto(
            await CountInRole("client"),
            await CountInRole("master"),
            await CountInRole("admin")));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<AdminUserRowDto>>> List(CancellationToken ct)
    {
        var rows = await (
                from u in _db.Users.AsNoTracking()
                join ur in _db.UserRoles on u.Id equals ur.UserId
                join r in _db.Roles on ur.RoleId equals r.Id
                orderby u.DisplayName
                select new AdminUserRowDto(u.Id, u.DisplayName, u.Email!, r.Name!, true))
            .ToListAsync(ct);

        return Ok(rows);
    }

    public record UpdateUserBody(string DisplayName, string Email, string Role);

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(string id, [FromBody] UpdateUserBody body, CancellationToken ct)
    {
        var user = await _users.FindByIdAsync(id);
        if (user is null)
            return NotFound();

        user.DisplayName = body.DisplayName.Trim();
        user.Email = body.Email.Trim();
        user.UserName = body.Email.Trim();
        user.NormalizedEmail = _users.NormalizeEmail(body.Email);
        user.NormalizedUserName = _users.NormalizeName(body.Email);

        var updateResult = await _users.UpdateAsync(user);
        if (!updateResult.Succeeded)
            throw new BusinessException(string.Join(" ", updateResult.Errors.Select(e => e.Description)));

        var currentRoles = await _users.GetRolesAsync(user);
        await _users.RemoveFromRolesAsync(user, currentRoles);
        await _users.AddToRoleAsync(user, body.Role.Trim().ToLowerInvariant());

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        if (id == CurrentUserId)
            throw new BusinessException("Нельзя удалить свою учётную запись.");

        var user = await _users.FindByIdAsync(id);
        if (user is null)
            return NotFound();

        var result = await _users.DeleteAsync(user);
        if (!result.Succeeded)
            throw new BusinessException(string.Join(" ", result.Errors.Select(e => e.Description)));

        return NoContent();
    }
}

public record UserStatsDto(int Clients, int Masters, int Admins);

public record AdminUserRowDto(string Id, string DisplayName, string Email, string Role, bool Active);
