using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103152000_MakeLegacyCareDateOptional")]
public sealed class MakeLegacyCareDateOptional : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF COL_LENGTH('dbo.CareLogs', 'CareDate') IS NOT NULL
               AND EXISTS (
                    SELECT 1 FROM sys.columns
                    WHERE object_id = OBJECT_ID('dbo.CareLogs')
                      AND name = 'CareDate'
                      AND is_nullable = 0
               )
                ALTER TABLE dbo.CareLogs ALTER COLUMN CareDate DATE NULL;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // CareDate is a legacy field no longer written by the current model.
    }
}
