using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LuxeHome.Application.DTOs;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Domain.Entities;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;

namespace LuxeHome.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PromotionsController : ControllerBase
    {
        private readonly LuxeHomeDbContext _context;
        private readonly IMemoryCache _cache;
        private const string CouponsCacheKey = "promotions_coupons_list";
        private const string AvailableCacheKey = "promotions_available_list";

        public PromotionsController(LuxeHomeDbContext context, IMemoryCache cache)
        {
            _context = context;
            _cache = cache;
        }

        // =========================================================================
        // STOREFRONT — danh sách mã hiển thị công khai, lọc theo trạng thái + lịch
        // =========================================================================
        [HttpGet]
        public async Task<IActionResult> GetCoupons()
        {
            if (_cache.TryGetValue(CouponsCacheKey, out object? cached))
            {
                return Ok(cached);
            }

            var now = DateTime.Now;

            var promotions = await _context.Promotions
                .Where(p =>
                    p.Status != null &&
                    p.CouponCode != null &&
                    p.Status.ToUpper() == "ACTIVE" &&
                    !p.IsHidden &&
                    (p.StartedAt == null || p.StartedAt <= now) &&
                    (p.EndedAt == null || p.EndedAt >= now)
                )
                .OrderBy(p => p.MinOrderAmount)
                .Select(p => new
                {
                    code = p.CouponCode,
                    discountType =
                        p.PromotionType != null && p.PromotionType.ToUpper().Contains("PERCENT") ? "percent" :
                        p.PromotionType != null && p.PromotionType.ToUpper().Contains("FREESHIP") ? "freeship" :
                        p.PromotionType != null && p.PromotionType.ToUpper().Contains("INSTALLATION") ? "installation" :
                        "fixed",
                    value = p.DiscountValue,
                    minSubtotal = p.MinOrderAmount,
                    description = p.PromotionName,
                    isActive = p.Status != null && p.Status.ToUpper() == "ACTIVE"
                })
                .ToListAsync();

            _cache.Set(CouponsCacheKey, promotions, TimeSpan.FromMinutes(5));

            return Ok(promotions);
        }

        // API: lấy danh sách mã đang khả dụng (còn lượt dùng)
        [HttpGet("available")]
        public async Task<IActionResult> GetAvailablePromotions()
        {
            if (_cache.TryGetValue(AvailableCacheKey, out object? cached))
            {
                return Ok(cached);
            }

            var now = DateTime.Now;

            var promotions = await _context.Promotions
                .Where(p =>
                    p.Status != null &&
                    p.Status.ToUpper() == "ACTIVE" &&
                    !p.IsHidden &&
                    p.CouponCode != null &&
                    (p.StartedAt == null || p.StartedAt <= now) &&
                    (p.EndedAt == null || p.EndedAt >= now) &&
                    (p.UsageLimit == null || (p.UsedCount ?? 0) < p.UsageLimit)
                )
                .OrderBy(p => p.MinOrderAmount)
                .Select(p => new
                {
                    p.Id,
                    p.PromotionName,
                    p.CouponCode,
                    p.PromotionType,
                    p.DiscountValue,
                    p.MinOrderAmount,
                    p.MaxDiscountAmount
                })
                .ToListAsync();

            _cache.Set(AvailableCacheKey, promotions, TimeSpan.FromMinutes(5));

            return Ok(promotions);
        }

        // =========================================================================
        // ADMIN (Quản lý cửa hàng) — sơ đồ AD_Tạo chương trình khuyến mãi
        // =========================================================================

        [HttpGet("admin-all")]
        public async Task<IActionResult> GetAllPromotionsAdmin()
        {
            var promotions = await _context.Promotions
                .OrderByDescending(p => p.Id)
                .Select(p => new
                {
                    p.Id,
                    p.PromotionName,
                    p.CouponCode,
                    p.PromotionType,
                    p.DiscountValue,
                    p.MinOrderAmount,
                    p.MaxDiscountAmount,
                    p.StartedAt,
                    p.EndedAt,
                    p.UsageLimit,
                    p.UsedCount,
                    p.Status,
                    p.IsHidden
                })
                .ToListAsync();

            return Ok(promotions);
        }

        [HttpPost]
        public async Task<IActionResult> CreatePromotion([FromBody] CreatePromotionDto dto)
        {
            var validationError = await ValidatePromotionAsync(
                dto.PromotionName, dto.CouponCode, dto.PromotionType, dto.DiscountValue,
                dto.StartedAt, dto.EndedAt, excludeId: null);

            if (validationError != null)
                return BadRequest(new { message = validationError });

            var promotion = new Promotion
            {
                PromotionName = dto.PromotionName,
                CouponCode = string.IsNullOrWhiteSpace(dto.CouponCode) ? null : dto.CouponCode.Trim().ToUpper(),
                PromotionType = dto.PromotionType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmount = dto.MinOrderAmount,
                MaxDiscountAmount = dto.MaxDiscountAmount,
                StartedAt = dto.StartedAt,
                EndedAt = dto.EndedAt,
                UsageLimit = dto.UsageLimit,
                UsedCount = 0,
                Status = "Active"
            };

            _context.Promotions.Add(promotion);
            await _context.SaveChangesAsync();

            ClearPromotionsCache();

            return Ok(new { message = "Đã tạo và kích hoạt chương trình khuyến mãi theo lịch.", id = promotion.Id });
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdatePromotion(long id, [FromBody] UpdatePromotionDto dto)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound(new { message = "Không tìm thấy chương trình khuyến mãi." });

            if (promotion.Status == "Ended")
                return BadRequest(new { message = "Chương trình đã kết thúc, không thể chỉnh sửa." });

            var validationError = await ValidatePromotionAsync(
                dto.PromotionName, dto.CouponCode, dto.PromotionType, dto.DiscountValue,
                dto.StartedAt, dto.EndedAt, excludeId: id);

            if (validationError != null)
                return BadRequest(new { message = validationError });

            promotion.PromotionName = dto.PromotionName;
            promotion.CouponCode = string.IsNullOrWhiteSpace(dto.CouponCode) ? null : dto.CouponCode.Trim().ToUpper();
            promotion.PromotionType = dto.PromotionType;
            promotion.DiscountValue = dto.DiscountValue;
            promotion.MinOrderAmount = dto.MinOrderAmount;
            promotion.MaxDiscountAmount = dto.MaxDiscountAmount;
            promotion.StartedAt = dto.StartedAt;
            promotion.EndedAt = dto.EndedAt;
            promotion.UsageLimit = dto.UsageLimit;

            await _context.SaveChangesAsync();

            ClearPromotionsCache();

            return Ok(new { message = "Đã cập nhật chương trình khuyến mãi thành công." });
        }

        [HttpPut("{id}/end")]
        public async Task<IActionResult> EndPromotion(long id)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound(new { message = "Không tìm thấy chương trình khuyến mãi." });

            if (promotion.Status == "Ended")
                return BadRequest(new { message = "Chương trình này đã kết thúc từ trước." });

            promotion.Status = "Ended";
            promotion.EndedAt = DateTime.UtcNow < promotion.EndedAt ? DateTime.UtcNow : promotion.EndedAt;

            await _context.SaveChangesAsync();

            ClearPromotionsCache();

            return Ok(new { message = "Đã kết thúc/hủy chương trình khuyến mãi.", status = "Ended" });
        }

        [HttpPut("{id}/visibility")]
        public async Task<IActionResult> ToggleVisibility(long id, [FromBody] ToggleVisibilityDto dto)
        {
            var promotion = await _context.Promotions.FindAsync(id);
            if (promotion == null) return NotFound(new { message = "Không tìm thấy chương trình khuyến mãi." });

            promotion.IsHidden = dto.IsHidden;
            await _context.SaveChangesAsync();

            ClearPromotionsCache();

            return Ok(new
            {
                message = dto.IsHidden ? "Đã ẩn mã giảm giá." : "Đã hiện lại mã giảm giá.",
                isHidden = promotion.IsHidden
            });
        }

        private static string NormalizePromotionType(string? rawType)
        {
            var upper = (rawType ?? "").ToUpperInvariant();

            if (upper.Contains("PERCENT")) return "PERCENT";
            if (upper.Contains("FREESHIP") || upper.Contains("FREE_SHIP")) return "FREESHIP";
            if (upper.Contains("INSTALLATION")) return "INSTALLATION";
            if (upper.Contains("FIXED") || upper.Contains("AMOUNT")) return "FIXED";

            return "UNKNOWN";
        }

        private void ClearPromotionsCache()
        {
            _cache.Remove(CouponsCacheKey);
            _cache.Remove(AvailableCacheKey);
        }

        private async Task<string?> ValidatePromotionAsync(
            string promotionName, string? couponCode, string promotionType, decimal discountValue,
            DateTime startedAt, DateTime endedAt, long? excludeId)
        {
            if (string.IsNullOrWhiteSpace(promotionName))
                return "Tên chương trình khuyến mãi không được để trống.";

            if (startedAt >= endedAt)
                return "Thời gian bắt đầu phải trước thời gian kết thúc.";

            if (discountValue <= 0)
                return "Giá trị giảm giá phải lớn hơn 0.";

            if (promotionType != null && promotionType.Contains("Percent") && discountValue > 100)
                return "Giá trị giảm theo phần trăm không được vượt quá 100%.";

            if (!string.IsNullOrWhiteSpace(couponCode))
            {
                var normalizedCode = couponCode.Trim().ToUpper();
                var codeExists = await _context.Promotions
                    .AnyAsync(p => p.CouponCode == normalizedCode && p.Id != (excludeId ?? -1));

                if (codeExists)
                    return $"Mã giảm giá '{normalizedCode}' đã tồn tại, vui lòng chọn mã khác.";
            }

            var hasOverlap = await _context.Promotions
                .Where(p => p.Status == "Active" && p.Id != (excludeId ?? -1))
                .AnyAsync(p => p.StartedAt < endedAt && p.EndedAt > startedAt);

            if (hasOverlap)
                return "Khoảng thời gian bị trùng với một chương trình khuyến mãi khác đang hoạt động.";

            return null;
        }

        // =========================================================================
        // KHÁCH HÀNG — áp dụng/lưu mã vào ví khuyến mãi cá nhân
        // =========================================================================

        [Authorize]
        [HttpPost("apply")]
        public async Task<IActionResult> ApplyPromotion([FromBody] ApplyPromotionRequest request)
        {
            try
            {
                var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
                var now = DateTime.UtcNow;

                if (string.IsNullOrWhiteSpace(request.CouponCode))
                {
                    return BadRequest(new { message = "Vui lòng nhập mã ưu đãi." });
                }

                var code = request.CouponCode.Trim().ToUpper();

                var promotion = await (
                    from w in _context.CustomerPromotionWallets
                    join p in _context.Promotions on w.PromotionId equals p.Id
                    where w.UserId == userId
                          && w.Status == "SAVED"
                          && p.CouponCode != null
                          && p.CouponCode.ToUpper() == code
                    select p
                ).FirstOrDefaultAsync();

                if (promotion == null)
                {
                    return BadRequest(new { message = "Mã ưu đãi không tồn tại." });
                }

                if (promotion.Status == null || promotion.Status.ToUpper() != "ACTIVE")
                {
                    return BadRequest(new { message = "Mã ưu đãi hiện không còn hoạt động." });
                }

                if (promotion.StartedAt != null && promotion.StartedAt > now)
                {
                    return BadRequest(new { message = "Mã ưu đãi chưa đến thời gian sử dụng." });
                }

                if (promotion.EndedAt != null && promotion.EndedAt < now)
                {
                    return BadRequest(new { message = "Mã ưu đãi đã hết hạn." });
                }

                if (promotion.UsageLimit != null && (promotion.UsedCount ?? 0) >= promotion.UsageLimit)
                {
                    return BadRequest(new { message = "Mã ưu đãi đã hết lượt sử dụng." });
                }

                var minOrderAmount = promotion.MinOrderAmount ?? 0;

                if (request.SubtotalAmount < minOrderAmount)
                {
                    var needMore = minOrderAmount - request.SubtotalAmount;

                    return BadRequest(new
                    {
                        message = $"Mã {promotion.CouponCode} áp dụng cho đơn từ {minOrderAmount:N0}đ. Bạn cần mua thêm {needMore:N0}đ."
                    });
                }

                var type = NormalizePromotionType(promotion.PromotionType);
                var value = promotion.DiscountValue ?? 0;

                decimal discountAmount = 0;
                decimal shippingDiscount = 0;
                decimal installationDiscount = 0;

                switch (type)
                {
                    case "PERCENT":
                        discountAmount = request.SubtotalAmount * value / 100;
                        if (promotion.MaxDiscountAmount != null && discountAmount > promotion.MaxDiscountAmount.Value)
                        {
                            discountAmount = promotion.MaxDiscountAmount.Value;
                        }
                        break;

                    case "FIXED":
                        discountAmount = value;
                        break;

                    case "FREESHIP":
                        shippingDiscount = request.ShippingFee;
                        break;

                    case "INSTALLATION":
                        installationDiscount = Math.Min(request.InstallationFee, value);
                        break;

                    default:
                        return BadRequest(new { message = "Loại mã ưu đãi không hợp lệ." });
                }

                var totalDiscount = discountAmount + shippingDiscount + installationDiscount;

                var finalAmount =
                    request.SubtotalAmount +
                    request.ShippingFee +
                    request.InstallationFee -
                    totalDiscount;

                if (finalAmount < 0)
                {
                    finalAmount = 0;
                }

                return Ok(new ApplyPromotionResponse
                {
                    IsValid = true,
                    CouponCode = promotion.CouponCode ?? "",
                    Message = $"Áp dụng mã {promotion.CouponCode} thành công.",
                    DiscountAmount = discountAmount,
                    ShippingDiscount = shippingDiscount,
                    InstallationDiscount = installationDiscount,
                    FinalAmount = finalAmount,
                    PromotionType = type
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("save")]
        public async Task<IActionResult> SavePromotion([FromBody] SavePromotionRequest request)
        {
            try
            {
                var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
                var now = DateTime.Now;

                if (string.IsNullOrWhiteSpace(request.CouponCode))
                {
                    return BadRequest(new { message = "Vui lòng nhập mã ưu đãi." });
                }

                var code = request.CouponCode.Trim().ToUpper();

                var promotion = await _context.Promotions
                    .FirstOrDefaultAsync(p =>
                        p.CouponCode != null &&
                        p.CouponCode.ToUpper() == code
                    );

                if (promotion == null)
                {
                    return BadRequest(new { message = "Mã ưu đãi không tồn tại." });
                }

                if (promotion.Status == null || promotion.Status.ToUpper() != "ACTIVE")
                {
                    return BadRequest(new { message = "Mã ưu đãi hiện không còn hoạt động." });
                }

                if (promotion.EndedAt != null && promotion.EndedAt < now)
                {
                    return BadRequest(new { message = "Mã ưu đãi đã hết hạn, không thể lưu." });
                }

                if (promotion.UsageLimit != null && (promotion.UsedCount ?? 0) >= promotion.UsageLimit)
                {
                    return BadRequest(new { message = "Mã ưu đãi đã hết lượt sử dụng." });
                }

                var existed = await _context.CustomerPromotionWallets
                    .FirstOrDefaultAsync(w =>
                        w.UserId == userId &&
                        w.PromotionId == promotion.Id
                    );

                if (existed != null)
                {
                    return Ok(new
                    {
                        message = $"Mã {promotion.CouponCode} đã có trong ví ưu đãi của bạn.",
                        couponCode = promotion.CouponCode
                    });
                }

                var wallet = new CustomerPromotionWallet
                {
                    UserId = userId,
                    PromotionId = promotion.Id,
                    SavedAt = now,
                    Status = "SAVED"
                };

                _context.CustomerPromotionWallets.Add(wallet);
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = $"Đã lưu mã {promotion.CouponCode} vào ví ưu đãi.",
                    couponCode = promotion.CouponCode
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    message = ex.InnerException?.Message ?? ex.Message
                });
            }
        }

        [Authorize]
        [HttpGet("my")]
        public async Task<IActionResult> GetMyPromotions(
            [FromQuery] decimal subtotalAmount = 0,
            [FromQuery] decimal shippingFee = 0,
            [FromQuery] decimal installationFee = 0)
        {
            try
            {
                var userId = long.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);
                var now = DateTime.Now;
                var checkOrderCondition = subtotalAmount > 0;

                var data = await (
                    from w in _context.CustomerPromotionWallets
                    join p in _context.Promotions on w.PromotionId equals p.Id
                    where w.UserId == userId && w.Status == "SAVED"
                    orderby p.MinOrderAmount
                    select new
                    {
                        Wallet = w,
                        Promotion = p
                    }
                ).ToListAsync();

                var result = data.Select(x =>
                {
                    var p = x.Promotion;

                    bool isUsable = true;
                    string message = "Có thể sử dụng.";

                    decimal discountAmount = 0;
                    decimal shippingDiscount = 0;
                    decimal installationDiscount = 0;

                    if (p.Status == null || p.Status.ToUpper() != "ACTIVE")
                    {
                        isUsable = false;
                        message = "Mã ưu đãi hiện không còn hoạt động.";
                    }
                    else if (p.StartedAt != null && p.StartedAt > now)
                    {
                        isUsable = false;
                        message = "Mã ưu đãi chưa đến thời gian sử dụng.";
                    }
                    else if (p.EndedAt != null && p.EndedAt < now)
                    {
                        isUsable = false;
                        message = "Mã ưu đãi đã hết hạn.";
                    }
                    else if (p.UsageLimit != null && (p.UsedCount ?? 0) >= p.UsageLimit)
                    {
                        isUsable = false;
                        message = "Mã ưu đãi đã hết lượt sử dụng.";
                    }
                    else if (checkOrderCondition && subtotalAmount < (p.MinOrderAmount ?? 0))
                    {
                        var needMore = (p.MinOrderAmount ?? 0) - subtotalAmount;
                        isUsable = false;
                        message = $"Cần mua thêm {needMore:N0}đ để sử dụng mã này.";
                    }

                    if (isUsable && checkOrderCondition)
                    {
                        var type = NormalizePromotionType(p.PromotionType);
                        var value = p.DiscountValue ?? 0;

                        switch (type)
                        {
                            case "PERCENT":
                            case "PERCENTAGE":
                                discountAmount = subtotalAmount * value / 100;

                                if (p.MaxDiscountAmount != null &&
                                    discountAmount > p.MaxDiscountAmount.Value)
                                {
                                    discountAmount = p.MaxDiscountAmount.Value;
                                }

                                break;

                            case "FIXED":
                            case "AMOUNT":
                            case "FIXED_AMOUNT":
                                discountAmount = value;
                                break;

                            case "FREESHIP":
                            case "FREE_SHIP":
                                shippingDiscount = shippingFee;
                                break;

                            case "INSTALLATION":
                                installationDiscount = Math.Min(installationFee, value);
                                break;
                        }
                    }

                    var totalDiscount = discountAmount + shippingDiscount + installationDiscount;
                    var finalAmount = subtotalAmount + shippingFee + installationFee - totalDiscount;
                    if (finalAmount < 0) finalAmount = 0;

                    return new MyPromotionResponse
                    {
                        WalletId = x.Wallet.Id,
                        PromotionId = p.Id,
                        CouponCode = p.CouponCode ?? "",
                        PromotionName = p.PromotionName ?? "",
                        PromotionType = p.PromotionType ?? "",
                        DiscountValue = p.DiscountValue ?? 0,
                        MinOrderAmount = p.MinOrderAmount ?? 0,
                        MaxDiscountAmount = p.MaxDiscountAmount,

                        IsUsable = isUsable,
                        Message = message,

                        DiscountAmount = discountAmount,
                        ShippingDiscount = shippingDiscount,
                        InstallationDiscount = installationDiscount,
                        FinalAmount = finalAmount
                    };
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}