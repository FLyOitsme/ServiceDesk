using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
[Produces("application/json")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? "client";
        if (userId is null)
            return Unauthorized();

        return role.ToLowerInvariant() switch
        {
            "client" => Ok(await GetClientDashboard(userId, ct)),
            "master" => Ok(await GetMasterDashboard(ct)),
            "admin" => Ok(await GetAdminDashboard(ct)),
            _ => Forbid()
        };
    }

    private async Task<ClientDashboardDto> GetClientDashboard(string userId, CancellationToken ct)
    {
        var baseQ = _db.Tickets.Where(t => t.ClientUserId == userId);

        var stats = new TicketStatsDto(
            await baseQ.CountAsync(t => t.Status == TicketStatus.InProgress, ct),
            await baseQ.CountAsync(t => t.Status == TicketStatus.Diagnostics, ct),
            await baseQ.CountAsync(t => t.Status == TicketStatus.Ready, ct),
            await baseQ.CountAsync(t => t.Status == TicketStatus.WaitingParts, ct));

        var tickets = await baseQ
            .AsNoTracking()
            .OrderByDescending(t => t.CreatedAtUtc)
            .Take(20)
            .Select(t => new TicketRowClientDto(
                t.PublicNumber,
                t.DeviceType.Name,
                t.DeviceModel.Name,
                t.Status.ToString(),
                t.Priority.ToString(),
                t.Cost,
                t.CreatedAtUtc))
            .ToListAsync(ct);

        var name = await _db.Users.Where(u => u.Id == userId).Select(u => u.DisplayName).FirstAsync(ct);

        return new ClientDashboardDto(name, stats, tickets);
    }

    private async Task<MasterDashboardDto> GetMasterDashboard(CancellationToken ct)
    {
        var stats = new TicketStatsDto(
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.InProgress, ct),
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.Diagnostics, ct),
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.Ready, ct),
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.WaitingParts, ct));

        var newRequests = await _db.Tickets
            .AsNoTracking()
            .Where(t => t.Status == TicketStatus.New)
            .OrderByDescending(t => t.CreatedAtUtc)
            .Take(20)
            .Select(t => new NewRequestRowDto(
                t.PublicNumber,
                t.Client.DisplayName,
                t.DeviceType.Name + " " + t.DeviceModel.Name,
                t.Description,
                t.CreatedAtUtc,
                t.Priority.ToString()))
            .ToListAsync(ct);

        return new MasterDashboardDto(stats, newRequests);
    }

    private async Task<AdminDashboardDto> GetAdminDashboard(CancellationToken ct)
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var monthEnd = monthStart.AddMonths(1);

        var monthlyIncome = await _db.FinancialTransactions
            .Where(x => x.Type == TransactionType.Income
                        && x.DateUtc >= monthStart && x.DateUtc < monthEnd
                        && x.Status == TransactionRecordStatus.Completed)
            .SumAsync(x => x.Amount, ct);

        var activeMasters = await _db.UserRoles
            .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
            .Where(x => x.Name == "master")
            .Select(x => x.UserId)
            .Distinct()
            .CountAsync(ct);

        var newClients = await _db.UserRoles
            .Join(_db.Roles, ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, r.Name })
            .Where(x => x.Name == "client")
            .Select(x => x.UserId)
            .Distinct()
            .CountAsync(ct);

        var totalTickets = await _db.Tickets.CountAsync(ct);

        var activities = await _db.ActivityLogs
            .AsNoTracking()
            .OrderByDescending(a => a.CreatedAtUtc)
            .Take(10)
            .Select(a => new ActivityRowDto(a.Title, a.Subtitle, a.Kind.ToString(), a.CreatedAtUtc))
            .ToListAsync(ct);

        return new AdminDashboardDto(
            new AdminStatsDto(totalTickets, monthlyIncome, activeMasters, newClients),
            activities);
    }
}

public record TicketStatsDto(int InProgress, int Diagnostics, int Ready, int WaitingParts);

public record TicketRowClientDto(
    string PublicNumber,
    string DeviceType,
    string DeviceModel,
    string Status,
    string Priority,
    decimal? Cost,
    DateTime CreatedAtUtc);

public record ClientDashboardDto(string WelcomeName, TicketStatsDto Stats, IReadOnlyList<TicketRowClientDto> Tickets);

public record NewRequestRowDto(
    string PublicNumber,
    string ClientName,
    string Device,
    string Description,
    DateTime CreatedAtUtc,
    string Priority);

public record MasterDashboardDto(TicketStatsDto Stats, IReadOnlyList<NewRequestRowDto> NewRequests);

public record AdminStatsDto(int TotalTickets, decimal MonthlyIncome, int ActiveMasters, int NewClients);

public record ActivityRowDto(string Title, string? Subtitle, string Kind, DateTime CreatedAtUtc);

public record AdminDashboardDto(AdminStatsDto Stats, IReadOnlyList<ActivityRowDto> Activities);
