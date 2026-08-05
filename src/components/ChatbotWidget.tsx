import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Sparkles, Camera, Image, RotateCw, HelpCircle } from "lucide-react";
import { Product } from "../types";

interface ChatbotWidgetProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

// Danh sách từ khoá trong phạm vi tư vấn nội thất — dùng để chặn câu hỏi lạc đề
// ở chế độ offline (khi không gọi được API backend/Gemini).
const FURNITURE_SCOPE_KEYWORDS = [
  "sofa", "bàn", "ghế", "giường", "tủ", "nệm", "kệ", "đèn", "nội thất",
  "gỗ", "da bò", "da nappa", "vải", "nhung", "kính",
  "phòng khách", "phòng ngủ", "phòng ăn", "phòng bếp", "văn phòng",
  "giao hàng", "bảo hành", "đổi trả", "thanh toán", "giá", "combo",
  "màu sắc", "kích thước", "chất liệu", "lắp đặt", "showroom", "đơn hàng",
  "tư vấn", "thiết kế", "trang trí", "phối cảnh", "vệ sinh", "bảo dưỡng",
  "royal", "carrara", "velour", "aurora", "nordic", "milano", "prestige", "ergonomic",
];

const isInScopeQuestion = (text: string): boolean => {
  const input = text.toLowerCase();
  return FURNITURE_SCOPE_KEYWORDS.some((kw) => input.includes(kw));
};

const OUT_OF_SCOPE_REPLY =
  "Dạ, LuxeHome hiện chỉ chuyên tư vấn về các sản phẩm và giải pháp nội thất cao cấp trong showroom của mình. Rất tiếc em chưa thể hỗ trợ câu hỏi này ạ! Anh/Chị có cần tư vấn thêm về nội thất không ạ?";

