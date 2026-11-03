SET XACT_ABORT ON;
BEGIN TRANSACTION;

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

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory')
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103143000_MakeRegistrationCenterOptional')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103143000_MakeRegistrationCenterOptional', '8.0.0');

COMMIT TRANSACTION;
