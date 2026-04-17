using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.DTOs;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/finances")]
[Authorize(Roles = "admin")]
[Produces("application/json")]
public class FinanceController : ControllerBase
{
    private readonly AppDbContext _db;

    public FinanceController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("summary")]
    public async Task<ActionResult<FinanceSummaryDto>> Summary(
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        CancellationToken ct)
    {
        var q = _db.FinancialTransactions.AsNoTracking().AsQueryable();
        if (start is not null)
            q = q.Where(x => x.DateUtc >= DateTime.SpecifyKind(start.Value, DateTimeKind.Utc));
        if (end is not null)
            q = q.Where(x => x.DateUtc < DateTime.SpecifyKind(end.Value, DateTimeKind.Utc).AddDays(1));

        var income = await q.Where(x => x.Type == TransactionType.Income).SumAsync(x => x.Amount, ct);
        var expense = await q.Where(x => x.Type == TransactionType.Expense).SumAsync(x => x.Amount, ct);
        var profit = income - expense;
        return Ok(new FinanceSummaryDto(income, expense, profit));
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<PagedResult<TransactionRowDto>>> Transactions(
        [FromQuery] DateTime? start,
        [FromQuery] DateTime? end,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.FinancialTransactions.AsNoTracking().AsQueryable();
        if (start is not null)
            q = q.Where(x => x.DateUtc >= DateTime.SpecifyKind(start.Value, DateTimeKind.Utc));
        if (end is not null)
            q = q.Where(x => x.DateUtc < DateTime.SpecifyKind(end.Value, DateTimeKind.Utc).AddDays(1));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(x => x.DateUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new TransactionRowDto(
                x.PublicNumber,
                x.Ticket != null ? x.Ticket.PublicNumber : null,
                x.Description,
                x.Type.ToString(),
                x.Amount,
                x.DateUtc,
                x.Status.ToString()))
            .ToListAsync(ct);

        return Ok(new PagedResult<TransactionRowDto>(items, total, page, pageSize));
    }
}

public record FinanceSummaryDto(decimal Income, decimal Expense, decimal Profit);

public record TransactionRowDto(
    string PublicNumber,
    string? TicketNumber,
    string Description,
    string Type,
    decimal Amount,
    DateTime DateUtc,
    string Status);
