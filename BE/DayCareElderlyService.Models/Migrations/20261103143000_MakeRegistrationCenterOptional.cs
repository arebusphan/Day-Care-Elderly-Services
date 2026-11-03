using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103143000_MakeRegistrationCenterOptional")]
public sealed class MakeRegistrationCenterOptional : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            IF COL_LENGTH('dbo.ServiceRegistrations', 'CenterId') IS NOT NULL
               AND EXISTS (
                    SELECT 1
                    FROM sys.columns c
                    JOIN sys.types t ON c.user_type_id = t.user_type_id
                    WHERE c.object_id = OBJECT_ID('dbo.ServiceRegistrations')
                      AND c.name = 'CenterId'
                      AND t.name = 'int'
                      AND c.is_nullable = 0
               )
            BEGIN
                ALTER TABLE dbo.ServiceRegistrations ALTER COLUMN CenterId INT NULL;
            END;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Existing registrations created without a center cannot be made required safely.
    }
}
