using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Domain.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Hangfire;
using LuxeHome.Application.Jobs;

namespace LuxeHome.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ProductPricesController : ControllerBase
    {
        private readonly LuxeHomeDbContext _context;

        public ProductPricesController(LuxeHomeDbContext context)
        {
            _context = context;
        }

        // 1.  : Xem danh sách & Chi tiết giá bán
        [HttpGet]
        public async Task<IActionResult> GetPrices([FromQuery] string status = "ALL")
        {
            var query = _context.ProductPrices
                .Include(p => p.Variant)
                .ThenInclude(v => v.Product)
                .AsQueryable();

            if (status != "ALL")
            {
                query = query.Where(p => p.Status == status); // "ACTIVE" hoặc "PENDING"
            }

            var prices = await query.OrderByDescending(p => p.Id).ToListAsync();
            return Ok(prices);
        }

        public class SchedulePriceDto
        {
            public List<long> VariantIds { get; set; } // Hỗ trợ "Cập nhật giá bán hàng loạt"
            public decimal SellingPrice { get; set; }
            public DateTime? EffectiveFrom { get; set; }
            public DateTime? EffectiveTo { get; set; }
        }

        // 2.  : Lên lịch thay đổi giá & Cập nhật giá bán theo biến thể/hàng loạt
        [HttpPost("schedule")]
        public async Task<IActionResult> SchedulePriceChange([FromBody] SchedulePriceDto dto)
        {
            // Chặn tạo lịch mới nếu variant đang có lịch giá chưa chạy xong (PENDING/SCHEDULED)
            var conflictingVariantIds = await _context.ProductPrices
                .Where(p => dto.VariantIds.Contains(p.VariantId ?? 0) &&
                            (p.Status == "PENDING" || p.Status == "SCHEDULED"))
                .Select(p => p.VariantId)
                .Distinct()
                .ToListAsync();

            if (conflictingVariantIds.Any())
            {
                var conflictingNames = await _context.ProductVariants
                    .Where(v => conflictingVariantIds.Contains(v.Id))
                    .Include(v => v.Product)
                    .Select(v => v.Product.ProductName + " (" + (v.Color ?? v.VariantName) + ")")
                    .ToListAsync();

                return Conflict(new
                {
                    message = "Không thể tạo lịch giá mới vì các sản phẩm sau đang có lịch giá chưa được áp dụng xong: "
                        + string.Join(", ", conflictingNames)
                        + ". Vui lòng chờ lịch giá cũ hoàn tất (chuyển sang Đang Áp Dụng) rồi mới tạo lịch mới."
                });
            }

            // Trạng thái mặc định là PENDING, chờ Quản trị viên duyệt
            foreach (var variantId in dto.VariantIds)
            {
                var variant = await _context.ProductVariants.FindAsync(variantId);
                if (variant == null) continue;

                var newPrice = new ProductPrice
                {
                    ProductId = variant.ProductId,
                    VariantId = variantId,
                    OriginalPrice = variant.CompareAtPrice ?? variant.CurrentPrice,
                    SellingPrice = dto.SellingPrice,
                    EffectiveFrom = dto.EffectiveFrom ?? DateTime.UtcNow,
                    EffectiveTo = dto.EffectiveTo,
                    Status = "PENDING", // Trạng thái chờ duyệt
                    CreatedBy = 1 // Mock User ID (Store Manager)
                };
                _context.ProductPrices.Add(newPrice);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Đã lên lịch thay đổi giá thành công. Chờ Quản trị viên duyệt." });
        }

        // 3.  : Duyệt yêu cầu thay đổi giá & Kích hoạt giá bán mới
        [HttpPatch("{id}/approve")]
        public async Task<IActionResult> ApprovePriceChange(long id)
        {
            var priceRequest = await _context.ProductPrices.FindAsync(id);

            if (priceRequest == null || priceRequest.Status != "PENDING")
                return BadRequest("Yêu cầu không tồn tại hoặc đã được xử lý.");

            // 1. Đổi trạng thái thành SCHEDULED (Đã duyệt nhưng chưa tới giờ chạy)
            priceRequest.Status = "SCHEDULED";
            priceRequest.ApprovedBy = 1; // Mock Admin ID
            await _context.SaveChangesAsync();

            // 2. Tính toán độ trễ (Delay)
            // Lưu ý: DateTime từ React gửi lên qua toISOString() đã là UTC.
            var effectiveFromUtc = priceRequest.EffectiveFrom ?? DateTime.UtcNow;
            var timeToGo = effectiveFromUtc - DateTime.UtcNow;

            // 3. Đẩy vào Hangfire
            if (timeToGo <= TimeSpan.Zero)
            {
                // Nếu thời gian áp dụng là ở quá khứ hoặc hiện tại -> Xếp hàng chạy luôn lập tức
                BackgroundJob.Enqueue<IPriceUpdateJob>(job => job.ExecutePriceUpdateAsync(id));
            }
            else
            {
                // Nếu thời gian ở tương lai -> Hẹn giờ chạy đúng boong theo timeToGo
                BackgroundJob.Schedule<IPriceUpdateJob>(job => job.ExecutePriceUpdateAsync(id), timeToGo);
            }

            return Ok(new { message = "Đã phê duyệt! Hệ thống sẽ tự động cập nhật giá vào đúng thời điểm." });
        }

        // 4.  : Theo dõi lịch sử sửa thay đổi giá
        [HttpGet("history/{variantId}")]
        public async Task<IActionResult> GetPriceHistory(long variantId)
        {
            var histories = await _context.PriceHistories
                .Where(h => h.VariantId == variantId)
                .OrderByDescending(h => h.ChangedAt)
                .ToListAsync();
            return Ok(histories);
        }

        // 5.  : Khôi phục giá bán cũ
        [HttpPost("restore/{variantId}")]
        public async Task<IActionResult> RestoreOldPrice(long variantId)
        {
            // Lấy giá cũ gần nhất từ lịch sử
            var lastHistory = await _context.PriceHistories
                .Where(h => h.VariantId == variantId)
                .OrderByDescending(h => h.ChangedAt)
                .FirstOrDefaultAsync();

            if (lastHistory == null) return NotFound("Không tìm thấy dữ liệu lịch sử để khôi phục.");

            // Tự động tạo một yêu cầu giá mới (Hoặc kích hoạt luôn tùy cấu hình doanh nghiệp)
            var restorePrice = new ProductPrice
            {
                ProductId = lastHistory.ProductId,
                VariantId = variantId,
                OriginalPrice = lastHistory.OldPrice,
                SellingPrice = lastHistory.OldPrice,
                EffectiveFrom = DateTime.UtcNow,
                Status = "PENDING", // Tạo yêu cầu xin duyệt khôi phục
                CreatedBy = 1 
            };

            _context.ProductPrices.Add(restorePrice);
            await _context.SaveChangesAsync();

            return Ok(new { message = $"Đã tạo yêu cầu khôi phục về giá cũ: {lastHistory.OldPrice}. Chờ phê duyệt." });
        }
    }
}