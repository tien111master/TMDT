import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Camera, Image, RotateCw, HelpCircle } from "lucide-react";
import { Product } from "../types";
import { API_BASE_URL } from "../api/api";

interface ChatbotWidgetProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

// Danh sách từ khoá trong phạm vi tư vấn nội thất — dùng để chặn câu hỏi lạc đề
// CHỈ khi không kết nối được backend (chế độ offline dự phòng cuối cùng).
const FURNITURE_SCOPE_KEYWORDS = [
  "sofa", "bàn", "ghế", "giường", "tủ", "nệm", "kệ", "đèn", "nội thất",
  "gỗ", "da bò", "da nappa", "vải", "nhung", "kính",
  "phòng khách", "phòng ngủ", "phòng ăn", "phòng bếp", "văn phòng",
  "giao hàng", "bảo hành", "đổi trả", "thanh toán", "giá", "combo",
  "màu sắc", "kích thước", "chất liệu", "lắp đặt", "showroom", "đơn hàng",
  "tư vấn", "thiết kế", "trang trí", "phối cảnh", "vệ sinh", "bảo dưỡng",
];

const isInScopeQuestion = (text: string): boolean => {
  const input = text.toLowerCase();
  return FURNITURE_SCOPE_KEYWORDS.some((kw) => input.includes(kw));
};

const OUT_OF_SCOPE_REPLY =
  "Dạ, LuxeHome hiện chỉ chuyên tư vấn về các sản phẩm và giải pháp nội thất trong showroom của mình. Rất tiếc em chưa thể hỗ trợ câu hỏi này ạ! Anh/Chị có cần tư vấn thêm về nội thất không ạ?";

const CONNECTION_ERROR_REPLY =
  "Dạ, hệ thống tư vấn của LuxeHome đang tạm gián đoạn kết nối, Anh/Chị vui lòng thử lại sau ít phút hoặc liên hệ trực tiếp showroom giúp em ạ. Xin lỗi Anh/Chị vì sự bất tiện này!";

