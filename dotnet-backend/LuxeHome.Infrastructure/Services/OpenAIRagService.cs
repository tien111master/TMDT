using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using LuxeHome.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace LuxeHome.Infrastructure.Services
{
    public class OpenAIRagService : IRagChatService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _model;
        private const string Url = "https://api.openai.com/v1/chat/completions";

        public OpenAIRagService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));

            _apiKey = FirstNonEmpty(
                configuration["OpenAI:ApiKey"],
                Environment.GetEnvironmentVariable("OPENAI_API_KEY"));

            _model = FirstNonEmpty(
                configuration["OpenAI:Model"],
                Environment.GetEnvironmentVariable("OPENAI_MODEL"),
                "gpt-4o-mini");
        }

        private static string FirstNonEmpty(params string?[] values)
        {
            foreach (var v in values)
                if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
            return string.Empty;
        }

        public bool IsOffline() => string.IsNullOrEmpty(_apiKey);

        public async Task<string> GenerateReplyAsync(string userQuestion, string context, string systemInstruction)
        {
            if (IsOffline())
                throw new InvalidOperationException("OpenAI chưa cấu hình API key.");

            var userContent = string.IsNullOrWhiteSpace(context)
                ? userQuestion
                : $"DỮ LIỆU THỰC TẾ (chỉ được dùng thông tin này, không được bịa thêm):\n{context}\n\nCÂU HỎI CỦA KHÁCH: {userQuestion}";

            var payload = new
            {
                model = _model,
                messages = new object[]
                {
                    new { role = "system", content = systemInstruction },
                    new { role = "user", content = userContent }
                },
                temperature = 0.5,
                max_tokens = 400
            };

            var req = new HttpRequestMessage(HttpMethod.Post, Url);
            req.Headers.Add("Authorization", $"Bearer {_apiKey}");
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var response = await _httpClient.SendAsync(req);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                throw new Exception($"OpenAI HTTP {(int)response.StatusCode}: {err}");
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            var text = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();

            return text ?? string.Empty;
        }
    }
}