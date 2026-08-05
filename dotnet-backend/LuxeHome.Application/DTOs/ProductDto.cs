namespace LuxeHome.Application.DTOs
{
    public class ProductResponseDto
    {
        public long Id { get; set; }
        public string ProductName { get; set; }
        public decimal? AverageRating { get; set; }
        public string Style { get; set; }
        public string ShortDescription { get; set; }
        public string Description { get; set; }
        public string Material { get; set; }
        public int? WarrantyMonths { get; set; }

        public int StockQuantity { get; set; }
        public int Stock { get; set; }
        public int TotalStock { get; set; }

        public string? Status { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public CategoryInfoDto Category { get; set; }
        public List<ProductImageDto> ProductImages { get; set; }
        public List<ProductVariantDto> ProductVariants { get; set; }
    }

    public class CategoryInfoDto
    {
        public string Slug { get; set; }
        public string CategoryName { get; set; }
    }

    public class ProductVariantDto
    {
        public decimal? CurrentPrice { get; set; }
        public string Color { get; set; }
        public long Id { get; set; }
        public string Sku { get; set; }
        public int StockQuantity { get; set; }
    }
}