SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @sql NVARCHAR(MAX) = N'';

SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(fkc.parent_object_id)) + N'.'
    + QUOTENAME(OBJECT_NAME(fkc.parent_object_id)) + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
FROM (
    SELECT DISTINCT fk.object_id, fk.name, fkc.parent_object_id
    FROM sys.foreign_keys fk
    JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    JOIN sys.columns pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id
    JOIN sys.columns rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id
    WHERE pc.name = N'CenterId' OR rc.name = N'CenterId'
) fkc
JOIN sys.foreign_keys fk ON fk.object_id = fkc.object_id;
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

SET @sql = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
    + N' DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
FROM sys.key_constraints kc
JOIN sys.tables t ON t.object_id = kc.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.index_columns ic ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE c.name = N'CenterId';
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

SET @sql = N'';
SELECT @sql = @sql + N'DROP INDEX ' + QUOTENAME(i.name) + N' ON '
    + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + N';'
FROM sys.indexes i
JOIN sys.tables t ON t.object_id = i.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
WHERE c.name = N'CenterId' AND i.name IS NOT NULL
  AND i.is_primary_key = 0 AND i.is_unique_constraint = 0;
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

SET @sql = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
    + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
FROM sys.default_constraints dc
JOIN sys.tables t ON t.object_id = dc.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.columns c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE c.name = N'CenterId';
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

SET @sql = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
    + N' DROP CONSTRAINT ' + QUOTENAME(ch.name) + N';'
FROM sys.check_constraints ch
JOIN sys.tables t ON t.object_id = ch.parent_object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE ch.definition LIKE N'%CenterId%';
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

SET @sql = N'';
SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name)
    + N' DROP COLUMN ' + QUOTENAME(c.name) + N';'
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
WHERE c.name = N'CenterId';
IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

IF OBJECT_ID(N'dbo.Centers', N'U') IS NOT NULL
    DROP TABLE dbo.Centers;

COMMIT TRANSACTION;
