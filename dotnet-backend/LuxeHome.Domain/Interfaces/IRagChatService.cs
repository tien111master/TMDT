using System.Threading.Tasks;

namespace LuxeHome.Domain.Interfaces
{
    public interface IRagChatService
    {
        // context = dữ liệu THẬT lấy từ DB (sản phẩm, giá, tồn kho...) để AI chỉ được bám vào đó trả lời
        Task<string> GenerateReplyAsync(string userQuestion, string context, string systemInstruction);
        bool IsOffline();
    }
}