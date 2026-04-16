using System.ComponentModel.DataAnnotations;

namespace ServiceDesk.API.DTOs.Tickets;

public class CreateTicketForm
{
    [Required]
    public int DeviceTypeId { get; set; }

    [Required]
    public int ManufacturerId { get; set; }

    [Required]
    public int DeviceModelId { get; set; }

    [Required, MinLength(3)]
    public string Description { get; set; } = string.Empty;

    public IFormFile? Image { get; set; }
}
