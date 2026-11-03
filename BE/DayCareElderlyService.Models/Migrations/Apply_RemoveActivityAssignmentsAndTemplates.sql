SET XACT_ABORT ON;
BEGIN TRANSACTION;

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

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory')
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103180000_RemoveActivityAssignmentsAndTemplates')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103180000_RemoveActivityAssignmentsAndTemplates', '8.0.0');

COMMIT TRANSACTION;
