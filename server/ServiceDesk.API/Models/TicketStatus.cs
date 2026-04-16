namespace ServiceDesk.API.Models;

public enum TicketStatus
{
    New = 0,
    Diagnostics = 1,
    InProgress = 2,
    WaitingParts = 3,
    Ready = 4,
    Completed = 5
}
