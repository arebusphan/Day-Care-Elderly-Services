using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations
{
    /// <inheritdoc />
    public partial class AddIncidentSupplyConfirmedAndMedicalSupplyQuantityInStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'IncidentReports')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IsSupplyConfirmed')
                        ALTER TABLE IncidentReports ADD IsSupplyConfirmed BIT NOT NULL CONSTRAINT DF_IncidentReports_IsSupplyConfirmed DEFAULT 0;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MedicalSupplies')
                BEGIN
                    IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'QuantityInStock')
                        ALTER TABLE MedicalSupplies ADD QuantityInStock DECIMAL(18,2) NOT NULL CONSTRAINT DF_MedicalSupplies_QuantityInStock DEFAULT 0;
                END
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'IncidentReports' AND COLUMN_NAME = 'IsSupplyConfirmed')
                BEGIN
                    ALTER TABLE IncidentReports DROP CONSTRAINT DF_IncidentReports_IsSupplyConfirmed;
                    ALTER TABLE IncidentReports DROP COLUMN IsSupplyConfirmed;
                END

                IF EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MedicalSupplies' AND COLUMN_NAME = 'QuantityInStock')
                BEGIN
                    ALTER TABLE MedicalSupplies DROP CONSTRAINT DF_MedicalSupplies_QuantityInStock;
                    ALTER TABLE MedicalSupplies DROP COLUMN QuantityInStock;
                END
            ");
        }
    }
}
