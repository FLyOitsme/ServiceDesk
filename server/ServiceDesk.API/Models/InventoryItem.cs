namespace ServiceDesk.API.Models;

public class InventoryItem
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public int MinQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string SupplierName { get; set; } = string.Empty;
}
