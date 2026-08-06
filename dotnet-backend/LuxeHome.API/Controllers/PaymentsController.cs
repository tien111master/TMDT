using LuxeHome.Application.DTOs;
using LuxeHome.Application.Services;
using LuxeHome.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace LuxeHome.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PaymentsController : ControllerBase
    {
        private readonly IConfiguration _config;
        private readonly VnPayService _vnpay;
        private readonly LuxeHomeDbContext _db;
        private readonly OrderService _orderService;

        public PaymentsController(
            IConfiguration config,
            VnPayService vnpay,
            LuxeHomeDbContext db,
            OrderService orderService)
        {
            _config = config;
            _vnpay = vnpay;
            _db = db;
            _orderService = orderService;
        }

        [HttpPost("vnpay/create-payment-url")]
        [Authorize]
        public async Task<IActionResult> CreatePaymentUrl([FromBody] CreateOrderDto dto)
        {
            try
            {
                var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

                if (string.IsNullOrEmpty(userIdClaim))
                    return Unauthorized(new { message = "Bạn cần đăng nhập trước khi thanh toán." });

                long userId = long.Parse(userIdClaim);

                if (dto == null || dto.TotalAmount <= 0)
                    return BadRequest(new { message = "TotalAmount không hợp lệ." });

                string vnpayOrderId = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

                var order = await _orderService.CreateOrderAsync(
                    dto,
                    userId,
                    vnpayOrderId,
                    paymentStatus: "UNPAID",
                    orderStatus: "PENDING"
                );

                string ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                var paymentUrl = _vnpay.CreatePaymentUrl(
                    dto.TotalAmount,
                    vnpayOrderId,
                    ipAddress,
                    _config
                );

                return Ok(new
                {
                    paymentUrl,
                    orderId = order.OrderCode,
                    id = order.Id,
                    totalAmount = order.FinalAmount
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine("CREATE VNPAY PAYMENT ERROR: " + ex);
                return BadRequest(new
                {
                    message = ex.Message,
                    detail = ex.InnerException?.Message
                });
            }
        }

        [HttpGet("vnpay-return")]
        public async Task<IActionResult> VnPayReturn()
        {
            var query = Request.Query;
            string frontendBaseUrl = (_config["Frontend:BaseUrl"] ?? "https://tmdt-plum.vercel.app").TrimEnd('/');

            if (!query.ContainsKey("vnp_SecureHash"))
            {
                return Ok("ReturnUrl VNPay hoạt động.");
            }

            string vnpHashSecret = _config["Vnpay:HashSecret"] ?? "";

            bool isValid = _vnpay.ValidateSignature(query, vnpHashSecret);

            if (!isValid)
                return BadRequest("Chữ ký không hợp lệ!");

            string responseCode = query["vnp_ResponseCode"].ToString();
            string txnRef = query["vnp_TxnRef"].ToString();
            string amountRaw = query["vnp_Amount"].ToString();
            string transactionNo = query["vnp_TransactionNo"].ToString();

            var order = await _db.Orders
                .FirstOrDefaultAsync(o => o.OrderCode == txnRef);

            if (order == null)
            {
                Console.WriteLine("Không tìm thấy đơn hàng với TxnRef: " + txnRef);
                return Redirect($"{frontendBaseUrl}/checkout/fail?reason=order-not-found");
            }

            decimal vnpAmount = decimal.Parse(amountRaw, CultureInfo.InvariantCulture) / 100;
            decimal orderAmount = order.FinalAmount ?? 0;

            if (vnpAmount != orderAmount)
            {
                order.PaymentStatus = "INVALID_AMOUNT";
                order.OrderStatus = "PAYMENT_FAILED";

                await _db.SaveChangesAsync();

                return Redirect($"{frontendBaseUrl}/checkout/fail?reason=invalid-amount");
            }

            if (responseCode == "00")
            {
                order.PaymentStatus = "PAID";
                order.OrderStatus = "CONFIRMED";
                order.ConfirmedAt = DateTime.UtcNow;

                await _db.SaveChangesAsync();

                return Redirect($"{frontendBaseUrl}/checkout/success?orderId={txnRef}");
            }

            order.PaymentStatus = "FAILED";
            order.OrderStatus = "PAYMENT_FAILED";

            await _db.SaveChangesAsync();

            return Redirect($"{frontendBaseUrl}/checkout/fail?orderId={txnRef}");
        }

        [HttpGet("test-vnpay")]
        public IActionResult TestVnPay()
        {
            var paymentUrl = _vnpay.CreatePaymentUrl(
                10000m,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString(),
                "127.0.0.1",
                _config
            );

            return Ok(new { paymentUrl });
        }
    }
}