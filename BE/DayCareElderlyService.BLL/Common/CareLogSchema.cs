using DayCareElderlyService.Models.Data;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.BLL.Common;

/// <summary>
/// Đảm bảo bảng CareLogs có cột Data và IsInternal (giống Migration_AddCareLogFields.sql)
/// </summary>
public static class CareLogSchema
{
    private static bool _columnsChecked = false;

    public static async Task EnsureColumnsAsync(AppDbContext context)
    {
        if (_columnsChecked) return;

        try
        {
            var syncColumnsSql = @"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CareLogs')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'Data')
                        ALTER TABLE CareLogs ADD Data NVARCHAR(MAX) NULL;

                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'CareLogs' AND COLUMN_NAME = 'IsInternal')
                        ALTER TABLE CareLogs ADD IsInternal BIT NOT NULL CONSTRAINT DF_CareLogs_IsInternal DEFAULT 0;
                END
            ";
            await context.Database.ExecuteSqlRawAsync(syncColumnsSql);
            _columnsChecked = true;
        }
        catch
        {
            // Bỏ qua nếu DB không hỗ trợ hoặc quyền hạn chế
        }
    }
}
