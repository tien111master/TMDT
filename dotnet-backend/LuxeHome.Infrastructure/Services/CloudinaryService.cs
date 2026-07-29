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
            var cloudName = FirstNonEmpty(configuration["Cloudinary:CloudName"], Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME"));
            var apiKey = FirstNonEmpty(configuration["Cloudinary:ApiKey"], Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY"));
            var apiSecret = FirstNonEmpty(configuration["Cloudinary:ApiSecret"], Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET"));

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