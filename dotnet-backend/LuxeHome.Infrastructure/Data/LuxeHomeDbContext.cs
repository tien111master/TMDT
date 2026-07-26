using System;
using System.Collections.Generic;
using LuxeHome.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace LuxeHome.Infrastructure.Data;

public partial class LuxeHomeDbContext : DbContext
{
    public LuxeHomeDbContext()
    {
    }

    public LuxeHomeDbContext(DbContextOptions<LuxeHomeDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<CartItem> CartItems { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<CustomerAddress> CustomerAddresses { get; set; }

    public virtual DbSet<InventoryStock> InventoryStocks { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<OrderItem> OrderItems { get; set; }

    public virtual DbSet<Payment> Payments { get; set; }

    public virtual DbSet<PriceHistory> PriceHistories { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    public virtual DbSet<ProductPrice> ProductPrices { get; set; }

    public virtual DbSet<ProductReview> ProductReviews { get; set; }

    public virtual DbSet<ProductVariant> ProductVariants { get; set; }

    public virtual DbSet<Promotion> Promotions { get; set; }

    public virtual DbSet<ReturnWarrantyRequest> ReturnWarrantyRequests { get; set; }

    public virtual DbSet<Role> Roles { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<SlugRedirect> SlugRedirects { get; set; }

    public virtual DbSet<User> Users { get; set; }
    
    public virtual DbSet<CustomerPromotionWallet> CustomerPromotionWallets { get; set; }

    public virtual DbSet<CustomerCareLog> CustomerCareLogs { get; set; }

    public virtual DbSet<CustomerChatMessage> CustomerChatMessages { get; set; }
    

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("carts_pkey");

            entity.ToTable("carts");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.SessionId)
                .HasMaxLength(255)
                .HasColumnName("session_id");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Carts)
                .HasForeignKey(d => d.UserId)
                .HasConstraintName("carts_user_id_fkey");
        });

        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("cart_items_pkey");

            entity.ToTable("cart_items");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CartId).HasColumnName("cart_id");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(15, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(15, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.UnitPrice)
                .HasPrecision(15, 2)
                .HasColumnName("unit_price");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.Cart).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.CartId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("cart_items_cart_id_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("cart_items_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.CartItems)
                .HasForeignKey(d => d.VariantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("cart_items_variant_id_fkey");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("categories_pkey");

            entity.ToTable("categories");

            entity.HasIndex(e => e.Slug, "categories_slug_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CanonicalUrl)
                .HasMaxLength(500)
                .HasColumnName("canonical_url");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(150)
                .HasColumnName("category_name");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsVisible).HasColumnName("is_visible");
            entity.Property(e => e.MetaDescription)
                .HasMaxLength(500)
                .HasColumnName("meta_description");
            entity.Property(e => e.MetaTitle)
                .HasMaxLength(255)
                .HasColumnName("meta_title");
            entity.Property(e => e.ParentId).HasColumnName("parent_id");
            entity.Property(e => e.Slug)
                .HasMaxLength(180)
                .HasColumnName("slug");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.ThumbnailUrl)
                .HasMaxLength(500)
                .HasColumnName("thumbnail_url");

