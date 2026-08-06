using System.Collections.Generic;
using System.Threading.Tasks;
using LuxeHome.Domain.Entities;

namespace LuxeHome.Domain.Interfaces
{
    public interface IRagChatService
    {
        Task<string> GenerateReplyAsync(string userQuestion, string context, string systemInstruction, List<Message>? history = null);
        bool IsOffline();
    }
}