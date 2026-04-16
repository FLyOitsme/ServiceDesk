using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.DTOs;
using ServiceDesk.API.Exceptions;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/inventory")]
[Authorize(Roles = "master,admin")]
[Produces("application/json")]
public class InventoryController : ControllerBase
{
    private readonly AppDbContext _db;

    public InventoryController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("categories")]
    public async Task<ActionResult<IReadOnlyList<string>>> Categories(CancellationToken ct)
    {
        var list = await _db.InventoryItems.AsNoTracking()
            .Select(x => x.Category)
            .Distinct()
            .OrderBy(x => x)
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<InventoryRowDto>>> List(
        [FromQuery] string? category = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.InventoryItems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(category))
            q = q.Where(x => x.Category == category);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderBy(x => x.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new InventoryRowDto(
                x.Id,
                x.Name,
                x.Category,
                x.Quantity,
                x.MinQuantity,
                x.UnitPrice,
                x.SupplierName))
            .ToListAsync(ct);

        return Ok(new PagedResult<InventoryRowDto>(items, total, page, pageSize));
    }

    public record StockChangeBody(int Amount);

    [HttpPatch("{id}/add")]
    [Authorize(Roles = "master")]
    public async Task<IActionResult> Add(int id, [FromBody] StockChangeBody body, CancellationToken ct)
    {
        if (body.Amount <= 0)
            throw new BusinessException("Количество должно быть больше нуля.");

        var item = await _db.InventoryItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null)
            return NotFound();

        item.Quantity += body.Amount;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpPatch("{id}/remove")]
    [Authorize(Roles = "master")]
    public async Task<IActionResult> Remove(int id, [FromBody] StockChangeBody body, CancellationToken ct)
    {
        if (body.Amount <= 0)
            throw new BusinessException("Количество должно быть больше нуля.");

        var item = await _db.InventoryItems.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (item is null)
            return NotFound();

        item.Quantity = Math.Max(0, item.Quantity - body.Amount);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }
}

public record InventoryRowDto(
    int Id,
    string Name,
    string Category,
    int Quantity,
    int MinQuantity,
    decimal UnitPrice,
    string SupplierName);
