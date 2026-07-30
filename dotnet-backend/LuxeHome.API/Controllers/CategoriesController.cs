using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Application.DTOs;
using LuxeHome.Domain.Entities;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly LuxeHomeDbContext _context;
    private readonly IMemoryCache _cache;
    private const string CacheKey = "categories_list";

    public CategoriesController(LuxeHomeDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    // Lấy danh sách danh mục (có cache 5 phút)
    [HttpGet]
    public async Task<IActionResult> GetCategories()
    {
        if (_cache.TryGetValue(CacheKey, out List<CategoryDto>? cached))
        {
            return Ok(cached);
        }

        var categories = await _context.Categories
            .OrderBy(c => c.SortOrder)
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                ParentId = c.ParentId,
                CategoryName = c.CategoryName,
                Slug = c.Slug,
                ThumbnailUrl = c.ThumbnailUrl,
                SortOrder = c.SortOrder,
                IsVisible = c.IsVisible
            })
            .ToListAsync();

        _cache.Set(CacheKey, categories, TimeSpan.FromMinutes(5));

        return Ok(categories);
    }

    // Thêm danh mục mới
    [HttpPost]
    public async Task<IActionResult> CreateCategory([FromBody] CategoryDto dto)
    {
        var category = new Category
        {
            CategoryName = dto.CategoryName,
            Slug = dto.Slug,
            IsVisible = dto.IsVisible ?? true,
            SortOrder = dto.SortOrder ?? 0
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync();

        _cache.Remove(CacheKey); // xóa cache cũ vì dữ liệu đã thay đổi

        return Ok(category);
    }

    // Sửa danh mục
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(long id, [FromBody] CategoryDto dto)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        category.CategoryName = dto.CategoryName;
        category.Slug = dto.Slug;

        if (dto.IsVisible.HasValue)
        {
            category.IsVisible = dto.IsVisible.Value;
        }

        await _context.SaveChangesAsync();

        _cache.Remove(CacheKey);

        return Ok(category);
    }

    // Xóa mềm danh mục
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(long id)
    {
        var category = await _context.Categories.FindAsync(id);
        if (category == null) return NotFound();

        category.IsVisible = false;
        await _context.SaveChangesAsync();

        _cache.Remove(CacheKey);

        return NoContent();
    }
}