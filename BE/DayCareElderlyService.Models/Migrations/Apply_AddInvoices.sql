SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Invoices', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Invoices (
        InvoiceId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Invoices PRIMARY KEY,
        RegistrationId INT NOT NULL,
        InvoiceNo NVARCHAR(50) NOT NULL,
        InvoiceVatNo NVARCHAR(50) NULL,
        TotalAmount DECIMAL(18,2) NOT NULL,
        Status NVARCHAR(30) NOT NULL CONSTRAINT DF_Invoices_Status DEFAULT N'Pending',
        IssuedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Invoices_IssuedAt DEFAULT SYSDATETIME(),
        DueAt DATETIME2(0) NULL,
        CONSTRAINT FK_Invoices_ServiceRegistrations FOREIGN KEY (RegistrationId)
            REFERENCES dbo.ServiceRegistrations(RegistrationId)
    );
END;

IF COL_LENGTH(N'dbo.Payments', N'InvoiceId') IS NULL
    ALTER TABLE dbo.Payments ADD InvoiceId INT NULL;

INSERT INTO dbo.Invoices (RegistrationId, InvoiceNo, InvoiceVatNo, TotalAmount, Status, IssuedAt)
SELECT p.RegistrationId,
       COALESCE(MAX(NULLIF(p.InvoiceNo, N'')), CONCAT(N'HD-LEGACY-', p.RegistrationId)),
       MAX(p.InvoiceVatNo),
       SUM(p.Amount),
       CASE WHEN MIN(CASE WHEN LOWER(p.PaymentStatus) = N'paid' THEN 1 ELSE 0 END) = 1 THEN N'Paid' ELSE N'Pending' END,
       MIN(p.CreatedAt)
FROM dbo.Payments p
WHERE NOT EXISTS (SELECT 1 FROM dbo.Invoices i WHERE i.RegistrationId = p.RegistrationId)
GROUP BY p.RegistrationId;

UPDATE p
SET p.InvoiceId = i.InvoiceId
FROM dbo.Payments p
JOIN dbo.Invoices i ON i.RegistrationId = p.RegistrationId
WHERE p.InvoiceId IS NULL;

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Invoices') AND name = N'UQ_Invoices_RegistrationId')
    CREATE UNIQUE INDEX UQ_Invoices_RegistrationId ON dbo.Invoices(RegistrationId);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Invoices') AND name = N'IX_Invoices_InvoiceNo')
    CREATE INDEX IX_Invoices_InvoiceNo ON dbo.Invoices(InvoiceNo);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Payments') AND name = N'IX_Payments_InvoiceId')
    CREATE INDEX IX_Payments_InvoiceId ON dbo.Payments(InvoiceId);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Payments_Invoices')
    ALTER TABLE dbo.Payments ADD CONSTRAINT FK_Payments_Invoices
        FOREIGN KEY (InvoiceId) REFERENCES dbo.Invoices(InvoiceId);

IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103210000_AddInvoices')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103210000_AddInvoices', '8.0.0');

COMMIT TRANSACTION;
