namespace ServiceDesk.API.Models;

public class FinancialTransaction
{
    public int Id { get; set; }
    public string PublicNumber { get; set; } = string.Empty;

    public int? TicketId { get; set; }
    public Ticket? Ticket { get; set; }

    public string Description { get; set; } = string.Empty;
    public TransactionType Type { get; set; }
    public decimal Amount { get; set; }
    public DateTime DateUtc { get; set; }
    public TransactionRecordStatus Status { get; set; }
}
