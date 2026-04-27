using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.DTOs;
using ServiceDesk.API.Exceptions;
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

    /// <summary>Подтвердить оплату (ожидающая транзакция → завершена).</summary>
    [HttpPatch("transactions/{publicNumber}/complete")]
    public async Task<IActionResult> CompleteTransaction(string publicNumber, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(publicNumber))
            return BadRequest();

        var tx = await _db.FinancialTransactions.FirstOrDefaultAsync(x => x.PublicNumber == publicNumber.Trim(), ct);
        if (tx is null)
            return NotFound();

        if (tx.Status == TransactionRecordStatus.Completed)
            return NoContent();

        if (tx.Status != TransactionRecordStatus.Pending)
            throw new BusinessException("Транзакция не ожидает подтверждения оплаты.");

        tx.Status = TransactionRecordStatus.Completed;
        await _db.SaveChangesAsync(ct);

        if (tx.Type == TransactionType.Income && tx.TicketId is { } tid)
            await SyncTicketCostFromCompletedIncomeAsync(tid, ct);

        return NoContent();
    }

    /// <summary>Добавить оплату (доход) к заявке.</summary>
    [HttpPost("transactions")]
    public async Task<ActionResult<CreatedTransactionDto>> CreatePayment([FromBody] CreatePaymentBody body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.TicketNumber))
            throw new BusinessException("Укажите номер заявки.");

        if (body.Amount <= 0)
            throw new BusinessException("Сумма должна быть больше нуля.");

        var ticketKey = body.TicketNumber.Trim();
        var ticket = int.TryParse(ticketKey, out var numericId)
            ? await _db.Tickets.FirstOrDefaultAsync(t => t.Id == numericId, ct)
            : await _db.Tickets.FirstOrDefaultAsync(t => t.PublicNumber == ticketKey, ct);

        if (ticket is null)
            throw new BusinessException("Заявка не найдена.");

        var desc = string.IsNullOrWhiteSpace(body.Description)
            ? $"Оплата по заявке {ticket.PublicNumber}"
            : body.Description.Trim();

        var status = body.Pending ? TransactionRecordStatus.Pending : TransactionRecordStatus.Completed;
        var amount = decimal.Round(body.Amount, 2, MidpointRounding.AwayFromZero);

        var tempKey = $"TMP-{Guid.NewGuid():N}";
        var tx = new FinancialTransaction
        {
            PublicNumber = tempKey,
            TicketId = ticket.Id,
            Description = desc,
            Type = TransactionType.Income,
            Amount = amount,
            DateUtc = DateTime.UtcNow,
            Status = status
        };

        _db.FinancialTransactions.Add(tx);
        await _db.SaveChangesAsync(ct);

        tx.PublicNumber = $"TRX-{tx.Id:D3}";
        await _db.SaveChangesAsync(ct);

        await SyncTicketCostFromCompletedIncomeAsync(ticket.Id, ct);

        var dto = new CreatedTransactionDto(tx.PublicNumber, ticket.PublicNumber, amount, tx.Status.ToString());
        return Created($"/api/finances/transactions/{Uri.EscapeDataString(tx.PublicNumber)}", dto);
    }

    /// <summary>Стоимость заявки = сумма завершённых поступлений по ней.</summary>
    private async Task SyncTicketCostFromCompletedIncomeAsync(int ticketId, CancellationToken ct)
    {
        var sum = await _db.FinancialTransactions
            .Where(f =>
                f.TicketId == ticketId
                && f.Type == TransactionType.Income
                && f.Status == TransactionRecordStatus.Completed)
            .SumAsync(f => f.Amount, ct);

        if (sum <= 0m)
            return;

        var t = await _db.Tickets.FirstOrDefaultAsync(x => x.Id == ticketId, ct);
        if (t is null)
            return;

        t.Cost = sum;
        await _db.SaveChangesAsync(ct);
    }
}

public record FinanceSummaryDto(decimal Income, decimal Expense, decimal Profit);

public record CreatePaymentBody(string TicketNumber, decimal Amount, string? Description = null, bool Pending = false);

public record CreatedTransactionDto(string PublicNumber, string TicketNumber, decimal Amount, string Status);

public record TransactionRowDto(
    string PublicNumber,
    string? TicketNumber,
    string Description,
    string Type,
    decimal Amount,
    DateTime DateUtc,
    string Status);
