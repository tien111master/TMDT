using System;
using System.Collections.Generic;

namespace LuxeHome.Domain.Entities;

public partial class Promotion
{
    public long Id { get; set; }

    public string? PromotionName { get; set; }

    public string? CouponCode { get; set; }

    public string? PromotionType { get; set; }

    public decimal? DiscountValue { get; set; }

    public decimal? MinOrderAmount { get; set; }

    public decimal? MaxDiscountAmount { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? EndedAt { get; set; }

    public int? UsageLimit { get; set; }

    public int? UsedCount { get; set; }

    public string? Status { get; set; }

    public bool IsHidden { get; set; } = false;
}
