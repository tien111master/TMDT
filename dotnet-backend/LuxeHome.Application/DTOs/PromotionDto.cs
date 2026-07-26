namespace LuxeHome.Application.DTOs
{
    // "Tạo chương trình khuyến mãi" + "Thiết lập điều kiện khuyến mãi"
    public class CreatePromotionDto
    {
        public string PromotionName { get; set; } = string.Empty;

        // Nhánh "Có phát hành mã giảm giá?" — null/rỗng nghĩa là chọn "Không"
        public string? CouponCode { get; set; }

        // "PercentDiscount" hoặc "FixedDiscount"
        public string PromotionType { get; set; } = "FixedDiscount";

        public decimal DiscountValue { get; set; }

        public decimal? MinOrderAmount { get; set; }

        public decimal? MaxDiscountAmount { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime EndedAt { get; set; }

        public int? UsageLimit { get; set; }
    }

    // "Chọn chương trình cần cập nhật" + "Cập nhật chương trình khuyến mãi"
    public class UpdatePromotionDto
    {
        public string PromotionName { get; set; } = string.Empty;

        public string? CouponCode { get; set; }

        public string PromotionType { get; set; } = "FixedDiscount";

        public decimal DiscountValue { get; set; }

        public decimal? MinOrderAmount { get; set; }

        public decimal? MaxDiscountAmount { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime EndedAt { get; set; }

        public int? UsageLimit { get; set; }
    }

    // "Ẩn/Hiện mã giảm giá" — không phụ thuộc Status
    public class ToggleVisibilityDto
    {
        public bool IsHidden { get; set; }
    }
}