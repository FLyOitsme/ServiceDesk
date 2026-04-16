using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;
using ServiceDesk.API.DTOs;
using ServiceDesk.API.DTOs.Tickets;
using ServiceDesk.API.Exceptions;
using ServiceDesk.API.Models;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/tickets")]
[Authorize]
[Produces("application/json")]
public class TicketsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IWebHostEnvironment _env;

    public TicketsController(AppDbContext db, IWebHostEnvironment env)
    {
        _db = db;
        _env = env;
    }

    private string UserId => User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? throw new UnauthorizedException("Missing user id.");

    private string Role => (User.FindFirstValue("role") ?? User.FindFirstValue(ClaimTypes.Role) ?? "client").ToLowerInvariant();

    [HttpGet("stats")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult<AdminTicketStatsDto>> Stats(CancellationToken ct)
    {
        var dto = new AdminTicketStatsDto(
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.New, ct),
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.Completed, ct),
            await _db.Tickets.CountAsync(t => t.Status == TicketStatus.InProgress, ct));
        return Ok(dto);
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<TicketListItemDto>>> List(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? status = null,
        [FromQuery] string? priority = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var q = _db.Tickets.AsNoTracking().AsQueryable();

        if (Role == "client")
            q = q.Where(t => t.ClientUserId == UserId);

        if (!string.IsNullOrWhiteSpace(status))
        {
            if (!Enum.TryParse<TicketStatus>(status, true, out var st))
                return BadRequest("Invalid status.");
            q = q.Where(t => t.Status == st);
        }

        if (!string.IsNullOrWhiteSpace(priority))
        {
            if (!Enum.TryParse<TicketPriority>(priority, true, out var pr))
                return BadRequest("Invalid priority.");
            q = q.Where(t => t.Priority == pr);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim();
            q = q.Where(t => t.PublicNumber.Contains(s));
        }

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(t => t.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(t => new TicketListItemDto(
                t.PublicNumber,
                t.Client.DisplayName,
                t.DeviceType.Name,
                t.DeviceModel.Name,
                t.Status.ToString(),
                t.Priority.ToString(),
                t.Master != null ? t.Master.DisplayName : null,
                t.CreatedAtUtc,
                t.Description,
                t.Cost,
                t.Status == TicketStatus.New && Role == "master"))
            .ToListAsync(ct);

        return Ok(new PagedResult<TicketListItemDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<TicketDetailDto>> Get(string id, CancellationToken ct)
    {
        var t = await FindTicketAsync(id, tracking: false, ct);
        if (t is null)
            return NotFound();

        if (Role == "client" && t.ClientUserId != UserId)
            return Forbid();

        return Ok(new TicketDetailDto(
            t.PublicNumber,
            t.Client.DisplayName,
            t.DeviceType.Name,
            t.Manufacturer.Name,
            t.DeviceModel.Name,
            t.Description,
            t.ImagePath,
            t.Status.ToString(),
            t.Priority.ToString(),
            t.Master?.DisplayName,
            t.Cost,
            t.CreatedAtUtc));
    }

    [HttpPost]
    [Authorize(Roles = "client")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(10_000_000)]
    public async Task<ActionResult<CreatedTicketDto>> Create([FromForm] CreateTicketForm form, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(form.Description))
            throw new BusinessException("Описание обязательно.");

        var model = await _db.DeviceModels
            .Include(m => m.Manufacturer)
            .FirstOrDefaultAsync(m => m.Id == form.DeviceModelId && m.ManufacturerId == form.ManufacturerId, ct);
        if (model is null)
            throw new BusinessException("Неверная модель устройства.");

        if (model.Manufacturer.DeviceTypeId != form.DeviceTypeId)
            throw new BusinessException("Неверная связка типа производителя и модели.");

        string? imagePath = null;
        if (form.Image is { Length: > 0 })
        {
            var ext = Path.GetExtension(form.Image.FileName);
            if (string.IsNullOrEmpty(ext) || ext.Length > 8)
                ext = ".jpg";
            var name = $"{Guid.NewGuid():N}{ext}";
            var dir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads", "tickets");
            Directory.CreateDirectory(dir);
            var full = Path.Combine(dir, name);
            await using (var fs = System.IO.File.Create(full))
                await form.Image.CopyToAsync(fs, ct);
            imagePath = $"/uploads/tickets/{name}";
        }

        var ticket = new Ticket
        {
            PublicNumber = "TEMP",
            ClientUserId = UserId,
            DeviceTypeId = form.DeviceTypeId,
            ManufacturerId = form.ManufacturerId,
            DeviceModelId = form.DeviceModelId,
            Description = form.Description.Trim(),
            ImagePath = imagePath,
            Status = TicketStatus.New,
            Priority = TicketPriority.Normal,
            Cost = null,
            CreatedAtUtc = DateTime.UtcNow
        };

        _db.Tickets.Add(ticket);
        await _db.SaveChangesAsync(ct);

        ticket.PublicNumber = $"REQ-{ticket.Id:D3}";
        await _db.SaveChangesAsync(ct);

        return Ok(new CreatedTicketDto(ticket.PublicNumber, ticket.Id));
    }

    [HttpPatch("{id}/take")]
    [Authorize(Roles = "master")]
    public async Task<IActionResult> Take(string id, CancellationToken ct)
    {
        var ticket = await FindTicketAsync(id, tracking: true, ct);
        if (ticket is null)
            return NotFound();

        if (ticket.Status != TicketStatus.New)
            throw new BusinessException("Заявка уже не в статусе «Новая».");

        ticket.MasterUserId = UserId;
        ticket.Status = TicketStatus.InProgress;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    public record PatchStatusBody(string Status);

    [HttpPatch("{id}/status")]
    [Authorize(Roles = "master,admin")]
    public async Task<IActionResult> PatchStatus(string id, [FromBody] PatchStatusBody body, CancellationToken ct)
    {
        if (!Enum.TryParse<TicketStatus>(body.Status, true, out var st))
            return BadRequest("Invalid status.");

        var ticket = await FindTicketAsync(id, tracking: true, ct);
        if (ticket is null)
            return NotFound();

        if (Role == "master" && ticket.Status == TicketStatus.New && st != TicketStatus.InProgress)
            throw new BusinessException("Сначала возьмите заявку в работу.");

        ticket.Status = st;
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(string id, CancellationToken ct)
    {
        var ticket = await FindTicketByKeyAsync(id, ct);
        if (ticket is null)
            return NotFound();

        _db.Tickets.Remove(ticket);
        await _db.SaveChangesAsync(ct);
        return NoContent();
    }

    private IQueryable<Ticket> FindTicketQueryable(bool tracking)
    {
        var q = _db.Tickets
            .Include(t => t.Client)
            .Include(t => t.Master)
            .Include(t => t.DeviceType)
            .Include(t => t.Manufacturer)
            .Include(t => t.DeviceModel);
        return tracking ? q : q.AsNoTracking();
    }

    private async Task<Ticket?> FindTicketAsync(string id, bool tracking, CancellationToken ct)
    {
        var q = FindTicketQueryable(tracking);
        if (int.TryParse(id, out var n))
            return await q.FirstOrDefaultAsync(t => t.Id == n, ct);
        return await q.FirstOrDefaultAsync(t => t.PublicNumber == id, ct);
    }

    private async Task<Ticket?> FindTicketByKeyAsync(string id, CancellationToken ct)
    {
        if (int.TryParse(id, out var n))
            return await _db.Tickets.FirstOrDefaultAsync(t => t.Id == n, ct);
        return await _db.Tickets.FirstOrDefaultAsync(t => t.PublicNumber == id, ct);
    }
}

public record AdminTicketStatsDto(int NewCount, int CompletedCount, int InProgressCount);

public record TicketListItemDto(
    string PublicNumber,
    string ClientName,
    string DeviceType,
    string DeviceModel,
    string Status,
    string Priority,
    string? MasterName,
    DateTime CreatedAtUtc,
    string Description,
    decimal? Cost,
    bool CanTake);

public record TicketDetailDto(
    string PublicNumber,
    string ClientName,
    string DeviceType,
    string Manufacturer,
    string DeviceModel,
    string Description,
    string? ImageUrl,
    string Status,
    string Priority,
    string? MasterName,
    decimal? Cost,
    DateTime CreatedAtUtc);

public record CreatedTicketDto(string PublicNumber, int Id);
