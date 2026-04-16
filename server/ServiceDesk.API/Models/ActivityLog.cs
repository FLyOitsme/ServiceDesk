namespace ServiceDesk.API.Models;

public class ActivityLog
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Subtitle { get; set; }
    public ActivityKind Kind { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}
