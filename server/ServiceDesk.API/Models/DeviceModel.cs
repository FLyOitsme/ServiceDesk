namespace ServiceDesk.API.Models;

public class DeviceModel
{
    public int Id { get; set; }
    public int ManufacturerId { get; set; }
    public Manufacturer Manufacturer { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
}
