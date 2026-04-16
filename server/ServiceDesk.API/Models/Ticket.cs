namespace ServiceDesk.API.Models;

public class Ticket
{
    public int Id { get; set; }
    public string PublicNumber { get; set; } = string.Empty;

    public string ClientUserId { get; set; } = string.Empty;
    public ApplicationUser Client { get; set; } = null!;

    public string? MasterUserId { get; set; }
    public ApplicationUser? Master { get; set; }

    public int DeviceTypeId { get; set; }
    public DeviceType DeviceType { get; set; } = null!;

    public int ManufacturerId { get; set; }
    public Manufacturer Manufacturer { get; set; } = null!;

    public int DeviceModelId { get; set; }
    public DeviceModel DeviceModel { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public string? ImagePath { get; set; }

    public TicketStatus Status { get; set; }
    public TicketPriority Priority { get; set; }

    public decimal? Cost { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
