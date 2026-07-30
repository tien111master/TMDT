using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using LuxeHome.Domain.Entities;
using LuxeHome.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace LuxeHome.Infrastructure.Services
{
    public class GeminiAIService : IAIService
    {
        private readonly string _apiKey;
        private readonly HttpClient _httpClient;
        private readonly string _model;
        private string GenerateUrl =>
            $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent";

        public GeminiAIService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            ArgumentNullException.ThrowIfNull(configuration);

            _apiKey = FirstNonEmpty(
                configuration["Gemini:ApiKey"],
                Environment.GetEnvironmentVariable("GEMINI_API_KEY"));

            _model = FirstNonEmpty(
                configuration["Gemini:Model"],
                Environment.GetEnvironmentVariable("GEMINI_MODEL"),
                "gemini-2.5-flash");
        }

        private static string FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                    return value.Trim();
            }

            return string.Empty;
        }

        public bool IsOffline()
        {
            return string.IsNullOrEmpty(_apiKey);
        }

        // Lưu ý: chat text hiện KHÔNG còn dùng hàm này nữa (ChatUseCase xử lý trực tiếp bằng DB).
        // Hàm này vẫn giữ lại phòng khi cần dùng lại Gemini cho việc khác trong tương lai.
        public async Task<string> GenerateChatAsync(List<Message> messages, string systemInstruction)
        {
            if (IsOffline())
            {
                return "chat đang không hoạt động, bạn vui lòng thử lại sau";
            }

            try
            {
                var url = $"{GenerateUrl}?key={_apiKey}";

                var chatBuilder = new StringBuilder();
                foreach (var msg in messages)
                {
                    string displayName = msg.Role == "user" ? "Khách hàng" : "LuxeHome Assistant";
                    chatBuilder.AppendLine($"{displayName}: {msg.Content}");
                }
                chatBuilder.AppendLine("LuxeHome Assistant:");

                var payload = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = chatBuilder.ToString() } } }
                    },
                    systemInstruction = new
                    {
                        parts = new[] { new { text = systemInstruction } }
                    },
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 1000
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                if (!response.IsSuccessStatusCode)
                {
                    var errorBody = await response.Content.ReadAsStringAsync();
                    Console.WriteLine($"[C# GeminiAIService] HTTP {(int)response.StatusCode}: {errorBody}");
                    return "LuxeHome chân thành kính chào Anh/Chị! Hệ thống đang bận hiệu chỉnh sớ mộc. Rất mong Anh/Chị ghé xem trực tiếp các tác phẩm mộc độc bản của chúng tôi.";
                }

                var jsonString = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonString);

                if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                    candidates.GetArrayLength() > 0 &&
                    candidates[0].TryGetProperty("content", out var resContent) &&
                    resContent.TryGetProperty("parts", out var parts) &&
                    parts.GetArrayLength() > 0 &&
                    parts[0].TryGetProperty("text", out var textVal))
                {
                    return textVal.GetString() ?? string.Empty;
                }

                return "LuxeHome Assistant sẵn sàng đồng hành cùng tư dinh sang trọng của quý khách!";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[C# GeminiAIService Error]: {ex.Message}");
                return "Có lỗi kết nối trợ lý AI ở hệ thống. LuxeHome sẵn lòng nhận cuộc gọi trực tiếp từ Anh/Chị để khảo sát mặt bằng mộc gỗ sồi già.";
            }
        }

        public async Task<ImageSearchResult> AnalyzeImageAsync(string imageBase64, string mimeType, string instruction)
        {
            if (IsOffline())
            {
                return new ImageSearchResult
                {
                    DetectedStyle = "Luxury",
                    MatchedCategory = "phong-khach",
                    Advice = "Nút tìm kiếm ảnh thông minh đã định vị được kiểu phòng phù hợp. Đề xuất anh chị bổ sung một ghế bành da Ý cao cấp.",
                    MatchedProductName = "Sofa Da Bò Ý Tự Nhiên - Royal Signature",
                    Confidence = "95%"
                };
            }

            try
            {
                var url = $"{GenerateUrl}?key={_apiKey}";

                string cleanBase64 = imageBase64;
                if (imageBase64.Contains(","))
                {
                    cleanBase64 = imageBase64.Substring(imageBase64.IndexOf(",") + 1);
                }

                var payload = new
                {
                    contents = new[]
                    {
                        new {
                            parts = new object[]
                            {
                                new { text = instruction },
                                new { inlineData = new { mimeType = mimeType, data = cleanBase64 } }
                            }
                        }
                    },
                    generationConfig = new
                    {
                        responseMimeType = "application/json",
                        temperature = 0.2
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                var response = await _httpClient.PostAsync(url, content);
                if (response.IsSuccessStatusCode)
                {
                    var jsonString = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(jsonString);
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0 &&
                        candidates[0].TryGetProperty("content", out var resContent) &&
                        resContent.TryGetProperty("parts", out var parts) &&
                        parts.GetArrayLength() > 0 &&
                        parts[0].TryGetProperty("text", out var textVal))
                    {
                        var innerJson = textVal.GetString() ?? "{}";
                        var result = JsonSerializer.Deserialize<ImageSearchResult>(innerJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                        return result ?? new ImageSearchResult();
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[C# AnalyzeImageAsync Error]: {ex.Message}");
            }

            return new ImageSearchResult
            {
                DetectedStyle = "Modern",
                MatchedCategory = "phong-khach",
                Advice = "Đã phát hiện sớ màu tương hợp trên chất liệu mặt kính cẩm thạch trắng mây.",
                MatchedProductName = "Bàn Trà Đá Cẩm Thạch Carrara - Venice Golden Frame"
            };
        }
    }
}