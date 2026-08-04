using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Application.DTOs;
using LuxeHome.Domain.Entities;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly LuxeHomeDbContext _context;
    private readonly LuxeHome.Infrastructure.Services.CloudinaryService _cloudinaryService;

    public ProductsController(LuxeHomeDbContext context, LuxeHome.Infrastructure.Services.CloudinaryService cloudinaryService)
    {
        _context = context;
        _cloudinaryService = cloudinaryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProducts(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10, 
        [FromQuery] string search = "", 
        [FromQuery] string category = "",
        [FromQuery] string style = "",
        [FromQuery] string color = "",
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] string sortBy = "rating")
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductImages)
            .Include(p => p.ProductVariants)
            .Where(p => p.Status != "INACTIVE")
            .AsQueryable();

        if (!string.IsNullOrEmpty(search))
        {
            query = query.Where(p => p.ProductName.ToLower().Contains(search.ToLower()) || 
                                     p.ProductCode.ToLower().Contains(search.ToLower()));
        }

        if (!string.IsNullOrEmpty(category) && category != "all")
        {
            query = query.Where(p => p.Category != null && p.Category.Slug == category);
        }

        if (!string.IsNullOrEmpty(style) && style != "all")
        {
            query = query.Where(p => p.Style == style);
        }

        if (!string.IsNullOrEmpty(color) && color != "all")
        {
            query = query.Where(p => p.ProductVariants.Any(v => v.Color == color));
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(p => p.ProductVariants.Any()
                && p.ProductVariants.Min(v => v.CurrentPrice) <= maxPrice.Value);
        }

        int totalItems = await query.CountAsync();
        int totalPages = (int)Math.Ceiling(totalItems / (double)pageSize);

        query = sortBy switch
        {
            "price-asc" => query.OrderBy(p => p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.CurrentPrice) : decimal.MaxValue),
            "price-desc" => query.OrderByDescending(p => p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.CurrentPrice) : 0),
            "name" => query.OrderBy(p => p.ProductName),
            _ => query.OrderByDescending(p => p.AverageRating).ThenByDescending(p => p.Id)
        };

        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductResponseDto
            {
                Id = p.Id,
                ProductName = p.ProductName,
                AverageRating = p.AverageRating,
                Style = p.Style,
                ShortDescription = p.ShortDescription,
                Description = p.Description,
                Material = p.Material,
                WarrantyMonths = p.WarrantyMonths,

                // Cùng 1 nguồn dữ liệu, gán vào cả 3 tên field để tương thích với mọi nơi đang đọc
                Stock = p.InventoryStocks.Sum(s => (int?)s.QuantityAvailable) ?? 0,
                TotalStock = p.InventoryStocks.Sum(s => (int?)s.QuantityAvailable) ?? 0,
                StockQuantity = p.InventoryStocks.Sum(s => (int?)s.QuantityAvailable) ?? 0,

                Status = p.Status,
                MetaTitle = p.MetaTitle,
                MetaDescription = p.MetaDescription,
                Category = p.Category != null ? new CategoryInfoDto 
                {
                    Slug = p.Category.Slug,
                    CategoryName = p.Category.CategoryName
                } : null,
                ProductImages = p.ProductImages
                    .OrderBy(img => img.SortOrder)
                    .Select(img => new ProductImageDto { ImageUrl = img.ImageUrl })
                    .ToList(),
                ProductVariants = p.ProductVariants
                    .Select(v => new ProductVariantDto 
                    { 
                        Id = v.Id,   
                        Sku = v.Sku,
                        CurrentPrice = v.CurrentPrice, 
                        Color = v.Color,
                        StockQuantity = _context.InventoryStocks
                            .Where(s => s.VariantId == v.Id)
                            .Sum(s => s.QuantityAvailable ?? 0)
                    })
                    .ToList()
            })
            .ToListAsync();

        return Ok(new { 
            Items = products, 
            TotalItems = totalItems, 
            TotalPages = totalPages, 
            CurrentPage = page 
        });
    }

    // 2. Thêm sản phẩm mới từ giao diện Admin
    [HttpPost]
    public async Task<IActionResult> CreateProduct([FromBody] CreateProductDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            long? categoryId = null;
            if (!string.IsNullOrEmpty(dto.CategorySlug))
            {
                var category = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == dto.CategorySlug);
                categoryId = category?.Id;
            }

            var product = new Product
            {
                ProductName = dto.ProductName,
                Slug = dto.Slug,
                CategoryId = categoryId,
                ShortDescription = dto.ShortDescription,
                Description = dto.Description,
                Material = dto.Material,
                Style = dto.Style,
                WarrantyMonths = dto.WarrantyMonths,
                Status = (dto.Status ?? "ACTIVE").ToUpper(),
                AverageRating = 5,
                ViewCount = 0,
                SoldCount = 0
            };

            if (dto.Images != null && dto.Images.Any())
            {
                product.ProductImages = dto.Images.Select(img => new ProductImage
                {
                    ImageUrl = img.ImageUrl,
                    IsMain = img.IsMain,
                    SortOrder = img.SortOrder
                }).ToList();
            }

            List<ProductVariant> productVariants;

            if (dto.Variants != null && dto.Variants.Any())
            {
                productVariants = dto.Variants.Select(v => new ProductVariant
                {
                    VariantName = dto.ProductName + " - " + v.Color,
                    Color = v.Color,
                    CurrentPrice = v.CurrentPrice,
                    Status = "ACTIVE"
                }).ToList();
            }
            else
            {
                productVariants = new List<ProductVariant>
                {
                    new ProductVariant
                    {
                        VariantName = dto.ProductName + " - Mặc định",
                        Color = "Mặc định",
                        CurrentPrice = 0,
                        Status = "ACTIVE"
                    }
                };
            }

            product.ProductVariants = productVariants;

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            int stockPerVariant = product.ProductVariants.Count > 0
                ? dto.InitialStock / product.ProductVariants.Count
                : dto.InitialStock;

            foreach (var variant in product.ProductVariants)
            {
                _context.InventoryStocks.Add(new InventoryStock
                {
                    ProductId = product.Id,
                    VariantId = variant.Id,
                    QuantityAvailable = stockPerVariant,
                    QuantityOnHand = stockPerVariant,
                    QuantityReserved = 0,
                    MinStockLevel = 5,
                    StockStatus = "IN_STOCK",
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Thêm sản phẩm thành công", id = product.Id });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine("CREATE PRODUCT ERROR: " + ex.ToString());
            return StatusCode(500, new { message = "Lỗi server", detail = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteProduct(long id)
    {
        try
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound("Không tìm thấy sản phẩm.");

            product.Status = "INACTIVE";
            await _context.SaveChangesAsync();

            return NoContent();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Lỗi server: {ex.Message}");
        }
    }

    public class UpdateStockDto
    {
        public int NewStock { get; set; }
    }

    [HttpPatch("{id}/stock")]
    public async Task<IActionResult> UpdateStock(long id, [FromBody] UpdateStockDto dto)
    {
        try
        {
            var stockRecords = await _context.InventoryStocks.Where(i => i.ProductId == id).ToListAsync();

            if (!stockRecords.Any())
            {
                var firstVariant = await _context.ProductVariants.FirstOrDefaultAsync(v => v.ProductId == id);
                if (firstVariant == null)
                    return BadRequest(new { message = "Sản phẩm này chưa có biến thể (variant), không thể tạo tồn kho." });

                var newStock = new InventoryStock
                {
                    ProductId = id,
                    VariantId = firstVariant.Id,
                    QuantityAvailable = dto.NewStock,
                    QuantityOnHand = dto.NewStock,
                    QuantityReserved = 0,
                    MinStockLevel = 5,
                    StockStatus = "IN_STOCK",
                    UpdatedAt = DateTime.UtcNow
                };
                _context.InventoryStocks.Add(newStock);
                await _context.SaveChangesAsync();
                return Ok(new { message = "Đã tạo mới bản ghi tồn kho.", newStock = dto.NewStock });
            }

            var firstVariantStock = stockRecords.First();
            firstVariantStock.QuantityAvailable = dto.NewStock;
            firstVariantStock.QuantityOnHand = dto.NewStock;
            firstVariantStock.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật tồn kho thành công.", newStock = dto.NewStock });
        }
        catch (Exception ex)
        {
            Console.WriteLine("UPDATE STOCK ERROR: " + ex.ToString());
            return StatusCode(500, new { message = "Lỗi cập nhật tồn kho", detail = ex.InnerException?.Message ?? ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateProduct(long id, [FromBody] UpdateProductDto dto)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        try
        {
            var product = await _context.Products
                .Include(p => p.ProductVariants)
                .Include(p => p.Category)
                .Include(p => p.ProductImages)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

            if (!string.IsNullOrEmpty(dto.CategorySlug) && (product.Category == null || product.Category.Slug != dto.CategorySlug))
            {
                var newCategory = await _context.Categories.FirstOrDefaultAsync(c => c.Slug == dto.CategorySlug);
                if (newCategory != null) product.CategoryId = newCategory.Id;
            }

            product.ProductName = dto.ProductName;
            product.Style = dto.Style;
            product.Material = dto.Material;

            if (!string.IsNullOrEmpty(dto.Status)) product.Status = dto.Status.ToUpper();
            if (dto.MetaTitle != null) product.MetaTitle = dto.MetaTitle;
            if (dto.MetaDescription != null) product.MetaDescription = dto.MetaDescription;

            if (!string.IsNullOrEmpty(dto.ImageUrl))
            {
                var mainImage = product.ProductImages.FirstOrDefault(i => i.IsMain == true);
                if (mainImage != null) {
                    mainImage.ImageUrl = dto.ImageUrl;
                } else {
                    product.ProductImages.Add(new ProductImage { ImageUrl = dto.ImageUrl, IsMain = true, SortOrder = 1 });
                }
            }

            ProductVariant? targetVariant = product.ProductVariants.FirstOrDefault();
            if (targetVariant == null)
            {
                targetVariant = new ProductVariant
                {
                    ProductId = product.Id,
                    VariantName = product.ProductName + " - Mặc định",
                    Color = "Mặc định",
                    CurrentPrice = dto.CurrentPrice,
                    Status = "ACTIVE"
                };
                _context.ProductVariants.Add(targetVariant);
                await _context.SaveChangesAsync();
            }
            else
            {
                targetVariant.CurrentPrice = dto.CurrentPrice;
            }

            var stockRecord = await _context.InventoryStocks
                .FirstOrDefaultAsync(i => i.ProductId == id && i.VariantId == targetVariant.Id);

            if (stockRecord != null)
            {
                stockRecord.QuantityAvailable = dto.Stock;
                stockRecord.QuantityOnHand = dto.Stock;
                stockRecord.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.InventoryStocks.Add(new InventoryStock
                {
                    ProductId = id,
                    VariantId = targetVariant.Id,
                    QuantityAvailable = dto.Stock,
                    QuantityOnHand = dto.Stock,
                    QuantityReserved = 0,
                    MinStockLevel = 5,
                    StockStatus = "IN_STOCK",
                    UpdatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();

            return Ok(new { message = "Cập nhật sản phẩm thành công." });
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            Console.WriteLine("UPDATE PRODUCT ERROR: " + ex.ToString());
            return StatusCode(500, new { message = "Lỗi server", detail = ex.InnerException?.Message ?? ex.Message });
        }
    }
    [HttpPost("upload-image")]
    public async Task<IActionResult> UploadImage(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Không có file được gửi lên." });

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
            return BadRequest(new { message = "Định dạng ảnh không hợp lệ. Chỉ chấp nhận jpg, jpeg, png, webp." });

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest(new { message = "Ảnh không được vượt quá 5MB." });

        try
        {
            using var stream = file.OpenReadStream();
            var imageUrl = await _cloudinaryService.UploadImageAsync(stream, file.FileName);
            return Ok(new { imageUrl });
        }
        catch (Exception ex)
        {
            Console.WriteLine("CLOUDINARY UPLOAD ERROR: " + ex.Message);
            return StatusCode(500, new { message = "Tải ảnh lên thất bại.", detail = ex.Message });
        }
    }
}