using System.Text.Json.Serialization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using LuxeHome.Domain.Interfaces;
using Microsoft.OpenApi.Models;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Infrastructure.Services;
using LuxeHome.Application.UseCases;
using LuxeHome.Application.Jobs;
using Hangfire;
using Hangfire.PostgreSql;
using LuxeHome.Application.Services;
using LuxeHome.API.Configurations;
using Microsoft.Extensions.FileProviders;


AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Nạp GEMINI_API_KEY từ .env.local ở root repo (cùng file frontend đang dùng)
TryLoadEnvLocal();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    EnvironmentName = Environments.Production
});

static void TryLoadEnvLocal()
{
    var dir = new DirectoryInfo(Directory.GetCurrentDirectory());
    while (dir != null)
    {
        var envPath = Path.Combine(dir.FullName, ".env.local");
        if (File.Exists(envPath))
        {
            foreach (var rawLine in File.ReadAllLines(envPath))
            {
                var line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith('#')) continue;

                var eq = line.IndexOf('=');
                if (eq <= 0) continue;

                var key = line[..eq].Trim();
                var value = line[(eq + 1)..].Trim().Trim('"').Trim('\'');
                if (string.IsNullOrEmpty(key)) continue;

                // Không ghi đè biến môi trường đã set sẵn (launchSettings / CI)
                if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable(key)))
                    Environment.SetEnvironmentVariable(key, value);
            }

            Console.WriteLine($"[LuxeHome] Loaded secrets from {envPath}");
            return;
        }

        dir = dir.Parent;
    }
}

builder.Configuration
    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: false)
    .AddEnvironmentVariables();

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");

builder.Services.AddDbContext<LuxeHomeDbContext>(options =>
{
    options.UseNpgsql(connectionString)
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));
});

// 1. Đăng ký Hangfire
builder.Services.AddHangfire(config => config
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UsePostgreSqlStorage(connectionString)); // Lưu queue vào PostgreSQL

builder.Services.AddHangfireServer();
builder.Services.AddScoped<IPriceUpdateJob, PriceUpdateJob>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LuxeHome API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập token theo định dạng: Bearer {your_token}",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
var key = Encoding.UTF8.GetBytes(JwtSettings.Secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
    
    // THÊM ĐOẠN NÀY ĐỂ DEBUG
    options.Events = new JwtBearerEvents
    {
        OnAuthenticationFailed = context =>
        {
            Console.WriteLine($"[AUTH FAILED] {context.Exception.Message}");
            return Task.CompletedTask;
        }
    };
});
builder.Services.AddHttpClient<IAIService, GeminiAIService>();

// Đăng ký các UseCase Nghiệp vụ (prompt AI nằm trong ChatUseCase / ImageSearchUseCase)
builder.Services.AddScoped<ChatUseCase>();
builder.Services.AddScoped<ImageSearchUseCase>();
builder.Services.AddScoped<UserUseCase>(); 
builder.Services.AddScoped<VnPayService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<OrderService>();

// appsettings có ApiKey: "" nên không dùng ?? — chuỗi rỗng vẫn “truthy” với null-coalescing
var geminiKey = builder.Configuration["Gemini:ApiKey"];
if (string.IsNullOrWhiteSpace(geminiKey))
    geminiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
var geminiReady = !string.IsNullOrWhiteSpace(geminiKey);
Console.WriteLine(geminiReady
    ? "[LuxeHome] Gemini AI: ONLINE (Chat + Image Search)"
    : "[LuxeHome] Gemini AI: OFFLINE — thiếu GEMINI_API_KEY trong .env.local hoặc Gemini:ApiKey");
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin() // Cho phép tất cả các nguồn
              .AllowAnyMethod() // Cho phép tất cả các loại request (GET, POST, PUT, DELETE...)
              .AllowAnyHeader(); // Cho phép tất cả các header
    });
});
var app = builder.Build();
app.UseCors("AllowAll");

var rootWwwPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
Directory.CreateDirectory(rootWwwPath);
Console.WriteLine("CURRENT DIRECTORY: " + Directory.GetCurrentDirectory());
Console.WriteLine("STATIC WWWROOT PATH: " + rootWwwPath);
Console.WriteLine("STATIC WWWROOT EXISTS: " + Directory.Exists(rootWwwPath));

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(rootWwwPath),
    RequestPath = ""
});

app.UseRouting();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}

app.UseSwagger();
app.UseSwaggerUI(c => 
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "LuxeHome API V1");
    c.RoutePrefix = "swagger";
});

// Kích hoạt Authentication trước Authorization
app.UseAuthentication();
app.UseAuthorization();
app.UseHangfireDashboard("/hangfire");
app.MapGet("/uploads/reviews/{fileName}", (string fileName) =>
{
    var safeFileName = Path.GetFileName(fileName);

    var filePath = Path.Combine(
        Directory.GetCurrentDirectory(),
        "wwwroot",
        "uploads",
        "reviews",
        safeFileName
    );

    Console.WriteLine("REQUEST REVIEW IMAGE: " + filePath);

    if (!System.IO.File.Exists(filePath))
    {
        return Results.NotFound(new
        {
            message = "Không tìm thấy ảnh",
            path = filePath
        });
    }

    var ext = Path.GetExtension(filePath).ToLowerInvariant();

    var contentType = ext switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };

    return Results.File(filePath, contentType);
});
app.MapControllers();

using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<LuxeHomeDbContext>();
        await context.Database.MigrateAsync(); 
        var configuration = services.GetRequiredService<IConfiguration>();
        bool enableSeeding = configuration.GetValue<bool>("SeedDataConfig:EnableSeeding");
        await DataSeeder.SeedAsync(context, enableSeeding);
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An error occurred while seeding the database.");
    }
}

var port = Environment.GetEnvironmentVariable("PORT") ?? "5200";
app.Run($"http://0.0.0.0:{port}");