SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF COL_LENGTH(N'dbo.CareLogs', N'BloodPressure') IS NULL
    ALTER TABLE dbo.CareLogs ADD BloodPressure NVARCHAR(20) NULL;
IF COL_LENGTH(N'dbo.CareLogs', N'BloodGlucose') IS NULL
    ALTER TABLE dbo.CareLogs ADD BloodGlucose DECIMAL(5,2) NULL;

-- Move readings from the temporary child tables if an earlier attempt created them.
IF OBJECT_ID(N'dbo.BloodPressure', N'U') IS NOT NULL
    EXEC sys.sp_executesql N'
        UPDATE c
        SET BloodPressure = CONCAT(CASE WHEN bp.SystolicBp IS NULL THEN N''?'' ELSE CONVERT(NVARCHAR(10), bp.SystolicBp) END,
                                   N''/'',
                                   CASE WHEN bp.DiastolicBp IS NULL THEN N''?'' ELSE CONVERT(NVARCHAR(10), bp.DiastolicBp) END)
        FROM dbo.CareLogs c JOIN dbo.BloodPressure bp ON bp.CareLogId = c.CareLogId
        WHERE c.BloodPressure IS NULL;';

IF OBJECT_ID(N'dbo.BloodGlucose', N'U') IS NOT NULL
    EXEC sys.sp_executesql N'
        UPDATE c SET BloodGlucose = bg.Value
        FROM dbo.CareLogs c JOIN dbo.BloodGlucose bg ON bg.CareLogId = c.CareLogId
        WHERE c.BloodGlucose IS NULL;';

-- Move readings previously stored in the VITALS JSON payload.
EXEC sys.sp_executesql N'
    UPDATE dbo.CareLogs
    SET BloodPressure = COALESCE(BloodPressure,
        CASE
            WHEN JSON_VALUE(Data, ''$.systolicBp'') IS NULL AND JSON_VALUE(Data, ''$.diastolicBp'') IS NULL THEN NULL
            ELSE CONCAT(COALESCE(JSON_VALUE(Data, ''$.systolicBp''), N''?''), N''/'', COALESCE(JSON_VALUE(Data, ''$.diastolicBp''), N''?''))
        END),
        BloodGlucose = COALESCE(BloodGlucose, TRY_CONVERT(DECIMAL(5,2), JSON_VALUE(Data, ''$.bloodGlucose'')))
    WHERE CareType = N''VITALS'' AND ISJSON(Data) = 1;';

-- Preserve values from any temporary columns created by the earlier attempt.
IF COL_LENGTH(N'dbo.CareLogs', N'SystolicBp') IS NOT NULL AND COL_LENGTH(N'dbo.CareLogs', N'DiastolicBp') IS NOT NULL
    EXEC sys.sp_executesql N'
        UPDATE dbo.CareLogs
        SET BloodPressure = COALESCE(BloodPressure, CONCAT(COALESCE(CONVERT(NVARCHAR(10), SystolicBp), N''?''), N''/'', COALESCE(CONVERT(NVARCHAR(10), DiastolicBp), N''?'')))
        WHERE SystolicBp IS NOT NULL OR DiastolicBp IS NOT NULL;';
ELSE IF COL_LENGTH(N'dbo.CareLogs', N'SystolicBp') IS NOT NULL
    EXEC sys.sp_executesql N'UPDATE dbo.CareLogs SET BloodPressure = COALESCE(BloodPressure, CONCAT(CONVERT(NVARCHAR(10), SystolicBp), N''/?'')) WHERE SystolicBp IS NOT NULL;';
ELSE IF COL_LENGTH(N'dbo.CareLogs', N'DiastolicBp') IS NOT NULL
    EXEC sys.sp_executesql N'UPDATE dbo.CareLogs SET BloodPressure = COALESCE(BloodPressure, CONCAT(N''?/'', CONVERT(NVARCHAR(10), DiastolicBp))) WHERE DiastolicBp IS NOT NULL;';

IF OBJECT_ID(N'dbo.BloodPressure', N'U') IS NOT NULL DROP TABLE dbo.BloodPressure;
IF OBJECT_ID(N'dbo.BloodGlucose', N'U') IS NOT NULL DROP TABLE dbo.BloodGlucose;
IF COL_LENGTH(N'dbo.CareLogs', N'SystolicBp') IS NOT NULL ALTER TABLE dbo.CareLogs DROP COLUMN SystolicBp;
IF COL_LENGTH(N'dbo.CareLogs', N'DiastolicBp') IS NOT NULL ALTER TABLE dbo.CareLogs DROP COLUMN DiastolicBp;

IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261104080000_AddCareLogBloodPressureAndGlucose')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261104080000_AddCareLogBloodPressureAndGlucose', '8.0.0');

COMMIT TRANSACTION;
