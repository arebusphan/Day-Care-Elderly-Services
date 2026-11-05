using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261105080000_AddMedicationPlanScheduleTimes")]
public sealed class AddMedicationPlanScheduleTimes : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF COL_LENGTH(N'dbo.MedicationPlans', N'ScheduleTimes') IS NULL
                ALTER TABLE dbo.MedicationPlans ADD ScheduleTimes NVARCHAR(200) NULL;

            UPDATE dbo.MedicationPlans
            SET ScheduleTimes = N'08:00'
            WHERE ScheduleTimes IS NULL OR LTRIM(RTRIM(ScheduleTimes)) = N'';

            ALTER TABLE dbo.MedicationPlans ALTER COLUMN ScheduleTimes NVARCHAR(200) NOT NULL;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF COL_LENGTH(N'dbo.MedicationPlans', N'ScheduleTimes') IS NOT NULL
                ALTER TABLE dbo.MedicationPlans DROP COLUMN ScheduleTimes;
        ");
    }
}
