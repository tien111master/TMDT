namespace LuxeHome.Application.DTOs
{
    public class CreateProductDto
    {
        public string ProductName { get; set; }
        public string Slug { get; set; }
        public string CategorySlug { get; set; } // Dùng Slug để tìm Id dưới DB
        public string ShortDescription { get; set; }
        public string Description { get; set; }
        public string Material { get; set; }
        public string Style { get; set; }
        public int WarrantyMonths { get; set; }
        public string Brand { get; set; }
        public string Status { get; set; }
        public int InitialStock { get; set; }

        public List<CreateProductImageDto> Images { get; set; }
        public List<CreateProductVariantDto> Variants { get; set; }
    }

    public class CreateProductImageDto
    {
        public string ImageUrl { get; set; }
        public bool IsMain { get; set; }
        public int SortOrder { get; set; }
        public long? VariantId { get; set; }
    }

    public class CreateProductVariantDto
    {
        public string Color { get; set; }
        public decimal CurrentPrice { get; set; }
        public string Status { get; set; }
    }
}