SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH('dbo.CareLogs', 'CareDate') IS NOT NULL
   AND EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.CareLogs')
          AND name = 'CareDate'
          AND is_nullable = 0
   )
    ALTER TABLE dbo.CareLogs ALTER COLUMN CareDate DATE NULL;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103152000_MakeLegacyCareDateOptional')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103152000_MakeLegacyCareDateOptional', '8.0.0');

COMMIT TRANSACTION;
