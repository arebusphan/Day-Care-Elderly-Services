using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace DayCareElderlyService.BLL.DTOs.Billing;

public class CreateServiceRegistrationDto
{
    [Required(ErrorMessage = "Vui lòng chọn gói dịch vụ")]
    public Guid PackageId { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn người cao tuổi")]
    public Guid ElderlyId { get; set; }

    [Required(ErrorMessage = "Vui lòng chọn hình thức đăng ký")]
    public string RegistrationType { get; set; } = "monthly"; // "monthly" | "daily"

    public string? MonthlyPattern { get; set; } // "all" | "mwf" | "tts"

    [Required(ErrorMessage = "Vui lòng chọn ngày bắt đầu")]
    public DateOnly StartDate { get; set; }

    public DateOnly? EndDate { get; set; }

    public string RoomType { get; set; } = "large"; // "large" | "small"

    [Range(1, 365, ErrorMessage = "Số ngày đăng ký phải từ 1 đến 365")]
    public int TotalDays { get; set; } = 1;

    public decimal PackagePrice { get; set; }

    public decimal SupportSurcharge { get; set; }

    public decimal RoomSurcharge { get; set; }

    [Range(0, 1000000000, ErrorMessage = "Tổng tiền không hợp lệ")]
    public decimal TotalAmount { get; set; }

    public List<string>? SelectedDates { get; set; }

    public string PaymentMethod { get; set; } = "Chuyển khoản";
}
