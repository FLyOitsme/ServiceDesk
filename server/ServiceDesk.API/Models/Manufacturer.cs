namespace ServiceDesk.API.Models;

public class Manufacturer
{
    public int Id { get; set; }
    public int DeviceTypeId { get; set; }
    public DeviceType DeviceType { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public ICollection<DeviceModel> Models { get; set; } = new List<DeviceModel>();
}
