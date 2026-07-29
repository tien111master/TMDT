import React from "react";
import { Sparkles, ArrowRight, Star, Quote, Compass, Layers, ShieldCheck, Heart } from "lucide-react";
import { Product, Combo, BlogPost } from "../types";

interface HomeViewProps {
  products: Product[];
  combos: Combo[];
  blogs: BlogPost[];
  onSelectProduct: (product: Product) => void;
  onSelectCombo: (combo: Combo) => void;
  onNavigateToCatalog: (filters: { category?: string; style?: string }) => void;
  onNavigateToDesign: () => void;
  onToggleWishlist: (productId: string) => void;
  wishlist: string[];
}

export default function HomeView({
  products,
  combos,
  blogs,
  onSelectProduct,
  onSelectCombo,
  onNavigateToCatalog,
  onNavigateToDesign,
  onToggleWishlist,
  wishlist,
}: HomeViewProps) {
  
  // Featured Items
  const featuredProducts = products.slice(0, 4);
  const bestSellers = products.filter(p => p.rating >= 4.9).slice(0, 4);

  const formattedPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <div className="space-y-16 animate-fade-in" id="home-view-page">
      
      {/* 1. Hero Big Banner */}
      <section className="relative overflow-hidden bg-[#FAF6F0] border-b border-[#EADBC8]" id="hero-banner-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Sự Độc Bản Trong Từng Sớ Gỗ
            </div>
            
            <h1 className="font-serif text-4xl sm:text-6xl font-black text-[#1A1A1A] leading-tight-none tracking-tight">
              Nâng Tầm <br/>
              Kiến Trúc <br/>
              <span className="text-[#5C4033] bg-gradient-to-r from-[#5C4033] via-[#8B7E74] to-[#D4AF37] bg-clip-text text-transparent">Thượng Lưu</span>
            </h1>

            <p className="text-[#8B7E74] text-xs sm:text-sm leading-relaxed font-serif">
              Thương hiệu nội thất LuxeHome tôn vinh nghệ thuật thủ công tinh xảo, chất da bò Ý Full-Grain độc gia phối chân mạ titan champagne quý phái. Đồ án Thương mại điện tử chất tinh chọn tuyệt vời.
            </p>

            <div className="flex flex-wrap gap-4 pt-3">
              <button
                onClick={() => onNavigateToCatalog({})}
                className="px-6 py-3 bg-[#5C4033] hover:bg-[#4A3B32] text-[#FAF6F0] text-xs font-bold tracking-widest uppercase rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                id="hero-shop-now-btn"
              >
                Trải Nghiệm Showroom 
                <ArrowRight className="w-4 h-4" />
              </button>
              
              <button
                onClick={onNavigateToDesign}
                className="px-6 py-3 bg-white hover:bg-[#F4EBE1] text-[#5C4033] border border-[#EADBC8] text-xs font-bold tracking-widest uppercase rounded-lg transition-all"
                id="hero-consult-btn"
              >
                Đặt Lịch Khảo Sát AI
              </button>
            </div>

            {/* Micro counters in margins */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#EADBC8]">
              <div>
                <p className="text-xl font-serif font-bold text-[#1A1A1A]">100%</p>
                <p className="text-[10px] text-[#8B7E74] font-semibold uppercase tracking-wider">Nhập khẩu chính ngạch</p>
              </div>
              <div>
                <p className="text-xl font-serif font-bold text-[#1A1A1A]">150+</p>
                <p className="text-[10px] text-[#8B7E74] font-semibold uppercase tracking-wider">Mẫu mã độc quyền</p>
              </div>
              <div>
                <p className="text-xl font-serif font-bold text-[#1A1A1A]">10 Năm</p>
                <p className="text-[10px] text-[#8B7E74] font-semibold uppercase tracking-wider">Hành trình bảo hành</p>
              </div>
            </div>
          </div>

          {/* Banner Graphic Showcase */}
          <div className="lg:col-span-7 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#EADBC8]/30 via-transparent to-[#D4AF37]/10 rounded-2xl"></div>
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-8">
                <img
                  src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=800"
                  alt="LuxeHome Living Collection"
                  className="w-full h-96 object-cover rounded-2xl shadow-xl border border-[#EADBC8]"
                />
              </div>
              <div className="col-span-4 space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=800"
                  alt="Carrara marble details"
                  className="w-full h-44 object-cover rounded-2xl shadow-lg border border-[#EADBC8]"
                />
                <img
                  src="https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=800"
                  alt="Wood craft detail"
                  className="w-full h-46 object-cover rounded-2xl shadow-lg border border-[#EADBC8]"
                />
              </div>
            </div>
            
            {/* Special Floating Tag badge */}
            <div className="absolute -bottom-4 left-6 bg-white rounded-xl p-3 border border-[#EADBC8] shadow-2xl flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[#D4AF37] flex items-center justify-center text-white text-xs font-bold font-serif">
                ★
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">Hạng Nhất Toàn Cầu</p>
                <p className="text-[9px] text-[#8B7E74]">Đánh giá vàng bởi tạp chí Heritage</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 2. Room Collections (Bộ sưu tập theo phòng) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" id="room-collections">
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Kiến Tìm Theo Khu Vực</span>
          <h2 className="font-serif text-2xl md:text-3.5xl font-bold text-[#1A1A1A]">Gian Phòng Ưu Chuộng</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { id: "phong-khach", name: "Phòng Khách", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=300", slugs: ["noi-that-phong-khach", "ghe-sofa", "ban-tra", "ke-tivi"] },
            { id: "phong-ngu", name: "Phòng Ngủ", image: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=300", slugs: ["noi-that-phong-ngu", "giuong-ngu", "tu-quan-ao"] },
            { id: "phong-an", name: "Phòng Ăn & Bếp", image: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=300", slugs: ["noi-that-nha-bep", "ban-an", "ghe-an"] },
            { id: "van-phong", name: "Phòng Làm Việc", image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&q=80&w=300", slugs: [] }
          ].map((r) => {
            const realCount = products.filter((p) => r.slugs.includes(p.category)).length;
            return (
              <div 
                key={r.id}
                onClick={() => onNavigateToCatalog({ category: r.id })}
                className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group border border-[#EADBC8] shadow-inner"
              >
                <img src={r.image} alt={r.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-4">
                  <h4 className="font-serif text-sm md:text-base font-bold text-white leading-tight">{r.name}</h4>
                  <p className="text-[10px] text-white/80 font-bold tracking-widest uppercase">{realCount} sản phẩm</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" id="featured-products">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-[#EADBC8] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Trọng Điểm Sưu Tập</span>
            <h2 className="font-serif text-3xl font-black text-[#1A1A1A]">Sản Phẩm Nổi Bật</h2>
          </div>
          <button
            onClick={() => onNavigateToCatalog({})}
            className="text-xs font-bold text-[#5C4033] hover:text-[#D4AF37] flex items-center gap-1.5 mt-2 md:mt-0 active:translate-x-1 transition-transform"
          >
            Tất cả sản phẩm <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((p) => {
            const isWish = wishlist.includes(p.id);
            return (
              <div 
                key={p.id}
                className="bg-white rounded-2xl border border-[#EADBC8] overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative aspect-square bg-[#FAF6F0] overflow-hidden group">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  
                  {/* Floating wishlist trigger */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWishlist(p.id);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-md hover:bg-white text-red-500 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${isWish ? "fill-red-500" : "text-gray-400"}`} />
                  </button>

                  <div 
                    onClick={() => onSelectProduct(p)}
                    className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  >
                    <span className="px-4 py-2 bg-white text-[#5C4033] text-xs font-bold tracking-wider rounded-full shadow">
                      Chi Tiết Độc Bản
                    </span>
                  </div>
                </div>

                <div className="p-4" onClick={() => onSelectProduct(p)}>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-[#D4AF37] block mb-1">
                    {p.brand} • {p.style}
                  </span>
                  <h3 className="font-serif text-sm font-bold text-[#1A1A1A] line-clamp-1 hover:text-[#5C4033] cursor-pointer">
                    {p.name}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-3.5 h-3.5 fill-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-xs font-bold text-[#1A1A1A]">{p.rating}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm font-bold text-[#5C4033]">
                      {formattedPrice(p.price)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Style Showcase Carousel Menu (Bộ sưu tập theo phong cách) */}
      <section className="bg-[#5C4033] text-[#FAF6F0] py-16" id="style-showcase-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[10px] text-[#D4AF37] font-bold tracking-widest uppercase">Trường phái Mỹ Thuật</span>
            <h2 className="font-serif text-3xl font-black mt-2">Tuyển Tập Theo Phong Cách</h2>
            <p className="text-[11px] text-[#EADBC8] mt-2 font-light">Chọn một tư duy thẩm mỹ phù hợp nhất với bản thể gia chủ để thiết lập đồng bộ vật lý.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { id: "Luxury", name: "Luxury Royal", tagline: "Gia thế hoàng vương, mạ titan champagne", bg: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&q=80&w=400" },
              { id: "Modern", name: "Modern Contemporary", tagline: "Khối thép mượt mà, đá Carrara nguyên miếng", bg: "https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&q=80&w=400" },
              { id: "Minimalist", name: "Minimalist Chic", tagline: "Ôm trọn eo hông, tối giản vô điều kiện", bg: "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&q=80&w=400" },
              { id: "Scandinavian", name: "Scandinavian Nordic", tagline: "Mộc mạc sồi già, vải dệt Rubio nguyên gốc", bg: "https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&q=80&w=400" }
            ].map((st) => (
              <div 
                key={st.id}
                onClick={() => onNavigateToCatalog({ style: st.id })}
                className="relative h-80 rounded-2xl overflow-hidden cursor-pointer group border border-[#FAF6F0]/20"
              >
                <img src={st.bg} alt={st.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-5 flex flex-col justify-end">
                  <h4 className="font-serif text-lg font-bold tracking-tight text-white">{st.name}</h4>
                  <p className="text-xs text-[#D4AF37] font-medium mt-1">{st.tagline}</p>
                  <span className="text-[10px] text-white/50 group-hover:text-white transition-colors mt-3 inline-flex items-center gap-1 font-bold uppercase tracking-wider">
                    Khám phá phong cách <ArrowRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Combos Deals Section (Combo nội thất theo phòng) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 animate-fade-in" id="combos-showcase-home">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-[#EADBC8] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Tiết Kiệm Lên Tới 8.000.000đ</span>
            <h2 className="font-serif text-3xl font-black text-[#1A1A1A]">Bộ Combo Phòng Tinh Tuyển</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {combos.map((c) => (
            <div 
              key={c.id} 
              onClick={() => onSelectCombo(c)}
              className="bg-white rounded-2xl border border-[#EADBC8] overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
            >
              <div className="h-56 relative">
                <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                <span className="absolute top-4 left-4 bg-gradient-to-tr from-[#D4AF37] to-[#C29E2F] text-white text-xs font-bold px-3 py-1 rounded-full shadow">
                  Gói {c.roomType} VIP
                </span>
                <span className="absolute bottom-4 right-4 bg-black/70 text-[#FAF6F0] text-[11px] font-semibold px-2.5 py-1 rounded">
                  Diện tích: {c.roomSize}
                </span>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-serif text-base font-bold text-[#1A1A1A] line-clamp-1">{c.name}</h3>
                  <p className="text-xs text-[#8B7E74] leading-relaxed line-clamp-2 mt-1">{c.description}</p>
                </div>

                <div className="pt-4 border-t border-[#EADBC8]/50 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#8B7E74] block line-through">Tổng giá trị: {formattedPrice(c.price)}</span>
                    <span className="text-lg font-serif font-black text-[#5C4033]">{formattedPrice(c.discountPrice)}</span>
                  </div>
                  <span className="px-4 py-2 rounded-lg bg-[#FAF6F0] hover:bg-[#EADBC8]/40 border border-[#EADBC8] text-xs font-bold text-[#5C4033] tracking-widest uppercase text-center transition-colors">
                    Sở Hữu Trọn Bộ
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. BestSellers (Sản phẩm bán chạy) */}
      <section className="bg-[#FAF6F0] py-16" id="bestsellers-home">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Doanh số dẫn đầu quý</span>
            <h2 className="font-serif text-3xl font-bold text-[#1A1A1A]">Kiệt Tác Bán Chạy Nhất</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((p) => (
              <div 
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="bg-white rounded-xl border border-[#EADBC8] p-4 cursor-pointer hover:shadow-lg transition-transform hover:-translate-y-1 block duration-300"
              >
                <div className="aspect-square rounded-lg overflow-hidden bg-white mb-3">
                  <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] text-[#8B7E74] bg-[#F4EBE1] px-2 py-0.5 rounded font-semibold">{p.categoryName}</span>
                <h4 className="font-serif text-sm font-bold text-[#1A1A1A] mt-2 line-clamp-1">{p.name}</h4>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#EADBC8]/40">
                  <span className="text-xs font-bold text-[#5C4033]">{formattedPrice(p.price)}</span>
                  <div className="flex items-center gap-0.5">
                    <Star className="w-3 h-3 fill-[#D4AF37] text-[#D4AF37]" />
                    <span className="text-[11px] font-bold">{p.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Customer opinions (Đánh giá khách hàng) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4" id="testimonials">
        <div className="bg-white rounded-2xl p-8 border border-[#EADBC8] shadow-sm">
          <div className="text-center mb-8">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Sự tín nhiệm của các chuyên gia</span>
            <h2 className="font-serif text-3xl font-black text-[#1A1A1A]">Hài Lòng Độc Bản</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { author: "Doanh nhân Lê Hoàng Giang", title: "CEO Giang Nam Invest", text: "Mua Sofa Royal Signature và được LuxeHome mang tới tận tầng 28 lắp rất khớp. Đơn hàng bảo hành trọn đời bộ khung gỗ khiến tôi vô cùng vững lòng.", rating: 5, avatar: "https://images.unsplash.com/photo-1542744094-3a31f103e35f?auto=format&fit=crop&q=80&w=60" },
              { author: "Nghệ sĩ Đặng Ngọc Lan", title: "Violinist", text: "Thước bàn ăn của Sồi mộc nêm nếm cho gian bếp nhà tôi bầu không khí an nhiên kỳ diệu. Từng góc cạnh uốn dẻo dịu mềm không tì vết dẫu trẻ nhỏ nghịch tung.", rating: 5, avatar: "https://images.unsplash.com/photo-1589384267710-7a259678a59a?auto=format&fit=crop&q=80&w=60" },
              { author: "Chị Nguyễn Quỳnh An", title: "Giám đốc Nghệ thuật Sabeco", text: "Kiến trúc phòng khách được thay màu champagne từ LuxeHome sang gấp vạn lần. Chatbot AI hỗ trợ nhanh và chuẩn kiến thức mộc.", rating: 4.8, avatar: "https://images.unsplash.com/photo-1580481072645-022f9a6dbf27?auto=format&fit=crop&q=80&w=60" }
            ].map((t, i) => (
              <div key={i} className="bg-[#FAF6F0] p-6 rounded-xl border border-[#EADBC8] flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex gap-1 text-[#D4AF37]">
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star key={idx} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs text-[#5C4033] leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>
                
                <div className="flex items-center gap-3 pt-4 border-t border-[#EADBC8]/40 mt-4">
                  <img src={t.avatar} alt={t.author} className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]" />
                  <div>
                    <h5 className="text-xs font-bold text-[#1A1A1A]">{t.author}</h5>
                    <span className="text-[10px] text-[#8B7E74]">{t.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Inspiration Blog (Blog cảm hứng thiết kế nội thất) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-12" id="design-blog">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 border-b border-[#EADBC8] pb-4">
          <div>
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">Nhật Ký Kiến Trúc</span>
            <h2 className="font-serif text-3xl font-black text-[#1A1A1A]">Cảm Hứng Sáng Tạo LuxeHome</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogs.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl overflow-hidden border border-[#EADBC8] flex flex-col md:flex-row shadow-sm hover:shadow-lg transition-transform duration-300">
              <div className="md:w-1/3 h-48 md:h-full relative flex-shrink-0">
                <img src={b.image} alt={b.title} className="w-full h-full object-cover" />
              </div>
              <div className="p-6 flex flex-col justify-between flex-1">
                <div>
                  <span className="text-[10px] bg-[#FAF6F0] px-2.5 py-1 rounded text-[#5C4033] font-bold uppercase tracking-wider">{b.category}</span>
                  <h3 className="font-serif text-sm font-bold text-[#1A1A1A] mt-3 tracking-snug hover:text-[#5C4033] cursor-pointer">
                    {b.title}
                  </h3>
                  <p className="text-xs text-[#8B7E74] leading-normal mt-2 line-clamp-2">{b.excerpt}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-[#EADBC8]/40 flex items-center justify-between text-[10px] text-[#8B7E74] font-medium">
                  <span>Tác giả: {b.author}</span>
                  <span>{b.readTime}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
