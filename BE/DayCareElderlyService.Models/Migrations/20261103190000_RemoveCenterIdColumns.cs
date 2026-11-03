using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103190000_RemoveCenterIdColumns")]
public sealed class RemoveCenterIdColumns : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            DECLARE @sql NVARCHAR(MAX) = N'';

            -- Remove every foreign key that uses a CenterId column on either side.
            SELECT @sql = @sql + N'ALTER TABLE '
                + QUOTENAME(OBJECT_SCHEMA_NAME(fkc.parent_object_id)) + N'.'
                + QUOTENAME(OBJECT_NAME(fkc.parent_object_id))
                + N' DROP CONSTRAINT ' + QUOTENAME(fk.name) + N';'
            FROM (
                SELECT DISTINCT fk.object_id, fk.name, fkc.parent_object_id
                FROM sys.foreign_keys fk
                JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
                JOIN sys.columns parentColumn
                  ON parentColumn.object_id = fkc.parent_object_id
                 AND parentColumn.column_id = fkc.parent_column_id
                JOIN sys.columns referencedColumn
                  ON referencedColumn.object_id = fkc.referenced_object_id
                 AND referencedColumn.column_id = fkc.referenced_column_id
                WHERE parentColumn.name = N'CenterId' OR referencedColumn.name = N'CenterId'
            ) fkc
            JOIN sys.foreign_keys fk ON fk.object_id = fkc.object_id;

            IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

            SET @sql = N'';
            -- Drop key constraints (primary/unique) that include CenterId.
            SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.'
                + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(kc.name) + N';'
            FROM sys.key_constraints kc
            JOIN sys.tables t ON t.object_id = kc.parent_object_id
            JOIN sys.schemas s ON s.schema_id = t.schema_id
            JOIN sys.index_columns ic
              ON ic.object_id = kc.parent_object_id AND ic.index_id = kc.unique_index_id
            JOIN sys.columns c
              ON c.object_id = ic.object_id AND c.column_id = ic.column_id
            WHERE c.name = N'CenterId';

            IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

            SET @sql = N'';
            -- Drop remaining indexes that include CenterId.
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
            SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.'
                + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(dc.name) + N';'
            FROM sys.default_constraints dc
            JOIN sys.tables t ON t.object_id = dc.parent_object_id
            JOIN sys.schemas s ON s.schema_id = t.schema_id
            JOIN sys.columns c
              ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
            WHERE c.name = N'CenterId';

            IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

            SET @sql = N'';
            -- Remove table-level checks that mention the removed field.
            SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.'
                + QUOTENAME(t.name) + N' DROP CONSTRAINT ' + QUOTENAME(ch.name) + N';'
            FROM sys.check_constraints ch
            JOIN sys.tables t ON t.object_id = ch.parent_object_id
            JOIN sys.schemas s ON s.schema_id = t.schema_id
            WHERE ch.definition LIKE N'%CenterId%';

            IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

            SET @sql = N'';
            SELECT @sql = @sql + N'ALTER TABLE ' + QUOTENAME(s.name) + N'.'
                + QUOTENAME(t.name) + N' DROP COLUMN ' + QUOTENAME(c.name) + N';'
            FROM sys.columns c
            JOIN sys.tables t ON t.object_id = c.object_id
            JOIN sys.schemas s ON s.schema_id = t.schema_id
            WHERE c.name = N'CenterId';

            IF LEN(@sql) > 0 EXEC sys.sp_executesql @sql;

            -- Centers is no longer represented by the application model.
            IF OBJECT_ID(N'dbo.Centers', N'U') IS NOT NULL
                DROP TABLE dbo.Centers;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        throw new NotSupportedException("CenterId columns and their values were removed; they cannot be restored automatically.");
    }
}