export default function ChatbotWidget({ products, onSelectProduct }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "model"; content: string }[]>([
    {
      role: "model",
      content: "Kính chào Quý khách! Em là trợ lý tư vấn của LuxeHome. Anh/Chị cứ hỏi em về sản phẩm, giá cả, tồn kho, chính sách giao hàng/bảo hành, hoặc nhờ em gợi ý nội thất theo ngân sách và phong cách mong muốn ạ!"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [imageAnalysisResult, setImageAnalysisResult] = useState<{
    detectedStyle?: string;
    matchedProductName?: string;
    advice?: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Chỉ dùng khi KHÔNG kết nối được backend chút nào (network chết hẳn) —
  // không còn là nơi "giả vờ AI", chỉ báo lỗi kết nối thật + chặn lạc đề cơ bản.
  const getOfflineFallback = (userInput: string): string => {
    if (!isInScopeQuestion(userInput)) {
      return OUT_OF_SCOPE_REPLY;
    }
    return CONNECTION_ERROR_REPLY;
  };

  const findMatchingProducts = (text: string): Product[] => {
    const input = text.toLowerCase();
    const matches: Product[] = [];

    products.forEach((p) => {
      const nameLower = p.name.toLowerCase();
      const matchByName = nameLower.split(/[\s-]+/).some(word => word.length > 2 && input.includes(word));
      if (matchByName) {
        matches.push(p);
      }
    });

    return matches.slice(0, 4);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // QUAN TRỌNG: phải gọi đúng domain backend (API_BASE_URL), không dùng path tương đối
      // vì frontend và backend nằm ở 2 domain khác nhau.
      const response = await fetch(`${API_BASE_URL}/api/Chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Backend chat API trả về lỗi ${response.status}`);
      }

      const data = await response.json();

      if (!data || typeof data.text !== "string" || !data.text.trim()) {
        throw new Error("Backend không trả về nội dung trả lời hợp lệ.");
      }

      setMessages(prev => [...prev, { role: "model", content: data.text }]);
    } catch (err) {
      console.error("Lỗi gọi chatbot API:", err);
      const offlineReply = getOfflineFallback(text);
      setMessages(prev => [...prev, { role: "model", content: offlineReply }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Process image search using Gemini vision API /api/image-search
  const handleImageUploaded = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setIsOpen(true); // Open chatbot window to show results

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;

      // Show user mock action
      setMessages(prev => [
        ...prev,
        { role: "user", content: "🔍 [Hình ảnh tìm kiếm kiểu dáng nội thất]" }
      ]);

      try {
        const response = await fetch(`${API_BASE_URL}/api/image-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String })
        });

        if (!response.ok) {
          throw new Error(`Backend image-search API trả về lỗi ${response.status}`);
        }

        const data = await response.json();

        let reply = `🔮 **Kết quả phân tích hình ảnh AI:**\n\n`;
        if (data.detectedStyle) {
          reply += `• **Phong cách phát hiện:** ${data.detectedStyle}\n`;
        }
        if (data.matchedProductName) {
          reply += `• **Sản phẩm đồng dạng khớp nhất:** _${data.matchedProductName}_\n`;
        }
        if (data.advice) {
          reply += `\n💡 **Lời khuyên phối nội thất:** ${data.advice}`;
        }

        setMessages(prev => [
          ...prev,
          { role: "model", content: reply }
        ]);

        // Auto prompt scroll/highlight with smart word intersection match to prevent any failing mismatch
        if (data.matchedProductName) {
          const match = products.find(p => {
            const pName = p.name.toLowerCase();
            const matchedName = data.matchedProductName.toLowerCase();
            if (pName.includes(matchedName) || matchedName.includes(pName)) return true;

            // split words, if at least 2 key words of length > 2 intersect, count as matched!
            const pWords = pName.split(/[\s-]+/).filter((w: string) => w.length > 2);
            const mWords = matchedName.split(/[\s-]+/).filter((w: string) => w.length > 2);
            const intersection = pWords.filter(w => mWords.includes(w));
            return intersection.length >= 2;
          });

          if (match) {
            setMessages(prev => [
              ...prev,
              {
                role: "model",
                content: `👉 Em tìm thấy trang chi tiết của **${match.name}** ngay tại đây. Anh/Chị có muốn xem trực tiếp không?`
              }
            ]);
            setImageAnalysisResult({
              detectedStyle: data.detectedStyle,
              matchedProductName: match.name,
              advice: data.advice
            });
          }
        }

      } catch (err) {
        console.error("Lỗi phân tích ảnh:", err);
        setMessages(prev => [
          ...prev,
          { role: "model", content: "Thử phân tích hình ảnh thất bại. Anh/Chị vui lòng chụp ảnh rõ nét hơn hoặc thử lại sau ít phút!" }
        ]);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleShortcutClick = (query: string) => {
    handleSendMessage(query);
  };

  const handleExploreMatchedProduct = () => {
    if (imageAnalysisResult?.matchedProductName) {
      const match = products.find(p => p.name === imageAnalysisResult.matchedProductName);
      if (match) {
        onSelectProduct(match);
      }
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3" id="floating-chatbot-bubble">

        {/* Floating image upload action tool tip */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="bg-[#D4AF37] hover:bg-[#C29E2F] text-white p-3 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold transition-all hover:scale-105 active:scale-95"
          title="Tìm kiếm phong cách bằng hình ảnh"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden md:inline">Tìm Bằng Hình Ảnh AI</span>
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-gradient-to-r from-[#5C4033] to-[#4A3B32] text-[#FAF6F0] p-4.5 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-[#D4AF37]"
          id="btn-chatbot-widget-open"
        >
          {isOpen ? <X className="w-6 h-6 animate-spin-once" /> : <MessageSquare className="w-6 h-6" />}

          {!isOpen && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#D4AF37] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider animate-pulse">
              AI CONCIERGE
            </span>
          )}
        </button>

        {/* Hidden File Input for search */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUploaded}
          accept="image/*"
          className="hidden"
          id="chatbot-image-file-input"
        />
      </div>

      {/* Chat Window Popup */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-96 max-w-[calc(100vw-2rem)] h-[540px] bg-[#FAF6F0] rounded-2xl shadow-2xl border border-[#EADBC8] overflow-hidden flex flex-col z-50 animate-fade-in"
          id="chatbot-display-window"
        >
          {/* Window Header */}
          <div className="bg-gradient-to-r from-[#5C4033] to-[#4A3B32] p-4 text-[#FAF6F0] flex items-center justify-between border-b border-[#EADBC8]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center border border-[#D4AF37]/40 shadow-inner">
                <Sparkles className="w-5 h-5 text-[#D4AF37] animate-pulse" />
              </div>
              <div>
                <h3 className="font-serif text-sm font-bold tracking-wide">Trợ Lý LuxeHome</h3>
                <span className="text-[10px] text-[#EADBC8] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Tư vấn nội thất trực tuyến
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-[#EADBC8] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick shortcuts info block */}
          <div className="bg-[#5C4033]/5 px-3 py-2 border-b border-[#EADBC8] text-[11px] text-[#5C4033] flex items-center justify-between font-medium">
            <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5 text-[#D4AF37]" /> Hãy đặt câu hỏi bất kì:</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => handleShortcutClick("Gợi ý combo phòng khách dưới 80 triệu?")}
                className="bg-white px-2 py-0.5 rounded text-[10px] text-[#5C4033] border border-[#EADBC8] hover:bg-[#D4AF37]/10"
              >
                Sofa & Bàn Trà
              </button>
              <button
                onClick={() => handleShortcutClick("Cách bảo dưỡng sofa da bò chuẩn nhất?")}
                className="bg-white px-2 py-0.5 rounded text-[10px] text-[#5C4033] border border-[#EADBC8] hover:bg-[#D4AF37]/10"
              >
                Da bò
              </button>
            </div>
          </div>

          {/* Messages Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages-container">
            {messages.map((msg, idx) => {
              const matchedProds = msg.role === "model" ? findMatchingProducts(msg.content) : [];
              return (
                <div key={idx} className="space-y-2">
                  <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl p-3.5 text-xs text-left leading-relaxed shadow-sm ${
                        msg.role === "user"
                          ? "bg-[#5C4033] text-white rounded-tr-none"
                          : "bg-white text-[#2B2B2B] border border-[#EADBC8] rounded-tl-none whitespace-pre-line font-sans"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>

                  {/* Matched product list from AI suggestion / keyword search */}
                  {matchedProds.length > 0 && (
                    <div className="pl-4 pr-1 flex gap-2.5 overflow-x-auto pb-2 scrollbar-none" id={`chat-matched-prods-${idx}`}>
                      {matchedProds.map((prod) => (
                        <div
                          key={prod.id}
                          onClick={() => {
                            onSelectProduct(prod);
                          }}
                          className="flex-shrink-0 w-44 bg-white border border-[#EADBC8] rounded-xl overflow-hidden hover:border-[#D4AF37] transition-all cursor-pointer shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 text-left group"
                          title="Click để xem chi tiết sản phẩm"
                        >
                          <img
                            src={prod.images[0]?.url}
                            alt={prod.name}
                            className="w-full h-20 object-cover border-b border-[#EADBC8]"
                          />
                          <div className="p-2 text-left space-y-1">
                            <h4 className="font-serif text-[10px] font-black text-[#1A1A1A] line-clamp-1 group-hover:text-[#5C4033] transition-colors">
                              {prod.name}
                            </h4>
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-[#5C4033]">
                                {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(prod.price)}
                              </span>
                              <span className="text-[8px] bg-[#FAF6F0] text-[#D4AF37] font-bold px-1.5 py-0.5 rounded border border-[#EADBC8] group-hover:bg-[#D4AF37] group-hover:text-white transition-colors">
                                Xem
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {imageAnalysisResult && (
              <div className="p-3 bg-amber-50 rounded-xl border border-[#D4AF37]/40 text-xs text-[#5C4033] space-y-2">
                <p className="font-semibold">🎁 Sản phẩm vừa được khớp:</p>
                <div className="font-medium">{imageAnalysisResult.matchedProductName}</div>
                <button
                  onClick={handleExploreMatchedProduct}
                  className="w-full bg-[#D4AF37] hover:bg-[#C29E2F] text-white py-1.5 rounded font-bold text-[11px] transition-colors"
                >
                  Xem chi tiết đồ nội thất này
                </button>
              </div>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-[#8B7E74] rounded-2xl p-3 shadow-sm border border-[#EADBC8] flex items-center gap-1.5 text-xs">
                  <RotateCw className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                  Đang soạn câu trả lời...
                </div>
              </div>
            )}

            {isUploading && (
              <div className="flex justify-start">
                <div className="bg-amber-50 text-[#5C4033] rounded-2xl p-4 border border-[#EADBC8] flex flex-col gap-2 text-xs">
                  <span className="flex items-center gap-2 font-bold animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    Đang phân tích hình ảnh...
                  </span>
                  <p className="text-[10px] text-[#8B7E74] italic">AI sẽ nhận diện khối, sắc độ, phong cách và tìm sản phẩm phù hợp trong showroom.</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 border-t border-[#EADBC8] bg-white flex gap-2 items-center"
            id="chat-input-form"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-full hover:bg-[#FAF6F0] text-[#D4AF37] transition-colors"
              title="Tìm kiếm bằng ảnh"
            >
              <Image className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Hỏi về kích thước, ngân sách, combo..."
              className="flex-1 bg-[#FAF6F0] border border-[#EADBC8]/70 rounded-full px-4 py-2.5 text-xs text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
              id="chatbot-text-input-field"
            />

            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-2.5 rounded-full bg-[#5C4033] hover:bg-[#4A3B32] disabled:bg-gray-200 disabled:text-gray-400 text-white transition-all shadow-md"
              id="btn-send-chat"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}