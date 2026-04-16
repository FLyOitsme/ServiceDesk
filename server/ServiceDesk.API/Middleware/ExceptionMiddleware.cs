using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using ServiceDesk.API.Exceptions;

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
        catch (BusinessException ex)
        {
            _logger.LogWarning(ex, "Business rule violation");
            await WriteProblem(ctx, StatusCodes.Status400BadRequest, "Bad Request", ex.Message);
        }
        catch (UnauthorizedException ex)
        {
            _logger.LogWarning(ex, "Unauthorized");
            await WriteProblem(ctx, StatusCodes.Status401Unauthorized, "Unauthorized", ex.Message);
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

    private static async Task WriteProblem(HttpContext ctx, int status, string title, string detail)
    {
        ctx.Response.StatusCode = status;
        ctx.Response.ContentType = "application/problem+json";
        var problem = new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = detail,
            Instance = ctx.Request.Path
        };
        await ctx.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}
