using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using LuxeHome.Application.DTOs;
using LuxeHome.Infrastructure.Data;
using LuxeHome.Domain.Entities;

namespace LuxeHome.API.Controllers
{
    // =========================================================================
    // Controller này hiện thực đúng theo sơ đồ "act AD_Tạo yêu cầu giao hàng"
    // 3 lane: Nhân viên kho | Đơn vị vận chuyển | Hệ thống
    // Chỉ hoạt động khi Order.OrderStatus = "SHIPPING" (tức đã qua bước Sales duyệt đơn)
    // =========================================================================
    [Route("api/[controller]")]
    [ApiController]
    public class ShipmentsController : ControllerBase
    {
        private readonly LuxeHomeDbContext _db;

        public ShipmentsController(LuxeHomeDbContext db)
        {
            _db = db;
        }

        // NHÂN VIÊN KHO — "Xem danh sách đơn cần giao"
        // Đơn đã được Sales duyệt (SHIPPING) nhưng chưa có shipment nào đang xử lý
        [Authorize(Roles = "ADMIN,WAREHOUSE_STAFF")]
        [HttpGet("orders-to-deliver")]
        public async Task<IActionResult> GetOrdersToDeliver()
        {
            var orders = await _db.Orders
                .Where(o => (o.OrderStatus == "SHIPPING" || o.OrderStatus == "DELIVERY_FAILED")
                        && !_db.Shipments.Any(s => s.OrderId == o.Id &&
                                (s.ShippingStatus == "WAITING_CARRIER"
                                || s.ShippingStatus == "RECEIVED"
                                || s.ShippingStatus == "IN_TRANSIT")))
                .OrderBy(o => o.Id)
                .Select(o => new
                {
                    o.Id,
                    o.OrderCode,
                    CustomerName = o.ReceiverName,
                    o.ReceiverPhone,
                    o.ShippingAddress,
                    o.OrderStatus,
                    o.ShippingStatus,
                    o.StaffNote
                })
                .ToListAsync();

            return Ok(orders);
        }

