// Chuyển chuỗi tiếng Việt có dấu -> slug chuẩn không dấu (a-z, 0-9, dấu gạch ngang).
// VD: "Phòng Khách" -> "phong-khach", "Bàn Ăn Gỗ 1m6 SERENA" -> "ban-an-go-1m6-serena"
//
// Dùng chung cho mọi nơi cần tạo slug trong app (thêm sản phẩm, sửa sản phẩm...)
// để tránh mỗi nơi tự viết 1 kiểu rồi lệch nhau như trước đây.
export function generateSlug(text: string): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // bỏ dấu thanh + dấu mũ/móc
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}