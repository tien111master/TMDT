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

    

    [HttpGet("category-counts")]
    public async Task<IActionResult> GetCategoryCounts()
    {
        var counts = await _context.Products
            .Where(p => p.Status != "INACTIVE" && p.CategoryId != null)
            .GroupBy(p => p.Category!.Slug)
            .Select(g => new { Slug = g.Key, Count = g.Count() })
            .ToListAsync();

        return Ok(counts);
    }

    // ==========================================================================
    // COPY TOÀN BỘ ĐOẠN DƯỚI ĐÂY, DÁN VÀO BÊN TRONG class ProductsController
    // (đặt sau action GetCategoryCounts() là hợp lý nhất)
    // KHÔNG xoá bất kỳ action nào đang có sẵn trong ProductsController.cs
    // ==========================================================================

    // DTO trả về danh sách màu (variant) + ảnh + tồn kho của 1 sản phẩm
    public class VariantDto
    {
        public long Id { get; set; }
        public string? Color { get; set; }
        public decimal? CurrentPrice { get; set; }
        public string? Sku { get; set; }
        public string? Status { get; set; }
        public string? ImageUrl { get; set; }
        public int Stock { get; set; }
    }

    // GET /api/products/{id}/variants
    // Lấy toàn bộ màu (variant) + ảnh riêng từng màu của 1 sản phẩm, để hiển thị trong modal quản lý màu
    [HttpGet("{id}/variants")]
    public async Task<IActionResult> GetProductVariants(long id)
    {
        var variants = await _context.ProductVariants
            .Where(v => v.ProductId == id)
            .Select(v => new VariantDto
            {
                Id = v.Id,
                Color = v.Color,
                CurrentPrice = v.CurrentPrice,
                Sku = v.Sku,
                Status = v.Status,
                ImageUrl = _context.ProductImages
                    .Where(img => img.VariantId == v.Id)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                Stock = _context.InventoryStocks
                    .Where(s => s.VariantId == v.Id)
                    .Sum(s => (int?)s.QuantityAvailable) ?? 0
            })
            .ToListAsync();

        return Ok(variants);
    }

    // DTO nhận dữ liệu khi thêm 1 màu mới
    public class CreateVariantDto
    {
        public string Color { get; set; } = "";
        public decimal CurrentPrice { get; set; }
        public string? ImageUrl { get; set; }
        public int InitialStock { get; set; } = 0;
    }

    // POST /api/products/{id}/variants
    // Thêm 1 màu mới cho sản phẩm đã có sẵn, kèm ảnh riêng (nếu có) và tồn kho ban đầu
    [HttpPost("{id}/variants")]
    public async Task<IActionResult> AddProductVariant(long id, [FromBody] CreateVariantDto dto)
    {
        var product = await _context.Products.FindAsync(id);
        if (product == null) return NotFound(new { message = "Không tìm thấy sản phẩm." });

        if (string.IsNullOrWhiteSpace(dto.Color))
            return BadRequest(new { message = "Vui lòng nhập tên màu." });

        var exists = await _context.ProductVariants.AnyAsync(v => v.ProductId == id && v.Color == dto.Color);
        if (exists) return BadRequest(new { message = "Màu này đã tồn tại cho sản phẩm, không thể thêm trùng." });

        var uniqueSuffix = Guid.NewGuid().ToString("N").Substring(0, 6).ToUpper();
        var variant = new ProductVariant
        {
            ProductId = id,
            Sku = $"{product.ProductCode}-{uniqueSuffix}",
            VariantName = $"{product.ProductName} - {dto.Color}",
            Color = dto.Color,
            CurrentPrice = dto.CurrentPrice,
            Status = "ACTIVE"
        };
        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync(); // cần Id của variant trước khi gắn ảnh/tồn kho

        if (!string.IsNullOrEmpty(dto.ImageUrl))
        {
            _context.ProductImages.Add(new ProductImage
            {
                ProductId = id,
                VariantId = variant.Id,
                ImageUrl = dto.ImageUrl,
                AltText = variant.VariantName,
                IsMain = false
            });
        }

        _context.InventoryStocks.Add(new InventoryStock
        {
            ProductId = id,
            VariantId = variant.Id,
            QuantityAvailable = dto.InitialStock,
            QuantityOnHand = dto.InitialStock,
            QuantityReserved = 0,
            MinStockLevel = 5,
            StockStatus = "IN_STOCK",
            UpdatedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync();

        return Ok(new { id = variant.Id, message = "Đã thêm màu mới thành công." });
    }

    // DTO nhận dữ liệu khi sửa 1 màu đã có (đổi tên màu / giá / ảnh)
    public class UpdateVariantDto
    {
        public string? Color { get; set; }
        public decimal? CurrentPrice { get; set; }
        public string? ImageUrl { get; set; }
        public int? Stock { get; set; }
    }

    // PUT /api/products/variants/{variantId}
    // Sửa thông tin 1 màu cụ thể (không cần biết productId vì variantId đã đủ định danh duy nhất)
    [HttpPut("variants/{variantId}")]
    public async Task<IActionResult> UpdateProductVariant(long variantId, [FromBody] UpdateVariantDto dto)
    {
        var variant = await _context.ProductVariants.FindAsync(variantId);
        if (variant == null)
            return NotFound(new { message = "Không tìm thấy biến thể màu này." });

        if (!string.IsNullOrWhiteSpace(dto.Color))
            variant.Color = dto.Color;

        if (dto.CurrentPrice.HasValue)
            variant.CurrentPrice = dto.CurrentPrice;

        if (dto.ImageUrl != null)
        {
            var img = await _context.ProductImages.FirstOrDefaultAsync(i => i.VariantId == variantId);
            if (img != null)
            {
                img.ImageUrl = dto.ImageUrl;
            }
            else
            {
                _context.ProductImages.Add(new ProductImage
                {
                    ProductId = variant.ProductId,
                    VariantId = variantId,
                    ImageUrl = dto.ImageUrl,
                    AltText = variant.VariantName,
                    IsMain = false
                });
            }
        }

        // Thêm đoạn này
        if (dto.Stock.HasValue)
        {
            var stockRecord = await _context.InventoryStocks
                .FirstOrDefaultAsync(s => s.VariantId == variantId);

            if (stockRecord != null)
            {
                stockRecord.QuantityAvailable = dto.Stock.Value;
                stockRecord.QuantityOnHand = dto.Stock.Value;
                stockRecord.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                _context.InventoryStocks.Add(new InventoryStock
                {
                    ProductId = variant.ProductId,
                    VariantId = variantId,
                    QuantityAvailable = dto.Stock.Value,
                    QuantityOnHand = dto.Stock.Value,
                    QuantityReserved = 0,
                    MinStockLevel = 5,
                    StockStatus = "IN_STOCK",
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        await _context.SaveChangesAsync();
        return Ok(new { message = "Đã cập nhật biến thể màu." });
    }

    // DELETE /api/products/variants/{variantId}
    // Xoá 1 màu (kèm ảnh + tồn kho gắn với màu đó). Không cho xoá nếu đây là màu cuối cùng của sản phẩm.
    [HttpDelete("variants/{variantId}")]
    public async Task<IActionResult> DeleteProductVariant(long variantId)
    {
        var variant = await _context.ProductVariants.FindAsync(variantId);
        if (variant == null) return NotFound(new { message = "Không tìm thấy biến thể màu này." });

        var remainingCount = await _context.ProductVariants.CountAsync(v => v.ProductId == variant.ProductId);
        if (remainingCount <= 1)
            return BadRequest(new { message = "Sản phẩm phải có ít nhất 1 màu, không thể xoá màu cuối cùng." });

        var images = _context.ProductImages.Where(i => i.VariantId == variantId);
        _context.ProductImages.RemoveRange(images);

        var stocks = _context.InventoryStocks.Where(s => s.VariantId == variantId);
        _context.InventoryStocks.RemoveRange(stocks);

        _context.ProductVariants.Remove(variant);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Đã xoá màu thành công." });
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
                .Select(img => new ProductImageDto
                {
                    ImageUrl = img.ImageUrl,
                    VariantId = img.VariantId
                })
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
                    VariantId = img.VariantId,
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