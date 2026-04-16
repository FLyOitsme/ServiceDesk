using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ServiceDesk.API.Data;

namespace ServiceDesk.API.Controllers;

[ApiController]
[Route("api/reference")]
[Authorize]
[Produces("application/json")]
public class ReferenceController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReferenceController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("device-types")]
    public async Task<ActionResult<IReadOnlyList<IdNameDto>>> DeviceTypes(CancellationToken ct)
    {
        var list = await _db.DeviceTypes.AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new IdNameDto(x.Id, x.Name))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("manufacturers")]
    public async Task<ActionResult<IReadOnlyList<IdNameDto>>> Manufacturers([FromQuery] int deviceTypeId, CancellationToken ct)
    {
        var list = await _db.Manufacturers.AsNoTracking()
            .Where(x => x.DeviceTypeId == deviceTypeId)
            .OrderBy(x => x.Name)
            .Select(x => new IdNameDto(x.Id, x.Name))
            .ToListAsync(ct);
        return Ok(list);
    }

    [HttpGet("models")]
    public async Task<ActionResult<IReadOnlyList<IdNameDto>>> Models([FromQuery] int manufacturerId, CancellationToken ct)
    {
        var list = await _db.DeviceModels.AsNoTracking()
            .Where(x => x.ManufacturerId == manufacturerId)
            .OrderBy(x => x.Name)
            .Select(x => new IdNameDto(x.Id, x.Name))
            .ToListAsync(ct);
        return Ok(list);
    }
}

public record IdNameDto(int Id, string Name);
