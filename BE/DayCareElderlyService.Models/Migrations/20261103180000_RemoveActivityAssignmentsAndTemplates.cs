using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103180000_RemoveActivityAssignmentsAndTemplates")]
public sealed class RemoveActivityAssignmentsAndTemplates : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DECLARE @dropForeignKeys NVARCHAR(MAX) = N'';

            SELECT @dropForeignKeys = @dropForeignKeys
                + N'ALTER TABLE ' + QUOTENAME(SCHEMA_NAME(parentTable.schema_id))
                + N'.' + QUOTENAME(parentTable.name)
                + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
            FROM sys.foreign_keys fk
            INNER JOIN sys.tables parentTable ON parentTable.object_id = fk.parent_object_id
            WHERE fk.referenced_object_id = OBJECT_ID(N'dbo.ActivityTemplates');

            IF LEN(@dropForeignKeys) > 0
                EXEC sys.sp_executesql @dropForeignKeys;

            IF OBJECT_ID(N'dbo.PackageActivities', N'U') IS NOT NULL
               AND COL_LENGTH(N'dbo.PackageActivities', N'ActivityTemplateId') IS NOT NULL
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID(N'dbo.PackageActivities')
                      AND name = N'ActivityTemplateId'
                      AND is_nullable = 0
                )
                    EXEC(N'ALTER TABLE dbo.PackageActivities ALTER COLUMN ActivityTemplateId INT NULL');

                EXEC(N'UPDATE dbo.PackageActivities SET ActivityTemplateId = NULL WHERE ActivityTemplateId IS NOT NULL');
            END;

            IF OBJECT_ID(N'dbo.ActivityAssignments', N'U') IS NOT NULL
                DROP TABLE dbo.ActivityAssignments;

            IF OBJECT_ID(N'dbo.ActivityTemplates', N'U') IS NOT NULL
                DROP TABLE dbo.ActivityTemplates;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException("ActivityAssignments và ActivityTemplates đã bị xóa cùng dữ liệu; không thể khôi phục tự động.");
    }
}