            entity.HasOne(d => d.Parent).WithMany(p => p.InverseParent)
                .HasForeignKey(d => d.ParentId)
                .HasConstraintName("categories_parent_id_fkey");
        });

        modelBuilder.Entity<CustomerAddress>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("customer_addresses_pkey");

            entity.ToTable("customer_addresses");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AddressDetail)
                .HasMaxLength(255)
                .HasColumnName("address_detail");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.District)
                .HasMaxLength(100)
                .HasColumnName("district");
            entity.Property(e => e.FullAddress).HasColumnName("full_address");
            entity.Property(e => e.IsDefault).HasColumnName("is_default");
            entity.Property(e => e.Province)
                .HasMaxLength(100)
                .HasColumnName("province");
            entity.Property(e => e.ReceiverName)
                .HasMaxLength(150)
                .HasColumnName("receiver_name");
            entity.Property(e => e.ReceiverPhone)
                .HasMaxLength(20)
                .HasColumnName("receiver_phone");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.Ward)
                .HasMaxLength(100)
                .HasColumnName("ward");

            entity.HasOne(d => d.User).WithMany(p => p.CustomerAddresses)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("customer_addresses_user_id_fkey");
        });

        modelBuilder.Entity<InventoryStock>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("inventory_stocks_pkey");

            entity.ToTable("inventory_stocks");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.MinStockLevel).HasColumnName("min_stock_level");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.QuantityAvailable).HasColumnName("quantity_available");
            entity.Property(e => e.QuantityOnHand).HasColumnName("quantity_on_hand");
            entity.Property(e => e.QuantityReserved).HasColumnName("quantity_reserved");
            entity.Property(e => e.StockStatus)
                .HasMaxLength(50)
                .HasColumnName("stock_status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.Product).WithMany(p => p.InventoryStocks)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("inventory_stocks_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.InventoryStocks)
                .HasForeignKey(d => d.VariantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("inventory_stocks_variant_id_fkey");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("orders_pkey");

            entity.ToTable("orders");

            entity.HasIndex(e => e.OrderCode, "orders_order_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ConfirmedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("confirmed_at");
            entity.Property(e => e.ConfirmedBy).HasColumnName("confirmed_by");
            entity.Property(e => e.CouponCode)
                .HasMaxLength(80)
                .HasColumnName("coupon_code");
            entity.Property(e => e.CustomerNote).HasColumnName("customer_note");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(15, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.FinalAmount)
                .HasPrecision(15, 2)
                .HasColumnName("final_amount");
            entity.Property(e => e.OrderCode)
                .HasMaxLength(50)
                .HasColumnName("order_code");
            entity.Property(e => e.OrderStatus)
                .HasMaxLength(50)
                .HasColumnName("order_status");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .HasColumnName("payment_status");
            entity.Property(e => e.ReceiverName)
                .HasMaxLength(255)
                .HasColumnName("receiver_name");
            entity.Property(e => e.ReceiverPhone)
                .HasMaxLength(255)
                .HasColumnName("receiver_phone");
            entity.Property(e => e.ShippingAddress).HasColumnName("shipping_address");
            entity.Property(e => e.ShippingFee)
                .HasPrecision(15, 2)
                .HasColumnName("shipping_fee");
            entity.Property(e => e.ShippingStatus)
                .HasMaxLength(50)
                .HasColumnName("shipping_status");
            entity.Property(e => e.StaffNote).HasColumnName("staff_note");
            entity.Property(e => e.SubtotalAmount)
                .HasPrecision(15, 2)
                .HasColumnName("subtotal_amount");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.User).WithMany(p => p.Orders)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("orders_user_id_fkey");
        });

        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("order_items_pkey");

            entity.ToTable("order_items");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.DiscountAmount)
                .HasPrecision(15, 2)
                .HasColumnName("discount_amount");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.OriginalPrice)
                .HasPrecision(15, 2)
                .HasColumnName("original_price");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.ProductName)
                .HasMaxLength(255)
                .HasColumnName("product_name");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.SellingPrice)
                .HasPrecision(15, 2)
                .HasColumnName("selling_price");
            entity.Property(e => e.Sku)
                .HasMaxLength(80)
                .HasColumnName("sku");
            entity.Property(e => e.TotalPrice)
                .HasPrecision(15, 2)
                .HasColumnName("total_price");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.WarrantyMonths).HasColumnName("warranty_months");

            entity.HasOne(d => d.Order).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("order_items_order_id_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("order_items_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.OrderItems)
                .HasForeignKey(d => d.VariantId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("order_items_variant_id_fkey");
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("payments_pkey");

            entity.ToTable("payments");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Amount)
                .HasPrecision(15, 2)
                .HasColumnName("amount");
            entity.Property(e => e.GatewayResponse)
                .HasColumnType("json")
                .HasColumnName("gateway_response");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(50)
                .HasColumnName("payment_method");
            entity.Property(e => e.PaymentStatus)
                .HasMaxLength(50)
                .HasColumnName("payment_status");
            entity.Property(e => e.TransactionCode)
                .HasMaxLength(100)
                .HasColumnName("transaction_code");

            entity.HasOne(d => d.Order).WithMany(p => p.Payments)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("payments_order_id_fkey");
        });

        modelBuilder.Entity<PriceHistory>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("price_histories_pkey");

            entity.ToTable("price_histories");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ChangedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("changed_at");
            entity.Property(e => e.ChangedBy).HasColumnName("changed_by");
            entity.Property(e => e.NewPrice)
                .HasPrecision(15, 2)
                .HasColumnName("new_price");
            entity.Property(e => e.OldPrice)
                .HasPrecision(15, 2)
                .HasColumnName("old_price");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Reason)
                .HasMaxLength(255)
                .HasColumnName("reason");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.ChangedByNavigation).WithMany(p => p.PriceHistories)
                .HasForeignKey(d => d.ChangedBy)
                .HasConstraintName("price_histories_changed_by_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.PriceHistories)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("price_histories_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.PriceHistories)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("price_histories_variant_id_fkey");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("products_pkey");

            entity.ToTable("products");

            entity.HasIndex(e => e.ProductCode, "products_product_code_key").IsUnique();

            entity.HasIndex(e => e.Slug, "products_slug_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AverageRating).HasColumnName("average_rating");
            entity.Property(e => e.CanonicalUrl)
                .HasMaxLength(500)
                .HasColumnName("canonical_url");
            entity.Property(e => e.CategoryId).HasColumnName("category_id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.IsBestseller).HasColumnName("is_bestseller");
            entity.Property(e => e.IsFeatured).HasColumnName("is_featured");
            entity.Property(e => e.Material)
                .HasMaxLength(150)
                .HasColumnName("material");
            entity.Property(e => e.MetaDescription)
                .HasMaxLength(500)
                .HasColumnName("meta_description");
            entity.Property(e => e.MetaTitle)
                .HasMaxLength(255)
                .HasColumnName("meta_title");
            entity.Property(e => e.OgImageUrl)
                .HasMaxLength(500)
                .HasColumnName("og_image_url");
            entity.Property(e => e.ProductCode)
                .HasMaxLength(50)
                .HasColumnName("product_code");
            entity.Property(e => e.ProductName)
                .HasMaxLength(255)
                .HasColumnName("product_name");
            entity.Property(e => e.ReviewCount).HasColumnName("review_count");
            entity.Property(e => e.RoomType)
                .HasMaxLength(100)
                .HasColumnName("room_type");
            entity.Property(e => e.ShortDescription)
                .HasMaxLength(500)
                .HasColumnName("short_description");
            entity.Property(e => e.Slug)
                .HasMaxLength(255)
                .HasColumnName("slug");
            entity.Property(e => e.SoldCount).HasColumnName("sold_count");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.Style)
                .HasMaxLength(150)
                .HasColumnName("style");
            entity.Property(e => e.ViewCount).HasColumnName("view_count");
            entity.Property(e => e.WarrantyMonths).HasColumnName("warranty_months");

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.CategoryId)
                .HasConstraintName("products_category_id_fkey");
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("product_images_pkey");

            entity.ToTable("product_images");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AltText)
                .HasMaxLength(255)
                .HasColumnName("alt_text");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.IsMain).HasColumnName("is_main");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.SortOrder).HasColumnName("sort_order");
            entity.Property(e => e.TitleText)
                .HasMaxLength(255)
                .HasColumnName("title_text");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_images_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("product_images_variant_id_fkey");
        });

        modelBuilder.Entity<ProductPrice>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("product_prices_pkey");

            entity.ToTable("product_prices");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ApprovedBy).HasColumnName("approved_by");
            entity.Property(e => e.CreatedBy).HasColumnName("created_by");
            entity.Property(e => e.EffectiveFrom)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("effective_from");
            entity.Property(e => e.EffectiveTo)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("effective_to");
            entity.Property(e => e.OriginalPrice)
                .HasPrecision(15, 2)
                .HasColumnName("original_price");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.SellingPrice)
                .HasPrecision(15, 2)
                .HasColumnName("selling_price");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.ApprovedByNavigation).WithMany(p => p.ProductPriceApprovedByNavigations)
                .HasForeignKey(d => d.ApprovedBy)
                .HasConstraintName("product_prices_approved_by_fkey");

            entity.HasOne(d => d.CreatedByNavigation).WithMany(p => p.ProductPriceCreatedByNavigations)
                .HasForeignKey(d => d.CreatedBy)
                .HasConstraintName("product_prices_created_by_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductPrices)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_prices_product_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.ProductPrices)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("product_prices_variant_id_fkey");
        });

        modelBuilder.Entity<ProductReview>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("product_reviews_pkey");

            entity.ToTable("product_reviews");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AdminReply).HasColumnName("admin_reply");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Rating).HasColumnName("rating");
            entity.Property(e => e.ReviewContent).HasColumnName("review_content");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");

            entity.HasOne(d => d.Order).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_reviews_order_id_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_reviews_product_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_reviews_user_id_fkey");

            entity.HasOne(d => d.Variant).WithMany(p => p.ProductReviews)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("product_reviews_variant_id_fkey");
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("product_variants_pkey");

            entity.ToTable("product_variants");

            entity.HasIndex(e => e.Sku, "product_variants_sku_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Color)
                .HasMaxLength(100)
                .HasColumnName("color");
            entity.Property(e => e.CompareAtPrice)
                .HasPrecision(15, 2)
                .HasColumnName("compare_at_price");
            entity.Property(e => e.CostPrice)
                .HasPrecision(15, 2)
                .HasColumnName("cost_price");
            entity.Property(e => e.CurrentPrice)
                .HasPrecision(15, 2)
                .HasColumnName("current_price");
            entity.Property(e => e.DepthCm)
                .HasPrecision(10, 2)
                .HasColumnName("depth_cm");
            entity.Property(e => e.HeightCm)
                .HasPrecision(10, 2)
                .HasColumnName("height_cm");
            entity.Property(e => e.Material)
                .HasMaxLength(150)
                .HasColumnName("material");
            entity.Property(e => e.ProductId).HasColumnName("product_id");
            entity.Property(e => e.Size)
                .HasMaxLength(100)
                .HasColumnName("size");
            entity.Property(e => e.Sku)
                .HasMaxLength(80)
                .HasColumnName("sku");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.VariantName)
                .HasMaxLength(255)
                .HasColumnName("variant_name");
            entity.Property(e => e.WidthCm)
                .HasPrecision(10, 2)
                .HasColumnName("width_cm");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.ProductId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("product_variants_product_id_fkey");
        });

        modelBuilder.Entity<Promotion>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("promotions_pkey");

            entity.ToTable("promotions");

            entity.HasIndex(e => e.CouponCode, "promotions_coupon_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.IsHidden)
            .HasColumnName("is_hidden");
            entity.Property(e => e.CouponCode)
                .HasMaxLength(80)
                .HasColumnName("coupon_code");
            entity.Property(e => e.DiscountValue)
                .HasPrecision(15, 2)
                .HasColumnName("discount_value");
            entity.Property(e => e.EndedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("ended_at");
            entity.Property(e => e.MaxDiscountAmount)
                .HasPrecision(15, 2)
                .HasColumnName("max_discount_amount");
            entity.Property(e => e.MinOrderAmount)
                .HasPrecision(15, 2)
                .HasColumnName("min_order_amount");
            entity.Property(e => e.PromotionName)
                .HasMaxLength(255)
                .HasColumnName("promotion_name");
            entity.Property(e => e.PromotionType)
                .HasMaxLength(50)
                .HasColumnName("promotion_type");
            entity.Property(e => e.StartedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("started_at");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasColumnName("status");
            entity.Property(e => e.UsageLimit).HasColumnName("usage_limit");
            entity.Property(e => e.UsedCount).HasColumnName("used_count");
        });

        modelBuilder.Entity<ReturnWarrantyRequest>(entity =>
        {
            entity.Property(e => e.AccountInfo).HasColumnName("account_info");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.ImageUrls).HasColumnName("image_urls");
            entity.HasKey(e => e.Id).HasName("return_warranty_requests_pkey");

            entity.ToTable("return_warranty_requests");

            entity.HasIndex(e => e.RequestCode, "return_warranty_requests_request_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.HandledBy).HasColumnName("handled_by");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.OrderItemId).HasColumnName("order_item_id");
            entity.Property(e => e.Reason).HasColumnName("reason");
            entity.Property(e => e.RefundAmount)
                .HasPrecision(15, 2)
                .HasColumnName("refund_amount");
            entity.Property(e => e.RequestCode)
                .HasMaxLength(50)
                .HasColumnName("request_code");
            entity.Property(e => e.RequestType)
                .HasMaxLength(50)
                .HasColumnName("request_type");
            entity.Property(e => e.ResultNote).HasColumnName("result_note");
            entity.Property(e => e.Status)
                .HasMaxLength(50)
                .HasColumnName("status");
            entity.Property(e => e.UserId).HasColumnName("user_id");

            entity.HasOne(d => d.HandledByNavigation).WithMany(p => p.ReturnWarrantyRequestHandledByNavigations)
                .HasForeignKey(d => d.HandledBy)
                .HasConstraintName("return_warranty_requests_handled_by_fkey");

            entity.HasOne(d => d.Order).WithMany(p => p.ReturnWarrantyRequests)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("return_warranty_requests_order_id_fkey");

            entity.HasOne(d => d.OrderItem).WithMany(p => p.ReturnWarrantyRequests)
                .HasForeignKey(d => d.OrderItemId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("return_warranty_requests_order_item_id_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.ReturnWarrantyRequestUsers)
                .HasForeignKey(d => d.UserId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("return_warranty_requests_user_id_fkey");
        });

        modelBuilder.Entity<Role>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("roles_pkey");

            entity.ToTable("roles");

            entity.HasIndex(e => e.RoleCode, "roles_role_code_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.RoleCode)
                .HasMaxLength(50)
                .HasColumnName("role_code");
            entity.Property(e => e.RoleName)
                .HasMaxLength(100)
                .HasColumnName("role_name");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("shipments_pkey");

            entity.ToTable("shipments");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CarrierName)
                .HasMaxLength(150)
                .HasColumnName("carrier_name");
            entity.Property(e => e.DeliveredAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("delivered_at");
            entity.Property(e => e.Note).HasColumnName("note");
            entity.Property(e => e.OrderId).HasColumnName("order_id");
            entity.Property(e => e.ShippedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("shipped_at");
            entity.Property(e => e.ShippingFee)
                .HasPrecision(15, 2)
                .HasColumnName("shipping_fee");
            entity.Property(e => e.ShippingStatus)
                .HasMaxLength(50)
                .HasColumnName("shipping_status");
            entity.Property(e => e.TrackingCode)
                .HasMaxLength(100)
                .HasColumnName("tracking_code");

            entity.HasOne(d => d.Order).WithMany(p => p.Shipments)
                .HasForeignKey(d => d.OrderId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("shipments_order_id_fkey");
        });

        modelBuilder.Entity<SlugRedirect>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("slug_redirects_pkey");

            entity.ToTable("slug_redirects");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.EntityId).HasColumnName("entity_id");
            entity.Property(e => e.EntityType)
                .HasMaxLength(50)
                .HasColumnName("entity_type");
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.NewSlug)
                .HasMaxLength(255)
                .HasColumnName("new_slug");
            entity.Property(e => e.OldSlug)
                .HasMaxLength(255)
                .HasColumnName("old_slug");
            entity.Property(e => e.RedirectType).HasColumnName("redirect_type");
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("users_pkey");

            entity.ToTable("users");

            entity.HasIndex(e => e.Email, "users_email_key").IsUnique();

            entity.HasIndex(e => e.Phone, "users_phone_key").IsUnique();

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.AvatarUrl)
                .HasMaxLength(500)
                .HasColumnName("avatar_url");
            entity.Property(e => e.CreatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(150)
                .HasColumnName("email");
            entity.Property(e => e.FullName)
                .HasMaxLength(150)
                .HasColumnName("full_name");
            entity.Property(e => e.LastLoginAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("last_login_at");
            entity.Property(e => e.PasswordHash)
                .HasMaxLength(255)
                .HasColumnName("password_hash");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Role).WithMany(p => p.Users)
                .HasForeignKey(d => d.RoleId)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("users_role_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
