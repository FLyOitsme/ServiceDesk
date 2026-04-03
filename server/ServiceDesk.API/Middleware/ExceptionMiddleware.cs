using System.Text.Json;
using Microsoft.AspNetCore.Mvc;

namespace ServiceDesk.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next   = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");

            var problem = new ProblemDetails
            {
                Status = 500,
                Title  = "Internal Server Error",
                Detail = ex.Message,
            };

            ctx.Response.StatusCode  = 500;
            ctx.Response.ContentType = "application/problem+json";

            await ctx.Response.WriteAsync(
                JsonSerializer.Serialize(problem));
        }
    }
}
