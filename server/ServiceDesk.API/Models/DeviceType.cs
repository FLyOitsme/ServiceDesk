namespace ServiceDesk.API.Models;

public class DeviceType
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public ICollection<Manufacturer> Manufacturers { get; set; } = new List<Manufacturer>();
}
