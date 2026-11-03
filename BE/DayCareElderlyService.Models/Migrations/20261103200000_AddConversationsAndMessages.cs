using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DayCareElderlyService.Models.Migrations;

[DbContext(typeof(Data.AppDbContext))]
[Migration("20261103200000_AddConversationsAndMessages")]
public sealed class AddConversationsAndMessages : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "Conversations",
            columns: table => new
            {
                ConversationId = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                ElderlyId = table.Column<int>(type: "int", nullable: false),
                FamilyUserId = table.Column<int>(type: "int", nullable: false),
                StaffUserId = table.Column<int>(type: "int", nullable: false),
                IsClosed = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false, defaultValueSql: "(sysdatetime())"),
                UpdatedAt = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: true),
                LastMessageAt = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Conversations", x => x.ConversationId);
                table.ForeignKey("FK_Conversations_ElderlyMembers", x => x.ElderlyId, "ElderlyMembers", "ElderlyId", onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_Conversations_FamilyUsers", x => x.FamilyUserId, "Users", "UserId", onDelete: ReferentialAction.NoAction);
                table.ForeignKey("FK_Conversations_StaffUsers", x => x.StaffUserId, "Users", "UserId", onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateTable(
            name: "Messages",
            columns: table => new
            {
                MessageId = table.Column<int>(type: "int", nullable: false)
                    .Annotation("SqlServer:Identity", "1, 1"),
                ConversationId = table.Column<int>(type: "int", nullable: false),
                SenderUserId = table.Column<int>(type: "int", nullable: false),
                Content = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                SentAt = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: false, defaultValueSql: "(sysdatetime())"),
                ReadAt = table.Column<DateTime>(type: "datetime2(0)", precision: 0, nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_Messages", x => x.MessageId);
                table.ForeignKey("FK_Messages_Conversations", x => x.ConversationId, "Conversations", "ConversationId", onDelete: ReferentialAction.Cascade);
                table.ForeignKey("FK_Messages_Users", x => x.SenderUserId, "Users", "UserId", onDelete: ReferentialAction.NoAction);
            });

        migrationBuilder.CreateIndex(
            name: "UQ_Conversations_Elderly_Family_Staff",
            table: "Conversations",
            columns: new[] { "ElderlyId", "FamilyUserId", "StaffUserId" },
            unique: true);

        migrationBuilder.CreateIndex(name: "IX_Conversations_LastMessageAt", table: "Conversations", column: "LastMessageAt");
        migrationBuilder.CreateIndex(name: "IX_Conversations_FamilyUserId", table: "Conversations", column: "FamilyUserId");
        migrationBuilder.CreateIndex(name: "IX_Conversations_StaffUserId", table: "Conversations", column: "StaffUserId");
        migrationBuilder.CreateIndex(name: "IX_Messages_Conversation_SentAt", table: "Messages", columns: new[] { "ConversationId", "SentAt" });
        migrationBuilder.CreateIndex(name: "IX_Messages_SenderUserId", table: "Messages", column: "SenderUserId");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "Messages");
        migrationBuilder.DropTable(name: "Conversations");
    }
}