        // NHÂN VIÊN KHO — "Tạo yêu cầu giao hàng" + "Bàn giao đơn hàng cho đơn vị vận chuyển"
        // Cho phép gọi lại (retry) nếu lần giao trước thất bại (DELIVERY_FAILED)
        [Authorize(Roles = "ADMIN,WAREHOUSE_STAFF")]
        [HttpPost("{orderId}/create")]
        public async Task<IActionResult> CreateShipment(long orderId, [FromBody] CreateShipmentDto dto)
        {
            var order = await _db.Orders.FindAsync(orderId);
            if (order == null) return NotFound(new { message = "Không tìm thấy đơn hàng." });

            var currentStatus = order.OrderStatus?.ToUpperInvariant();
            if (currentStatus != "SHIPPING" && currentStatus != "DELIVERY_FAILED")
            {
                return BadRequest(new
                {
                    message = "Đơn hàng chưa được Sales duyệt hoặc không ở trạng thái chờ giao."
                });
            }

            if (string.IsNullOrWhiteSpace(dto.CarrierName))
                return BadRequest(new { message = "Vui lòng nhập tên đơn vị vận chuyển." });

            var shipment = new Shipment
            {
                OrderId = orderId,
                CarrierName = dto.CarrierName,
                ShippingStatus = "WAITING_CARRIER",
                ShippingFee = order.ShippingFee
            };

            _db.Shipments.Add(shipment);

            // Reset lại nếu đang retry sau lần thất bại trước
            order.OrderStatus = "SHIPPING";
            order.ShippingStatus = "WAITING_CARRIER";
            order.StaffNote = null;

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã tạo yêu cầu giao hàng và bàn giao cho đơn vị vận chuyển.",
                shipmentId = shipment.Id,
                shippingStatus = order.ShippingStatus
            });
        }

        // ĐƠN VỊ VẬN CHUYỂN — "Xem các yêu cầu giao hàng đang chờ xử lý"
        [Authorize(Roles = "ADMIN,SHIPPER")]
        [HttpGet("pending")]
        public async Task<IActionResult> GetPendingShipments()
        {
            var shipments = await _db.Shipments
                .Include(s => s.Order)
                .Where(s => s.ShippingStatus == "WAITING_CARRIER"
                         || s.ShippingStatus == "RECEIVED"
                         || s.ShippingStatus == "IN_TRANSIT")
                .OrderBy(s => s.Id)
                .Select(s => new
                {
                    s.Id,
                    s.OrderId,
                    OrderCode = s.Order.OrderCode,
                    CustomerName = s.Order.ReceiverName,
                    CustomerPhone = s.Order.ReceiverPhone,
                    ShippingAddress = s.Order.ShippingAddress,
                    s.CarrierName,
                    s.TrackingCode,
                    s.ShippingStatus
                })
                .ToListAsync();

            return Ok(shipments);
        }

        // ĐƠN VỊ VẬN CHUYỂN — "Tiếp nhận yêu cầu giao hàng"
        [Authorize(Roles = "ADMIN,SHIPPER")]
        [HttpPut("{shipmentId}/receive")]
        public async Task<IActionResult> ReceiveShipment(long shipmentId)
        {
            var shipment = await _db.Shipments.FindAsync(shipmentId);
            if (shipment == null) return NotFound(new { message = "Không tìm thấy yêu cầu giao hàng." });

            shipment.ShippingStatus = "RECEIVED";
            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Đơn vị vận chuyển đã tiếp nhận yêu cầu giao hàng.",
                shippingStatus = shipment.ShippingStatus
            });
        }

        // ĐƠN VỊ VẬN CHUYỂN — "Cập nhật mã vận đơn"
        // -> HỆ THỐNG: "Lưu mã vận đơn vào đơn bán" + "Cập nhật trạng thái đang giao"
        [Authorize(Roles = "ADMIN,SHIPPER")]
        [HttpPut("{shipmentId}/tracking-code")]
        public async Task<IActionResult> UpdateTrackingCode(long shipmentId, [FromBody] UpdateTrackingCodeDto dto)
        {
            var shipment = await _db.Shipments.Include(s => s.Order).FirstOrDefaultAsync(s => s.Id == shipmentId);
            if (shipment == null) return NotFound(new { message = "Không tìm thấy yêu cầu giao hàng." });

            if (string.IsNullOrWhiteSpace(dto.TrackingCode))
                return BadRequest(new { message = "Vui lòng nhập mã vận đơn." });

            shipment.TrackingCode = dto.TrackingCode;
            shipment.ShippingStatus = "IN_TRANSIT";
            shipment.ShippedAt = DateTime.UtcNow;

            // Lưu mã vận đơn vào đơn bán + cập nhật trạng thái "Đang giao"
            shipment.Order.ShippingStatus = "IN_TRANSIT";

            await _db.SaveChangesAsync();

            return Ok(new
            {
                message = "Đã cập nhật mã vận đơn. Đơn hàng chuyển sang trạng thái Đang giao.",
                trackingCode = shipment.TrackingCode,
                shippingStatus = shipment.Order.ShippingStatus
            });
        }

        // ĐƠN VỊ VẬN CHUYỂN — Ghi nhận kết quả giao hàng (nhánh rẽ Thành công / Thất bại)
        [Authorize(Roles = "ADMIN,SHIPPER")]
        [HttpPut("{shipmentId}/delivery-result")]
        public async Task<IActionResult> RecordDeliveryResult(long shipmentId, [FromBody] DeliveryResultDto dto)
        {
            var shipment = await _db.Shipments.Include(s => s.Order).FirstOrDefaultAsync(s => s.Id == shipmentId);
            if (shipment == null) return NotFound(new { message = "Không tìm thấy yêu cầu giao hàng." });

            if (dto.Success)
            {
                // "Ghi nhận giao hàng thành công" -> "Xác nhận khách đã nhận hàng"
                shipment.ShippingStatus = "DELIVERED_SUCCESS";
                shipment.DeliveredAt = DateTime.UtcNow;

                // Cập nhật trạng thái đơn = "Đã giao"
                shipment.Order.ShippingStatus = "DELIVERED";
                shipment.Order.OrderStatus = "DELIVERED"; // chuyển tiếp sang bước Sales ghi nhận thanh toán

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    message = "Giao hàng thành công! Khách đã xác nhận nhận hàng.",
                    orderStatus = shipment.Order.OrderStatus
                });
            }
            else
            {
                // "Ghi nhận giao hàng thất bại" -> "Nhập lí do giao thất bại"
                if (string.IsNullOrWhiteSpace(dto.FailReason))
                    return BadRequest(new { message = "Vui lòng nhập lý do giao hàng thất bại." });

                shipment.ShippingStatus = "DELIVERED_FAILED";
                shipment.Note = dto.FailReason;

                // Cập nhật trạng thái đơn = "Giao thất bại"
                shipment.Order.ShippingStatus = "FAILED";
                shipment.Order.OrderStatus = "DELIVERY_FAILED";
                shipment.Order.StaffNote = dto.FailReason;

                await _db.SaveChangesAsync();

                return Ok(new
                {
                    message = "Đã ghi nhận giao hàng thất bại và lý do.",
                    orderStatus = shipment.Order.OrderStatus,
                    reason = dto.FailReason
                });
            }
        }

        // NHÂN VIÊN KHO — "Theo dõi trạng thái giao hàng" + "Xem lý do thất bại"
        [Authorize(Roles = "ADMIN,WAREHOUSE_STAFF")]
        [HttpGet("order/{orderId}")]
        public async Task<IActionResult> GetShipmentsByOrder(long orderId)
        {
            var shipments = await _db.Shipments
                .Where(s => s.OrderId == orderId)
                .OrderByDescending(s => s.Id)
                .Select(s => new
                {
                    s.Id,
                    s.OrderId,
                    s.CarrierName,
                    s.TrackingCode,
                    s.ShippingStatus,
                    s.ShippedAt,
                    s.DeliveredAt,
                    s.Note
                })
                .ToListAsync();

            return Ok(shipments);
        }
    }
}