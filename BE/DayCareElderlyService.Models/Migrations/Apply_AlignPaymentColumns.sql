SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID('dbo.Payments', 'U') IS NOT NULL
BEGIN
    IF COL_LENGTH('dbo.Payments', 'PaymentStatus') IS NULL
       AND COL_LENGTH('dbo.Payments', 'Status') IS NOT NULL
        EXEC sys.sp_rename 'dbo.Payments.Status', 'PaymentStatus', 'COLUMN';

    IF COL_LENGTH('dbo.Payments', 'PaidAt') IS NULL
       AND COL_LENGTH('dbo.Payments', 'PaymentDate') IS NOT NULL
        EXEC sys.sp_rename 'dbo.Payments.PaymentDate', 'PaidAt', 'COLUMN';

    IF COL_LENGTH('dbo.Payments', 'PaidAt') IS NOT NULL
       AND EXISTS (
            SELECT 1 FROM sys.columns
            WHERE object_id = OBJECT_ID('dbo.Payments')
              AND name = 'PaidAt'
              AND is_nullable = 0
       )
        ALTER TABLE dbo.Payments ALTER COLUMN PaidAt DATETIME2(0) NULL;

    IF COL_LENGTH('dbo.Payments', 'PaymentStatus') IS NOT NULL
        ALTER TABLE dbo.Payments ALTER COLUMN PaymentStatus NVARCHAR(30) NOT NULL;
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103150000_AlignPaymentColumns')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103150000_AlignPaymentColumns', '8.0.0');

COMMIT TRANSACTION;
