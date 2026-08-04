using Bogus;
using LuxeHome.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LuxeHome.Infrastructure.Data
{
    public static class DataSeeder
    {
        public static async Task SeedAsync(LuxeHomeDbContext context, bool isEnabled = true)
        {
            // Set locale sang tiếng Việt để tạo tên, địa chỉ thực tế hơn
            Randomizer.Seed = new Random(8675309);

            // Kiểm tra nếu DB đã có dữ liệu thì bỏ qua seed
            if (await context.Roles.AnyAsync()) return;

            // ==========================================
            // 1. SEED ROLES
            // ==========================================
            var roles = new List<Role>
            {
                new Role { RoleCode = "ADMIN", RoleName = "Quản trị viên", Status = "Active" },
                new Role { RoleCode = "CUSTOMER", RoleName = "Khách hàng", Status = "Active" }
            };
            await context.Roles.AddRangeAsync(roles);
            await context.SaveChangesAsync();

            // 1. Lấy Role ID an toàn hơn
            var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleCode == "ADMIN");
            var customerRole = await context.Roles.FirstOrDefaultAsync(r => r.RoleCode == "CUSTOMER");

            // Kiểm tra null trước khi sử dụng để tránh lỗi CS8602
            if (adminRole == null || customerRole == null) 
                throw new Exception("Chưa seed Roles hoặc dữ liệu Roles bị thiếu.");

            var adminRoleId = adminRole.Id;
            var customerRoleId = customerRole.Id;

            // 2. SEED USERS - Cập nhật Faker để sử dụng ID đã lấy
            var userFaker = new Faker<User>("vi")
                .RuleFor(u => u.RoleId, f => f.PickRandom(adminRoleId, customerRoleId))
                .RuleFor(u => u.FullName, f => f.Name.FullName())
                .RuleFor(u => u.Email, (f, u) => f.Internet.Email(u.FullName))
                .RuleFor(u => u.Phone, f => f.Phone.PhoneNumber("0#########"))
                .RuleFor(u => u.PasswordHash, f => "$2a$11$N/V.gVzO8aD/jV7...") // Placeholder hash (Nên dùng BCrypt thật)
                .RuleFor(u => u.AvatarUrl, f => f.Internet.Avatar())
                .RuleFor(u => u.Status, f => "Active")
                .RuleFor(u => u.CreatedAt, f => f.Date.Past(1));

            var users = userFaker.Generate(15);
            await context.Users.AddRangeAsync(users);
            await context.SaveChangesAsync();

            // ==========================================
            // 3. SEED CATEGORIES (Dữ liệu Nội thất thật)
            // ==========================================
            var categoryNames = new[] { "Phòng Khách", "Phòng Ngủ", "Phòng Ăn", "Phòng Làm Việc", "Đồ Trang Trí" };
            
            var categoryFaker = new Faker<Category>("vi")
                // Lấy lần lượt các tên danh mục chuẩn xác
                .RuleFor(c => c.CategoryName, f => f.PickRandom(categoryNames))
                .RuleFor(c => c.Slug, (f, c) =>
{
    var categoryName = c.CategoryName ?? "danh-muc";

    return categoryName
        .ToLower()
        .Replace(" ", "-")
        .Replace("đ", "d")
        + "-" + f.Random.Number(100, 999);
})           
                .RuleFor(c => c.Description, (f, c) =>
                {
                    var categoryName = c.CategoryName ?? "danh mục";
                    return "Danh mục các sản phẩm nội thất cao cấp dành cho " + categoryName;
                })                .RuleFor(c => c.ThumbnailUrl, f => f.Image.PicsumUrl())
                .RuleFor(c => c.IsVisible, f => true)
                .RuleFor(c => c.Status, f => "Active");

            var categories = categoryFaker.Generate(5); // Tạo đúng 5 danh mục
            await context.Categories.AddRangeAsync(categories);
            await context.SaveChangesAsync();

            // ==========================================
            // 4. SEED PRODUCTS (Dữ liệu Nội thất thật)
            // ==========================================
            var productPrefixes = new[] { "Sofa Da Bò Ý", "Bàn Trà Cẩm Thạch", "Giường Ngủ Master", "Tủ Quần Áo Kính", "Bàn Ăn Gỗ Sồi", "Ghế Công Thái Học", "Kệ Tivi Gỗ Óc Chó", "Đèn Chùm Pha Lê" };
            var productStyles = new[] { "Royal", "Venice", "Nordic", "Aurora", "Milano", "Prestige", "Minimalist" };
            var materials = new[] { "Da Bò Tự Nhiên", "Gỗ Sồi Nga", "Đá Cẩm Thạch", "Kính Cường Lực", "Khung Hợp Kim Nôm" };

            var productFaker = new Faker<Product>("vi")
    .RuleFor(p => p.CategoryId, (f, p) => (long?)f.PickRandom(categories).Id)
    .RuleFor(p => p.ProductCode, f => f.Commerce.Ean13())

    .RuleFor(p => p.ProductName, f => $"{f.PickRandom(productPrefixes)} {f.PickRandom(productStyles)}")

    .RuleFor(p => p.Slug, (f, p) =>
    {
        var productName = p.ProductName ?? "san-pham";

        return productName
            .ToLower()
            .Replace(" ", "-")
            .Replace("đ", "d")
            + "-" + f.Random.AlphaNumeric(5).ToLower();
    })

    .RuleFor(p => p.ShortDescription, (f, p) =>
    {
        var productName = p.ProductName ?? "Sản phẩm nội thất";
        return $"Tuyệt tác {productName} mang đến không gian sống đẳng cấp.";
    })

    .RuleFor(p => p.Description, f => "Sản phẩm được chế tác tỉ mỉ từ những nghệ nhân hàng đầu, đảm bảo độ bền bỉ vượt thời gian và tính thẩm mỹ cao nhất cho không gian kiến trúc của bạn.")
    .RuleFor(p => p.Material, f => f.PickRandom(materials))
    .RuleFor(p => p.WarrantyMonths, f => f.PickRandom(12, 24, 60))
    .RuleFor(p => p.Status, f => "Active")
    .RuleFor(p => p.IsFeatured, f => f.Random.Bool(0.3f))
    .RuleFor(p => p.AverageRating, f => f.Random.Decimal(4.0m, 5.0m))
    .RuleFor(p => p.ReviewCount, f => f.Random.Number(10, 500));

            var products = productFaker.Generate(30);
            await context.Products.AddRangeAsync(products);
            await context.SaveChangesAsync();

            // 5. SEED VARIANTS & IMAGES
        var variants = new List<ProductVariant>();
        var images = new List<ProductImage>();

        foreach (var product in products)
        {
            // Cần kiểm tra product không null
            if (product == null) continue; 

            // Mỗi product sẽ có từ 1-3 variants
            var variantCount = new Random().Next(1, 4);
            var variantFaker = new Faker<ProductVariant>("vi")
                .RuleFor(v => v.ProductId, product.Id)
                .RuleFor(v => v.Sku, f => $"SKU-{f.Random.AlphaNumeric(8).ToUpper()}")
                .RuleFor(v => v.VariantName, f => f.Commerce.Color())
                .RuleFor(v => v.Color, f => f.Commerce.Color())
                .RuleFor(v => v.CurrentPrice, f => decimal.Parse(f.Commerce.Price(500000, 10000000, 0)))
                .RuleFor(v => v.CompareAtPrice, (f, v) => v.CurrentPrice * f.Random.Decimal(1.1m, 1.4m))
                .RuleFor(v => v.Status, "Active");

            variants.AddRange(variantFaker.Generate(variantCount));

            // Mỗi product sẽ có từ 2-4 hình ảnh
            var imageCount = new Random().Next(2, 5);
            var imageFaker = new Faker<ProductImage>()
                .RuleFor(i => i.ProductId, product.Id)
                .RuleFor(i => i.ImageUrl, f => f.Image.PicsumUrl(640, 480))
                .RuleFor(i => i.AltText, product.ProductName ?? "Sản phẩm") // Tránh null reference ở đây
                .RuleFor(i => i.IsMain, false);

            var productImages = imageFaker.Generate(imageCount);
            
            // SỬA LỖI Ở ĐÂY: Dùng FirstOrDefault hoặc kiểm tra count trước khi truy cập chỉ số [0]
            var mainImage = productImages.FirstOrDefault();
            if (mainImage != null)
            {
                mainImage.IsMain = true;
            }
            images.AddRange(productImages);
        }

        await context.ProductVariants.AddRangeAsync(variants);
        await context.ProductImages.AddRangeAsync(images);
        await context.SaveChangesAsync();
        }

        // ==========================================
        // SEED SẢN PHẨM THEO PHÒNG (5 sản phẩm/phòng, kèm màu sắc)
        // Luôn chạy, tự kiểm tra trùng theo ProductCode -> chạy lại bao nhiêu lần cũng an toàn.
        // ==========================================
        public static async Task SeedRoomProductsAsync(LuxeHomeDbContext context)
        {
            var roomProductGroups = new List<(string RoomCategoryName, List<RoomProductSeed> Products)>
            {
                ("Phòng Ngủ", new List<RoomProductSeed>
                {
                    new RoomProductSeed("BEDROOM-001", "Combo Giường 1m8 & Tủ đầu giường ASTRO - Màu Tự Nhiên",
                        "Combo giường 1m8 và tủ đầu giường ASTRO thiết kế tối giản, khung gỗ cao su tự nhiên, đầu giường bọc nệm D50 êm ái.",
                        "Gỗ cao su tự nhiên, MDF/MFC & Plywood chuẩn CARB-P2", 15500000, new[] { "Mặc định" }),
                    new RoomProductSeed("BEDROOM-002", "Combo Phòng Ngủ SCARLET - MOHO Signature",
                        "Thiết kế Ý đương đại, gỗ Ash tự nhiên, vải bọc cao cấp nhập khẩu, đồng bộ giường - tủ quần áo - tủ đầu giường.",
                        "Gỗ Ash tự nhiên, vải bọc cao cấp chuẩn CARB-P2", 32900000, new[] { "Xám" }),
                    new RoomProductSeed("BEDROOM-003", "Combo Tủ Quần Áo VLINE V3",
                        "Giải pháp lưu trữ toàn diện: treo - gấp - trưng bày - ngăn kéo, phù hợp phòng ngủ gia đình 12-20m².",
                        "Gỗ công nghiệp MFC/MDF phủ melamine chuẩn CARB-P2", 8900000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("BEDROOM-004", "Combo Giường - Tủ Đầu Giường VLINE 1m6",
                        "Thân giường gỗ tự nhiên veneer sồi, chân giường gỗ cao su tự nhiên, thiết kế đồng bộ.",
                        "Gỗ tự nhiên veneer sồi, gỗ cao su tự nhiên", 12500000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("BEDROOM-005", "Combo Giường - Tủ Đầu Giường HOBRO 1m6",
                        "Thân giường gỗ tràm tự nhiên/MDF veneer tràm, tấm phản plywood chuẩn CARB-P2.",
                        "Gỗ tràm tự nhiên, MDF veneer tràm", 11200000, new[] { "Mặc định" }),
                }),
                ("Phòng Khách", new List<RoomProductSeed>
                {
                    new RoomProductSeed("LIVING-001", "Ghế Sofa Da Microfiber PU MOHO RIGA Dark Grey",
                        "Da Microfiber PU bền bỉ, khung gỗ tự nhiên, chân sắt sơn tĩnh điện, đệm mút êm ái giữ phom dáng.",
                        "Da Microfiber PU, khung gỗ tự nhiên, chân sắt sơn tĩnh điện", 18500000, new[] { "Xám ghi" }),
                    new RoomProductSeed("LIVING-002", "Combo Phòng Khách KLINE (Sofa da Microfiber PU)",
                        "Bộ combo Sofa KLINE, Kệ TV KLINE và Set bàn cafe KLINE đồng bộ phong cách hiện đại.",
                        "Microfiber PU, gỗ công nghiệp MFC/MDF/PP phủ Melamine chuẩn CARB-P2", 27800000, new[] { "Đen" }),
                    new RoomProductSeed("LIVING-003", "Ghế Armchair Xoay 360 Kèm Đôn MOHO OASIS",
                        "Ghế lounge xoay 360 kèm đôn, vải 100% polyester, chân hợp kim chống gỉ, đạt chuẩn chống cháy BS 5852.",
                        "Vải polyester, chân hợp kim chống gỉ sét", 9600000, new[] { "Xám" }),
                    new RoomProductSeed("LIVING-004", "Bàn Sofa - Bàn Cafe - Bàn Trà Gỗ MOHO VLINE 501",
                        "Mặt bàn gỗ tự nhiên kết hợp gỗ công nghiệp MDF chuẩn CARB-P2, veneer gỗ sồi tự nhiên.",
                        "Gỗ tự nhiên, MDF chuẩn CARB-P2, veneer gỗ sồi", 4200000, new[] { "Vàng sồi" }),
                    new RoomProductSeed("LIVING-005", "Ghế Đôn Sofa Gỗ Cao Su Tự Nhiên MOHO VLINE 601",
                        "Ghế đôn gỗ cao su tự nhiên, vải sợi tổng hợp chống nhăn kháng bụi bẩn và nấm mốc.",
                        "Gỗ cao su tự nhiên, vải sợi tổng hợp", 2800000, new[] { "Nâu", "Mặc định" }),
                }),
                ("Phòng Ăn", new List<RoomProductSeed>
                {
                    new RoomProductSeed("DINING-001", "Bộ Bàn Ăn MILAN & 4 Ghế ăn VLINE Cao 820",
                        "Bộ bàn ăn và 4 ghế VLINE, gỗ cao su tự nhiên, plywood chuẩn CARB-P2, vải bọc polyester chống nhăn.",
                        "Gỗ cao su tự nhiên, plywood chuẩn CARB-P2, vải bọc polyester", 22500000, new[] { "Vàng sồi" }),
                    new RoomProductSeed("DINING-002", "Ghế Gỗ Tần Bì Đệm Da DALUMD",
                        "Khung và chân gỗ tần bì (Ash) tự nhiên, đệm ngồi Foam D3050 mật độ cao, bọc da PU cao cấp.",
                        "Gỗ tần bì tự nhiên, Foam D3050, da PU cao cấp", 3500000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("DINING-003", "Ghế Gỗ HERNING Lưng Mây Đan",
                        "Khung gỗ cao su tự nhiên nguyên khối, tựa lưng mây đan mắt cáo, đệm mút Foam D3050 chống xẹp lún.",
                        "Gỗ cao su tự nhiên, mây đan, Foam D3050", 4100000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("DINING-004", "Ghế Băng PLANK",
                        "Chân ghế gỗ cao su tự nhiên chắc chắn, mặt ghế phủ veneer sồi vân bông ghép đảo chiều.",
                        "Gỗ cao su tự nhiên, veneer sồi trắng", 3900000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("DINING-005", "Bàn Ăn Gỗ 1m6 SERENA",
                        "Mặt bàn MDF chuẩn CARB-P2 phủ veneer gỗ sồi, khung và chân bàn gỗ cao su tự nhiên.",
                        "MDF chuẩn CARB-P2 phủ veneer gỗ sồi, gỗ cao su tự nhiên", 9800000, new[] { "Vàng sồi" }),
                }),
                ("Phòng Làm Việc", new List<RoomProductSeed>
                {
                    new RoomProductSeed("OFFICE-001", "Bàn Làm Việc Gỗ MOHO VLINE 601",
                        "Mặt bàn gỗ công nghiệp MDF chuẩn CARB-P2, veneer gỗ tràm tự nhiên, chân bàn gỗ tràm tự nhiên.",
                        "Gỗ công nghiệp MDF chuẩn CARB-P2, veneer gỗ tràm", 3600000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("OFFICE-002", "Bàn Làm Việc Gỗ MOHO FYN 601",
                        "Mặt bàn gỗ công nghiệp PB chuẩn CARB-P2, veneer gỗ sồi tự nhiên, cụm hộc tủ tiện lợi.",
                        "Gỗ công nghiệp PB chuẩn CARB-P2, veneer gỗ sồi", 4200000, new[] { "Nâu", "Mặc định" }),
                    new RoomProductSeed("OFFICE-003", "Bàn Máy Tính Gỗ MOHO WORKS 702",
                        "Mặt bàn gỗ công nghiệp MFC cao cấp chuẩn CARB-P2, chân bàn và giá đỡ sắt sơn tĩnh điện.",
                        "Gỗ công nghiệp MFC cao cấp chuẩn CARB-P2, sắt sơn tĩnh điện", 3200000, new[] { "Đen" }),
                    new RoomProductSeed("OFFICE-004", "Ghế Ruby Greige",
                        "Phom dáng bo cong mềm mại, vải bọc 100% Polyester, khung ván ép tự nhiên, chân thép sơn tĩnh điện.",
                        "Vải Polyester, mút polyurethane, khung ván ép tự nhiên", 2900000, new[] { "Xám" }),
                    new RoomProductSeed("OFFICE-005", "Kệ Sách Division B2 White",
                        "Kệ sách MDF sơn lacquer trắng, thiết kế tối giản phù hợp góc làm việc hiện đại.",
                        "MDF sơn lacquer trắng", 3100000, new[] { "Trắng" }),
                }),
            };

            foreach (var (roomCategoryName, seedProducts) in roomProductGroups)
            {
                var category = await GetOrCreateCategoryAsync(context, roomCategoryName);

                foreach (var seed in seedProducts)
                {
                    var exists = await context.Products.AnyAsync(p => p.ProductCode == seed.ProductCode);
                    if (exists) continue;

                    var product = new Product
                    {
                        ProductCode = seed.ProductCode,
                        ProductName = seed.Name,
                        Slug = ToSlug(seed.Name) + "-" + seed.ProductCode.ToLower(),
                        CategoryId = category.Id,
                        ShortDescription = seed.Description.Length > 150 ? seed.Description.Substring(0, 150) : seed.Description,
                        Description = seed.Description,
                        Material = seed.Material,
                        Style = "Modern",
                        RoomType = roomCategoryName,
                        WarrantyMonths = 24,
                        Status = "Active",
                        IsFeatured = false,
                        AverageRating = 5.0m,
                        ReviewCount = 0
                    };

                    context.Products.Add(product);
                    await context.SaveChangesAsync(); // Cần Id trước khi tạo variant/ảnh

                    foreach (var color in seed.Colors)
                    {
                        context.ProductVariants.Add(new ProductVariant
                        {
                            ProductId = product.Id,
                            Sku = $"{seed.ProductCode}-{color}".ToUpper().Replace(" ", ""),
                            VariantName = color,
                            Color = color,
                            CurrentPrice = seed.Price,
                            CompareAtPrice = null,
                            Status = "Active"
                        });
                    }

                    context.ProductImages.Add(new ProductImage
                    {
                        ProductId = product.Id,
                        ImageUrl = "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800",
                        AltText = seed.Name,
                        IsMain = true
                    });

                    await context.SaveChangesAsync();
                }
            }
        }

        private static async Task<Category> GetOrCreateCategoryAsync(LuxeHomeDbContext context, string categoryName)
        {
            var existing = await context.Categories.FirstOrDefaultAsync(c => c.CategoryName == categoryName);
            if (existing != null) return existing;

            var newCategory = new Category
            {
                CategoryName = categoryName,
                Slug = ToSlug(categoryName),
                Description = "Danh mục các sản phẩm nội thất cao cấp dành cho " + categoryName,
                IsVisible = true,
                Status = "Active"
            };
            context.Categories.Add(newCategory);
            await context.SaveChangesAsync();
            return newCategory;
        }

        private static string ToSlug(string text)
        {
            return text.ToLower().Replace("đ", "d").Replace(" ", "-");
        }

        private record RoomProductSeed(string ProductCode, string Name, string Description, string Material, decimal Price, string[] Colors);
    }
}