export default function ChatbotWidget({ products, onSelectProduct }: ChatbotWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: "user" | "model"; content: string }[]>([
    {
      role: "model",
      content: "Kính chào Quý khách! Em là LuxeHome Concierge, trợ lý nội thất được đào tạo bởi mô hình AI Gemini. Em có thể tư vấn phối màu champagne gold, tính diện tích đặt combo phòng khách, hay gợi ý nội thất Óc chó theo ngân sách của Anh/Chị. Rất vinh hạnh được hỗ trợ!"
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

  const getSmartOfflineTextFallback = (userInput: string): string => {
    const input = userInput.toLowerCase();

    // Chặn câu hỏi ngoài phạm vi nội thất LuxeHome ngay cả ở chế độ offline
    if (!isInScopeQuestion(userInput)) {
      return OUT_OF_SCOPE_REPLY;
    }
    
    if (input.includes("sofa") || input.includes("royal") || input.includes("signature") || input.includes("phòng khách")) {
      return "Dạ, LuxeHome nhận thấy Anh/Chị đang quan tâm đến nội thất tiếp khách sang tươm. Em khuyên dùng tuyệt phẩm Sofa giường góc độc kiêu 'Sofa Da Bò Ý Tự Nhiên - Royal Signature' bọc da Full Grain cao sang tột bực.";
    }
    if (input.includes("bàn trà") || input.includes("carrara") || input.includes("venice") || input.includes("đá")) {
      return "Dạ, mẫu 'Bàn Trà Đá Cẩm Thạch Carrara - Venice Golden Frame' mạ titan vàng champagne óng ánh chính là sự kết hợp tối linh với sofa luxury căn phòng khách gia chủ.";
    }
    if (input.includes("giường") || input.includes("phòng ngủ") || input.includes("velour") || input.includes("nhung")) {
      return "Để phòng ngủ Master đạt độ tĩnh mịch, em trân trọng tiến cử 'Giường Ngủ Hoàng Gia Master - Silk King Velour' uốn lượn thướt tha bọc nhung tơ lụa mịn ngọt đêm dài.";
    }
    if (input.includes("tủ") || input.includes("áo") || input.includes("kính") || input.includes("aurora")) {
      return "Dạ, 'Tủ Quần Áo Âm Tường Kính Cường Lực - Aurora Clear Lux' cánh xám mờ tiệm dốc LED sẽ phô diễn trọn vẹn bộ sưu tập thời trang xa xỉ rạng rỡ của gia đình.";
    }
    if (input.includes("bàn ăn") || input.includes("sồi") || input.includes("dining") || input.includes("bếp")) {
      return "Trong không gian phòng ăn đầm ấm, 'Bàn Ăn Gỗ Sồi Chun Tự Nhiên - Nordic Organic Dining' uốn sớ cạnh mộc mạc châu Âu sẽ làm bừng sáng bữa cơm sum vầy.";
    }
    if (input.includes("ghế") && (input.includes("ăn") || input.includes("nappa") || input.includes("milano"))) {
      return "Dạ, tác phẩm 'Ghế Ăn Thư Giãn Bọc Da Nappa - Milano Curve' mút lông vũ êm sâu, ôm gọn thắt lưng chính là tri kỷ của bàn ăn sồi ngọc sồi ngọc nhà mình.";
    }
    if (input.includes("làm việc") || input.includes("prestige") || input.includes("giám đốc") || input.includes("văn phòng")) {
      return "Kiến tạo phong khí bệ vệ quyền lực của sếp chỉ huy thông qua 'Bàn Làm Việc Giám Đốc Cao Cấp - Executive Prestige' gỗ Óc chó sang trọng, phối da thuộc thảo mộc.";
    }
    if (input.includes("công thái học") || input.includes("ergonomic") || input.includes("đau lưng") || input.includes("mỏi cổ")) {
      return "Để xoa dịu mệt mỏi văn phòng, 'Ghế Công Thái Học Luxury - Ergonomic Masterpiece' sườn lưới Đức thoáng đãng, bệ đỡ 4D chỉnh 5 hướng chính là giải pháp tối ưu cho quý khách.";
    }
    
    return "LuxeHome chân thành cảm ơn tâm sự của Anh/Chị! Em gửi ý kiến đề xuất các dòng Sofa da bò tót Ý, Bàn trà Carrara sáng, hay Giường Master nhung để quý khách lựa chọn trang hoàng dinh thự thanh lịch của mình.";
  };

  const findMatchingProducts = (text: string): Product[] => {
    const input = text.toLowerCase();
    const matches: Product[] = [];
    
    products.forEach((p) => {
      const nameLower = p.name.toLowerCase();
      const keywords: string[] = [];
      if (p.id === "prod-01" || p.id === "1") keywords.push("sofa", "royal", "signature", "phòng khách", "ghế dài", "da bò");
      if (p.id === "prod-02" || p.id === "2") keywords.push("bàn trà", "carrara", "venice", "bàn kính", "đá cẩm thạch");
      if (p.id === "prod-03" || p.id === "3") keywords.push("giường", "velour", "phòng ngủ", "nệm", "hoàng gia master");
      if (p.id === "prod-04" || p.id === "4") keywords.push("tủ quần áo", "tủ áo", "clear lux", "tủ kính", "âm tường");
      if (p.id === "prod-05" || p.id === "5") keywords.push("bàn ăn", "gỗ sồi", "nordic", "bàn ăn sồi", "organic dining");
      if (p.id === "prod-06" || p.id === "6") keywords.push("ghế ăn", "nappa", "milano", "thư giãn");
      if (p.id === "prod-07" || p.id === "7") keywords.push("bàn làm việc", "giám đốc", "prestige", "bàn giám đốc", "óc chó");
      if (p.id === "prod-08" || p.id === "8") keywords.push("công thái học", "ergonomic", "mỏi cổ", "ghế xoay", "lưới dệt");

      const matchByKeyword = keywords.some(kw => input.includes(kw));
      const matchByName = nameLower.split(/[\s-]+/).some(word => word.length > 2 && input.includes(word));
      
      if (matchByKeyword || matchByName) {
        matches.push(p);
      }
    });

    return matches;
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = { role: "user" as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { role: "model", content: data.text }]);
    } catch (err) {
      // Trigger our smart offline rule-based responder
      const offlineReply = getSmartOfflineTextFallback(text);
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          content: `${offlineReply}\n\n*(Lưu ý: Hệ thống đang phản hồi ở chế độ thông minh tối ưu cục bộ)*`
        }
      ]);
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
        const response = await fetch("/api/image-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64String })
        });

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
                <h3 className="font-serif text-sm font-bold tracking-wide">Trợ Lý LuxeHome AI</h3>
                <span className="text-[10px] text-[#EADBC8] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                  Gợi ý & Phối cảnh nội thất Luxury
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
                onClick={() => handleShortcutClick("Gấp: Gợi ý combo phòng khách dưới 80 triệu?")} 
                className="bg-white px-2 py-0.5 rounded text-[10px] text-[#5C4033] border border-[#EADBC8] hover:bg-[#D4AF37]/10"
              >
                Sofa & Bàn Trà
              </button>
              <button 
                onClick={() => handleShortcutClick("Cách bảo dưỡng sofa da bò Ý chuẩn nhất?")} 
                className="bg-white px-2 py-0.5 rounded text-[10px] text-[#5C4033] border border-[#EADBC8] hover:bg-[#D4AF37]/10"
              >
                Da bò Ý
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
                          title="Click để bừng mở xem chi tiết tác phẩm"
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
                              <span className="text-[8px] bg-[#FAF6F0] text-[#D4AF37] font-bold px-1.5 py-0.5 rounded border border-[#EADBC8] group-hover:bg-[#D4AF37] group-hover:text-white transition-colors animate-pulse">
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
                  LuxeHome Concierge đang soạn câu trả lời thiết kế...
                </div>
              </div>
            )}

            {isUploading && (
              <div className="flex justify-start">
                <div className="bg-amber-50 text-[#5C4033] rounded-2xl p-4 border border-[#EADBC8] flex flex-col gap-2 text-xs">
                  <span className="flex items-center gap-2 font-bold animate-pulse">
                    <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                    Đang gửi ảnh lên Máy chủ Để Phân Tích Gemini Vision...
                  </span>
                  <p className="text-[10px] text-[#8B7E74] italic">AI của LuxeHome sẽ nhận diện khối, sắc độ, phong cách và tìm sản phẩm thích hợp trong xưởng.</p>
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