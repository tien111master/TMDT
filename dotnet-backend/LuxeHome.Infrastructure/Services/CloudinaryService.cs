using System;
using System.IO;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.Extensions.Configuration;

namespace LuxeHome.Infrastructure.Services
{
    public class CloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        public CloudinaryService(IConfiguration configuration)
        {
            // Lưu ý: tên section phải khớp với appsettings.json là "CloudinarySettings"
            // (trước đây code đọc nhầm "Cloudinary" -> luôn rỗng -> crash lúc khởi tạo).
            var cloudName = FirstNonEmpty(configuration["CloudinarySettings:CloudName"], Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME"));
            var apiKey = FirstNonEmpty(configuration["CloudinarySettings:ApiKey"], Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY"));
            var apiSecret = FirstNonEmpty(configuration["CloudinarySettings:ApiSecret"], Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET"));

            if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
            {
                throw new InvalidOperationException(
                    "Thiếu cấu hình Cloudinary (CloudName/ApiKey/ApiSecret). " +
                    "Kiểm tra appsettings.json mục 'CloudinarySettings' hoặc biến môi trường " +
                    "CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.");
            }

            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
        }

        private static string FirstNonEmpty(params string?[] values)
        {
            foreach (var v in values)
            {
                if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
            }
            return string.Empty;
        }

        public async Task<string> UploadImageAsync(Stream fileStream, string fileName)
        {
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(fileName, fileStream),
                Folder = "luxehome/products",
                Transformation = new Transformation().Quality("auto").FetchFormat("auto")
            };

            var result = await _cloudinary.UploadAsync(uploadParams);

            if (result.Error != null)
                throw new Exception(result.Error.Message);

            return result.SecureUrl.ToString();
        }
    }
}