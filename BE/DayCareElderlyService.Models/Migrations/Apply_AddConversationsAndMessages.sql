SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF OBJECT_ID(N'dbo.Conversations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Conversations (
        ConversationId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Conversations PRIMARY KEY,
        ElderlyId INT NOT NULL,
        FamilyUserId INT NOT NULL,
        StaffUserId INT NOT NULL,
        IsClosed BIT NOT NULL CONSTRAINT DF_Conversations_IsClosed DEFAULT 0,
        CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Conversations_CreatedAt DEFAULT SYSDATETIME(),
        UpdatedAt DATETIME2(0) NULL,
        LastMessageAt DATETIME2(0) NULL,
        CONSTRAINT FK_Conversations_ElderlyMembers FOREIGN KEY (ElderlyId) REFERENCES dbo.ElderlyMembers(ElderlyId),
        CONSTRAINT FK_Conversations_FamilyUsers FOREIGN KEY (FamilyUserId) REFERENCES dbo.Users(UserId),
        CONSTRAINT FK_Conversations_StaffUsers FOREIGN KEY (StaffUserId) REFERENCES dbo.Users(UserId)
    );

    CREATE UNIQUE INDEX UQ_Conversations_Elderly_Family_Staff ON dbo.Conversations(ElderlyId, FamilyUserId, StaffUserId);
    CREATE INDEX IX_Conversations_LastMessageAt ON dbo.Conversations(LastMessageAt);
    CREATE INDEX IX_Conversations_FamilyUserId ON dbo.Conversations(FamilyUserId);
    CREATE INDEX IX_Conversations_StaffUserId ON dbo.Conversations(StaffUserId);
END;

IF OBJECT_ID(N'dbo.Messages', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Messages (
        MessageId INT IDENTITY(1,1) NOT NULL CONSTRAINT PK_Messages PRIMARY KEY,
        ConversationId INT NOT NULL,
        SenderUserId INT NOT NULL,
        Content NVARCHAR(4000) NOT NULL,
        SentAt DATETIME2(0) NOT NULL CONSTRAINT DF_Messages_SentAt DEFAULT SYSDATETIME(),
        ReadAt DATETIME2(0) NULL,
        CONSTRAINT FK_Messages_Conversations FOREIGN KEY (ConversationId) REFERENCES dbo.Conversations(ConversationId) ON DELETE CASCADE,
        CONSTRAINT FK_Messages_Users FOREIGN KEY (SenderUserId) REFERENCES dbo.Users(UserId)
    );

    CREATE INDEX IX_Messages_Conversation_SentAt ON dbo.Messages(ConversationId, SentAt);
    CREATE INDEX IX_Messages_SenderUserId ON dbo.Messages(SenderUserId);
END;

IF OBJECT_ID(N'dbo.__EFMigrationsHistory', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.__EFMigrationsHistory (
        MigrationId nvarchar(150) NOT NULL CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY,
        ProductVersion nvarchar(32) NOT NULL
    );
END;

IF NOT EXISTS (SELECT 1 FROM dbo.__EFMigrationsHistory WHERE MigrationId = '20261103200000_AddConversationsAndMessages')
    INSERT INTO dbo.__EFMigrationsHistory (MigrationId, ProductVersion)
    VALUES ('20261103200000_AddConversationsAndMessages', '8.0.0');

COMMIT TRANSACTION;
