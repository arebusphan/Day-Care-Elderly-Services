namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Mã lỗi đánh dấu "không có quyền xem" để controller trả HTTP 403 thay vì 400
/// (Design Brief R1: kiểm tra 403/404 khi gia đình truy cập cụ không thuộc nhà mình — NFR-03).
/// </summary>
public static class AccessDenied
{
    public const string Code = "ACCESS_DENIED";
    public const string ElderlyMessage = "Không tìm thấy người cao tuổi hoặc bạn không có quyền xem care log.";

    public static List<string> Errors => new() { Code, ElderlyMessage };

    public static bool Is<T>(ApiResponse<T> response) =>
        !response.Success && response.Errors?.Contains(Code) == true;
}
