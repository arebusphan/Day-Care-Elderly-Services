CREATE TABLE [ElderlyMembers] (
    [ElderlyId] int NOT NULL IDENTITY,
    [FullName] nvarchar(150) NOT NULL,
    [DateOfBirth] date NULL,
    [Gender] nvarchar(20) NULL,
    [Address] nvarchar(500) NULL,
    [EmergencyContactName] nvarchar(100) NULL,
    [EmergencyContactPhone] nvarchar(20) NULL,
    [Allergies] nvarchar(1000) NULL,
    [MedicalHistory] nvarchar(1000) NULL,
    [MedicalNotes] nvarchar(max) NULL,
    [MobilityStatus] nvarchar(50) NULL DEFAULT N'Bình thường',
    [ChronicConditions] nvarchar(200) NULL,
    [CareNotes] nvarchar(1000) NULL,
    [EmergencyNotes] nvarchar(max) NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2 NULL,
    CONSTRAINT [PK_ElderlyMembers] PRIMARY KEY ([ElderlyId])
);
GO


CREATE TABLE [MedicalSupplies] (
    [SupplyId] int NOT NULL IDENTITY,
    [SupplyName] nvarchar(200) NOT NULL,
    [Unit] nvarchar(50) NOT NULL,
    [MinimumStock] decimal(18,2) NOT NULL,
    [QuantityInStock] decimal(18,2) NOT NULL DEFAULT 0.0,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UnitPrice] decimal(18,2) NOT NULL DEFAULT 0.0,
    [ExpiryDate] date NULL,
    CONSTRAINT [PK_MedicalSupplies] PRIMARY KEY ([SupplyId])
);
GO


CREATE TABLE [Roles] (
    [RoleId] int NOT NULL IDENTITY,
    [RoleName] nvarchar(50) NOT NULL,
    [Description] nvarchar(255) NULL,
    CONSTRAINT [PK_Roles] PRIMARY KEY ([RoleId])
);
GO


CREATE TABLE [ServicePackages] (
    [PackageId] int NOT NULL IDENTITY,
    [PackageName] nvarchar(100) NOT NULL,
    [Description] nvarchar(max) NULL,
    [Price] decimal(18,2) NOT NULL,
    [BillingPeriod] nvarchar(30) NOT NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [PricePerDay] decimal(18,2) NOT NULL,
    [PriceMonth3Days] decimal(18,2) NOT NULL,
    [PriceMonthFullWeek] decimal(18,2) NOT NULL,
    [Highlights] nvarchar(2000) NULL,
    [IncludedServices] nvarchar(2000) NULL,
    [TargetAudience] nvarchar(500) NULL,
    [PricingNote] nvarchar(500) NULL,
    [TotalSlots] int NOT NULL,
    [EndOfLifeRoomIncluded] bit NOT NULL,
    CONSTRAINT [PK_ServicePackages] PRIMARY KEY ([PackageId])
);
GO


CREATE TABLE [Users] (
    [UserId] int NOT NULL IDENTITY,
    [Email] nvarchar(256) NOT NULL,
    [PasswordHash] nvarchar(500) NOT NULL,
    [FullName] nvarchar(150) NOT NULL,
    [PhoneNumber] nvarchar(20) NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2(0) NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([UserId])
);
GO


CREATE TABLE [AuthorizedPickupPersons] (
    [PickupPersonId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [FullName] nvarchar(150) NOT NULL,
    [Relationship] nvarchar(50) NULL,
    [PhoneNumber] nvarchar(20) NOT NULL,
    [IdCardLast4] nvarchar(4) NOT NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_AuthorizedPickupPersons] PRIMARY KEY ([PickupPersonId]),
    CONSTRAINT [FK_AuthorizedPickupPersons_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]) ON DELETE CASCADE
);
GO


CREATE TABLE [MedicationPlans] (
    [MedicationPlanId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [MedicationName] nvarchar(200) NOT NULL,
    [Dosage] nvarchar(100) NOT NULL,
    [Instructions] nvarchar(1000) NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_MedicationPlans] PRIMARY KEY ([MedicationPlanId]),
    CONSTRAINT [FK_MedicationPlans_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId])
);
GO


CREATE TABLE [PackageActivities] (
    [PackageActivityId] int NOT NULL IDENTITY,
    [PackageId] int NOT NULL,
    [ActivityTemplateId] int NULL,
    [DayOfWeek] tinyint NULL,
    [StartTime] time(0) NOT NULL,
    [EndTime] time(0) NOT NULL,
    [DisplayOrder] int NOT NULL,
    [IsActive] bit NOT NULL DEFAULT CAST(1 AS bit),
    [ActivityName] nvarchar(150) NOT NULL DEFAULT N'',
    [Purpose] nvarchar(500) NULL,
    [CareType] nvarchar(30) NOT NULL DEFAULT N'ACTIVITY',
    [TargetMinutes] int NULL,
    [PerformerRole] nvarchar(20) NOT NULL DEFAULT N'Any',
    [IsRequired] bit NOT NULL DEFAULT CAST(1 AS bit),
    [ConditionCode] nvarchar(30) NULL,
    [Source] nvarchar(200) NULL,
    CONSTRAINT [PK_PackageActivities] PRIMARY KEY ([PackageActivityId]),
    CONSTRAINT [FK_PackageActivities_Packages] FOREIGN KEY ([PackageId]) REFERENCES [ServicePackages] ([PackageId])
);
GO


CREATE TABLE [ServiceRegistrations] (
    [RegistrationId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [PackageId] int NOT NULL,
    [StartDate] date NOT NULL,
    [EndDate] date NULL,
    [PriceAtPurchase] decimal(18,2) NOT NULL,
    [Status] nvarchar(30) NOT NULL DEFAULT N'Pending',
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [RegistrationCode] nvarchar(50) NOT NULL,
    [RegistrationType] nvarchar(30) NOT NULL,
    [MonthlyPattern] nvarchar(30) NULL,
    [RoomType] nvarchar(30) NOT NULL,
    [TotalDays] int NOT NULL,
    [SupportSurcharge] decimal(18,2) NOT NULL,
    [RoomSurcharge] decimal(18,2) NOT NULL,
    [TotalAmount] decimal(18,2) NOT NULL,
    [SelectedDatesJson] nvarchar(4000) NULL,
    CONSTRAINT [PK_ServiceRegistrations] PRIMARY KEY ([RegistrationId]),
    CONSTRAINT [FK_ServiceRegistrations_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_ServiceRegistrations_Package] FOREIGN KEY ([PackageId]) REFERENCES [ServicePackages] ([PackageId])
);
GO


CREATE TABLE [AbsenceReports] (
    [AbsenceId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [AbsenceDate] date NOT NULL,
    [Reason] nvarchar(500) NULL,
    [ReportedBy] int NOT NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_AbsenceReports] PRIMARY KEY ([AbsenceId]),
    CONSTRAINT [FK_AbsenceReports_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]) ON DELETE CASCADE,
    CONSTRAINT [FK_AbsenceReports_Users] FOREIGN KEY ([ReportedBy]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [AuditLogs] (
    [AuditLogId] bigint NOT NULL IDENTITY,
    [ActorUserId] int NULL,
    [Action] nvarchar(100) NOT NULL,
    [EntityName] nvarchar(100) NOT NULL,
    [EntityId] nvarchar(100) NULL,
    [Details] nvarchar(max) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY ([AuditLogId]),
    CONSTRAINT [FK_AuditLogs_Users] FOREIGN KEY ([ActorUserId]) REFERENCES [Users] ([UserId]) ON DELETE SET NULL
);
GO


CREATE TABLE [CareLogs] (
    [CareLogId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [StaffId] int NOT NULL,
    [RecordedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [CareType] nvarchar(50) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [Notes] nvarchar(max) NULL,
    [Data] nvarchar(max) NULL,
    [BloodPressure] nvarchar(20) NULL,
    [BloodGlucose] decimal(5,2) NULL,
    [IsInternal] bit NOT NULL,
    [PackageActivityId] int NULL,
    CONSTRAINT [PK_CareLogs] PRIMARY KEY ([CareLogId]),
    CONSTRAINT [FK_CareLogs_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_CareLogs_PackageActivities] FOREIGN KEY ([PackageActivityId]) REFERENCES [PackageActivities] ([PackageActivityId]),
    CONSTRAINT [FK_CareLogs_Users] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [Conversations] (
    [ConversationId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [FamilyUserId] int NOT NULL,
    [StaffUserId] int NOT NULL,
    [IsClosed] bit NOT NULL DEFAULT CAST(0 AS bit),
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2(0) NULL,
    [LastMessageAt] datetime2(0) NULL,
    CONSTRAINT [PK_Conversations] PRIMARY KEY ([ConversationId]),
    CONSTRAINT [FK_Conversations_ElderlyMembers] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_Conversations_FamilyUsers] FOREIGN KEY ([FamilyUserId]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_Conversations_StaffUsers] FOREIGN KEY ([StaffUserId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [DailySchedulePlans] (
    [PlanId] int NOT NULL IDENTITY,
    [PlanDate] date NOT NULL,
    [Status] nvarchar(30) NOT NULL DEFAULT N'Draft',
    [ConfirmedAt] datetime2(0) NULL,
    [ConfirmedBy] int NULL,
    [TotalStaff] int NOT NULL,
    [TotalElderly] int NOT NULL,
    [Notes] nvarchar(1000) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2(0) NULL,
    CONSTRAINT [PK_DailySchedulePlans] PRIMARY KEY ([PlanId]),
    CONSTRAINT [FK_DailySchedulePlans_Users] FOREIGN KEY ([ConfirmedBy]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [FamilyMembers] (
    [FamilyMemberId] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [Address] nvarchar(500) NULL,
    [EmergencyContact] nvarchar(20) NULL,
    CONSTRAINT [PK_FamilyMembers] PRIMARY KEY ([FamilyMemberId]),
    CONSTRAINT [FK_FamilyMembers_Users] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [IncidentReports] (
    [IncidentId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [ReportedBy] int NOT NULL,
    [IncidentType] nvarchar(100) NOT NULL,
    [Severity] nvarchar(30) NOT NULL,
    [Description] nvarchar(max) NOT NULL,
    [OccurredAt] datetime2(0) NOT NULL,
    [ReportedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [Status] nvarchar(30) NOT NULL DEFAULT N'Open',
    [ResolutionNotes] nvarchar(max) NULL,
    [ResolvedAt] datetime2(0) NULL,
    [IsSupplyConfirmed] bit NOT NULL DEFAULT CAST(0 AS bit),
    [HandledBy] int NULL,
    [HandlingActions] nvarchar(2000) NULL,
    [HospitalName] nvarchar(200) NULL,
    [HospitalTransferAt] datetime2(0) NULL,
    [HospitalEscort] nvarchar(200) NULL,
    [PhotoUrls] nvarchar(max) NULL,
    [SupplyChargeAmount] decimal(18,2) NOT NULL DEFAULT 0.0,
    CONSTRAINT [PK_IncidentReports] PRIMARY KEY ([IncidentId]),
    CONSTRAINT [FK_IncidentReports_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_IncidentReports_HandledBy] FOREIGN KEY ([HandledBy]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_IncidentReports_Users] FOREIGN KEY ([ReportedBy]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [Notifications] (
    [NotificationId] int NOT NULL IDENTITY,
    [UserId] int NOT NULL,
    [Title] nvarchar(200) NOT NULL,
    [Message] nvarchar(max) NOT NULL,
    [NotificationType] nvarchar(50) NOT NULL,
    [RelatedEntityType] nvarchar(100) NULL,
    [RelatedEntityId] int NULL,
    [IsRead] bit NOT NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_Notifications] PRIMARY KEY ([NotificationId]),
    CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [StaffProfiles] (
    [UserId] int NOT NULL,
    [Position] nvarchar(100) NULL,
    [Qualification] nvarchar(300) NULL,
    [StartDate] date NULL,
    [UpdatedAt] datetime2(0) NULL,
    CONSTRAINT [PK_StaffProfiles] PRIMARY KEY ([UserId]),
    CONSTRAINT [FK_StaffProfiles_Users] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId]) ON DELETE CASCADE
);
GO


CREATE TABLE [StaffRequests] (
    [RequestId] int NOT NULL IDENTITY,
    [StaffId] int NOT NULL,
    [RequestType] nvarchar(20) NOT NULL,
    [RequestDate] date NOT NULL,
    [SwapWithStaffId] int NULL,
    [Reason] nvarchar(500) NULL,
    [Status] nvarchar(20) NOT NULL DEFAULT N'Pending',
    [ReviewedBy] int NULL,
    [ReviewedAt] datetime2(0) NULL,
    [ReviewNote] nvarchar(500) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_StaffRequests] PRIMARY KEY ([RequestId]),
    CONSTRAINT [FK_StaffRequests_Reviewer] FOREIGN KEY ([ReviewedBy]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_StaffRequests_Staff] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_StaffRequests_SwapStaff] FOREIGN KEY ([SwapWithStaffId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [StaffSchedules] (
    [ScheduleId] int NOT NULL IDENTITY,
    [StaffId] int NOT NULL,
    [WorkDate] date NOT NULL,
    [IsWorking] bit NOT NULL DEFAULT CAST(1 AS bit),
    [Availability] nvarchar(20) NOT NULL DEFAULT N'Working',
    [Note] nvarchar(500) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_StaffSchedules] PRIMARY KEY ([ScheduleId]),
    CONSTRAINT [FK_StaffSchedules_Users] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId]) ON DELETE CASCADE
);
GO


CREATE TABLE [UserRoles] (
    [UserId] int NOT NULL,
    [RoleId] int NOT NULL,
    CONSTRAINT [PK_UserRoles] PRIMARY KEY ([UserId], [RoleId]),
    CONSTRAINT [FK_UserRoles_Roles] FOREIGN KEY ([RoleId]) REFERENCES [Roles] ([RoleId]),
    CONSTRAINT [FK_UserRoles_Users] FOREIGN KEY ([UserId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [MedicationRecords] (
    [MedicationRecordId] int NOT NULL IDENTITY,
    [MedicationPlanId] int NOT NULL,
    [StaffId] int NULL,
    [ScheduledAt] datetime2(0) NOT NULL,
    [RecordedAt] datetime2(0) NULL,
    [Status] nvarchar(30) NOT NULL DEFAULT N'Pending',
    [Notes] nvarchar(1000) NULL,
    CONSTRAINT [PK_MedicationRecords] PRIMARY KEY ([MedicationRecordId]),
    CONSTRAINT [FK_MedicationRecords_Plans] FOREIGN KEY ([MedicationPlanId]) REFERENCES [MedicationPlans] ([MedicationPlanId]),
    CONSTRAINT [FK_MedicationRecords_Users] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [AttendanceRecords] (
    [AttendanceId] int NOT NULL IDENTITY,
    [ElderlyId] int NOT NULL,
    [RegistrationId] int NULL,
    [AttendanceDate] date NOT NULL,
    [Status] nvarchar(30) NOT NULL DEFAULT N'Present',
    [CheckInTime] time NULL,
    [CheckOutTime] time NULL,
    [CheckInAt] datetime2 NULL,
    [CheckOutAt] datetime2 NULL,
    [CheckedInBy] int NULL,
    [CheckedOutBy] int NULL,
    [Notes] nvarchar(500) NULL,
    [CreatedAt] datetime2 NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2 NULL,
    [UpdatedBy] int NULL,
    [CorrectionReason] nvarchar(500) NULL,
    [PickupPersonId] int NULL,
    CONSTRAINT [PK_AttendanceRecords] PRIMARY KEY ([AttendanceId]),
    CONSTRAINT [FK_AttendanceRecords_CheckedInBy_Users] FOREIGN KEY ([CheckedInBy]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_AttendanceRecords_CheckedOutBy_Users] FOREIGN KEY ([CheckedOutBy]) REFERENCES [Users] ([UserId]),
    CONSTRAINT [FK_AttendanceRecords_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_AttendanceRecords_PickupPerson] FOREIGN KEY ([PickupPersonId]) REFERENCES [AuthorizedPickupPersons] ([PickupPersonId]),
    CONSTRAINT [FK_AttendanceRecords_Registration] FOREIGN KEY ([RegistrationId]) REFERENCES [ServiceRegistrations] ([RegistrationId])
);
GO


CREATE TABLE [Invoices] (
    [InvoiceId] int NOT NULL IDENTITY,
    [RegistrationId] int NOT NULL,
    [InvoiceNo] nvarchar(50) NOT NULL,
    [InvoiceVatNo] nvarchar(50) NULL,
    [TotalAmount] decimal(18,2) NOT NULL,
    [Status] nvarchar(30) NOT NULL DEFAULT N'Pending',
    [IssuedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [DueAt] datetime2(0) NULL,
    CONSTRAINT [PK_Invoices] PRIMARY KEY ([InvoiceId]),
    CONSTRAINT [FK_Invoices_ServiceRegistrations] FOREIGN KEY ([RegistrationId]) REFERENCES [ServiceRegistrations] ([RegistrationId])
);
GO


CREATE TABLE [CareLogPhotos] (
    [CareLogPhotoId] int NOT NULL IDENTITY,
    [CareLogId] int NOT NULL,
    [FileUrl] nvarchar(1000) NOT NULL,
    [UploadedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_CareLogPhotos] PRIMARY KEY ([CareLogPhotoId]),
    CONSTRAINT [FK_CareLogPhotos_CareLogs] FOREIGN KEY ([CareLogId]) REFERENCES [CareLogs] ([CareLogId])
);
GO


CREATE TABLE [Messages] (
    [MessageId] int NOT NULL IDENTITY,
    [ConversationId] int NOT NULL,
    [SenderUserId] int NOT NULL,
    [Content] nvarchar(4000) NOT NULL,
    [SentAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [ReadAt] datetime2(0) NULL,
    CONSTRAINT [PK_Messages] PRIMARY KEY ([MessageId]),
    CONSTRAINT [FK_Messages_Conversations] FOREIGN KEY ([ConversationId]) REFERENCES [Conversations] ([ConversationId]) ON DELETE CASCADE,
    CONSTRAINT [FK_Messages_Users] FOREIGN KEY ([SenderUserId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [DailyAttendanceForecasts] (
    [ForecastId] int NOT NULL IDENTITY,
    [PlanId] int NOT NULL,
    [ElderlyId] int NOT NULL,
    [AttendanceStatus] nvarchar(20) NOT NULL DEFAULT N'Attending',
    [Reason] nvarchar(500) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [UpdatedAt] datetime2(0) NULL,
    CONSTRAINT [PK_DailyAttendanceForecasts] PRIMARY KEY ([ForecastId]),
    CONSTRAINT [FK_DailyAttendanceForecast_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]) ON DELETE CASCADE,
    CONSTRAINT [FK_DailyAttendanceForecast_Plans] FOREIGN KEY ([PlanId]) REFERENCES [DailySchedulePlans] ([PlanId]) ON DELETE CASCADE
);
GO


CREATE TABLE [DailyCareGroups] (
    [GroupId] int NOT NULL IDENTITY,
    [PlanId] int NOT NULL,
    [GroupName] nvarchar(100) NOT NULL,
    [GroupType] nvarchar(20) NOT NULL DEFAULT N'Normal',
    [StaffId] int NULL,
    [MaxNormalCapacity] int NOT NULL DEFAULT 10,
    [MaxSupportCapacity] int NOT NULL DEFAULT 4,
    [Notes] nvarchar(500) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_DailyCareGroups] PRIMARY KEY ([GroupId]),
    CONSTRAINT [FK_DailyCareGroups_Plans] FOREIGN KEY ([PlanId]) REFERENCES [DailySchedulePlans] ([PlanId]) ON DELETE CASCADE,
    CONSTRAINT [FK_DailyCareGroups_Users] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [StaffCareAssignments] (
    [AssignmentId] int NOT NULL IDENTITY,
    [PlanId] int NOT NULL,
    [StaffId] int NOT NULL,
    [ElderlyId] int NOT NULL,
    [Notes] nvarchar(500) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    CONSTRAINT [PK_StaffCareAssignments] PRIMARY KEY ([AssignmentId]),
    CONSTRAINT [FK_StaffCareAssignments_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_StaffCareAssignments_Plans] FOREIGN KEY ([PlanId]) REFERENCES [DailySchedulePlans] ([PlanId]) ON DELETE CASCADE,
    CONSTRAINT [FK_StaffCareAssignments_Users] FOREIGN KEY ([StaffId]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [ElderlyFamilyRelationships] (
    [ElderlyId] int NOT NULL,
    [FamilyMemberId] int NOT NULL,
    [Relationship] nvarchar(50) NOT NULL,
    [IsPrimaryContact] bit NOT NULL,
    [CanViewCareLogs] bit NOT NULL DEFAULT CAST(1 AS bit),
    [CanReceiveNotifications] bit NOT NULL DEFAULT CAST(1 AS bit),
    CONSTRAINT [PK_ElderlyFamilyRelationships] PRIMARY KEY ([ElderlyId], [FamilyMemberId]),
    CONSTRAINT [FK_EFR_ElderlyMembers] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_EFR_FamilyMembers] FOREIGN KEY ([FamilyMemberId]) REFERENCES [FamilyMembers] ([FamilyMemberId])
);
GO


CREATE TABLE [SupplyTransactions] (
    [SupplyTransactionId] int NOT NULL IDENTITY,
    [IncidentId] int NULL,
    [UnitPrice] decimal(18,2) NULL,
    [SupplyId] int NOT NULL,
    [TransactionType] nvarchar(30) NOT NULL,
    [Quantity] decimal(18,2) NOT NULL,
    [OccurredAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [RecordedBy] int NOT NULL,
    [Notes] nvarchar(1000) NULL,
    CONSTRAINT [PK_SupplyTransactions] PRIMARY KEY ([SupplyTransactionId]),
    CONSTRAINT [FK_SupplyTransactions_IncidentReports] FOREIGN KEY ([IncidentId]) REFERENCES [IncidentReports] ([IncidentId]),
    CONSTRAINT [FK_SupplyTransactions_Supplies] FOREIGN KEY ([SupplyId]) REFERENCES [MedicalSupplies] ([SupplyId]),
    CONSTRAINT [FK_SupplyTransactions_Users] FOREIGN KEY ([RecordedBy]) REFERENCES [Users] ([UserId])
);
GO


CREATE TABLE [Payments] (
    [PaymentId] int NOT NULL IDENTITY,
    [RegistrationId] int NOT NULL,
    [InvoiceId] int NULL,
    [Amount] decimal(18,2) NOT NULL,
    [PaymentMethod] nvarchar(100) NOT NULL,
    [PaymentStatus] nvarchar(30) NOT NULL DEFAULT N'Pending',
    [TransactionReference] nvarchar(200) NULL,
    [PaidAt] datetime2(0) NULL,
    [CreatedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [InvoiceNo] nvarchar(50) NULL,
    [InvoiceVatNo] nvarchar(50) NULL,
    CONSTRAINT [PK_Payments] PRIMARY KEY ([PaymentId]),
    CONSTRAINT [FK_Payments_Invoices] FOREIGN KEY ([InvoiceId]) REFERENCES [Invoices] ([InvoiceId]),
    CONSTRAINT [FK_Payments_ServiceRegistrations] FOREIGN KEY ([RegistrationId]) REFERENCES [ServiceRegistrations] ([RegistrationId])
);
GO


CREATE TABLE [CareGroupMembers] (
    [GroupMemberId] int NOT NULL IDENTITY,
    [GroupId] int NOT NULL,
    [ElderlyId] int NOT NULL,
    [AssignedAt] datetime2(0) NOT NULL DEFAULT ((sysdatetime())),
    [Notes] nvarchar(500) NULL,
    CONSTRAINT [PK_CareGroupMembers] PRIMARY KEY ([GroupMemberId]),
    CONSTRAINT [FK_CareGroupMembers_Elderly] FOREIGN KEY ([ElderlyId]) REFERENCES [ElderlyMembers] ([ElderlyId]),
    CONSTRAINT [FK_CareGroupMembers_Groups] FOREIGN KEY ([GroupId]) REFERENCES [DailyCareGroups] ([GroupId]) ON DELETE CASCADE
);
GO


CREATE INDEX [IX_AbsenceReports_ReportedBy] ON [AbsenceReports] ([ReportedBy]);
GO


CREATE UNIQUE INDEX [UQ_AbsenceReports_ElderlyDate] ON [AbsenceReports] ([ElderlyId], [AbsenceDate]);
GO


CREATE INDEX [IX_AttendanceRecords_CheckedInBy] ON [AttendanceRecords] ([CheckedInBy]);
GO


CREATE INDEX [IX_AttendanceRecords_CheckedOutBy] ON [AttendanceRecords] ([CheckedOutBy]);
GO


CREATE INDEX [IX_AttendanceRecords_Date] ON [AttendanceRecords] ([AttendanceDate]);
GO


CREATE INDEX [IX_AttendanceRecords_PickupPersonId] ON [AttendanceRecords] ([PickupPersonId]);
GO


CREATE INDEX [IX_AttendanceRecords_RegistrationId] ON [AttendanceRecords] ([RegistrationId]);
GO


CREATE UNIQUE INDEX [UX_AttendanceRecords_Elderly_Date] ON [AttendanceRecords] ([ElderlyId], [AttendanceDate]);
GO


CREATE INDEX [IX_AuditLogs_Actor_CreatedAt] ON [AuditLogs] ([ActorUserId], [CreatedAt]);
GO


CREATE INDEX [IX_AuditLogs_Entity_CreatedAt] ON [AuditLogs] ([EntityName], [EntityId], [CreatedAt]);
GO


CREATE INDEX [IX_AuthorizedPickupPersons_ElderlyId] ON [AuthorizedPickupPersons] ([ElderlyId]);
GO


CREATE INDEX [IX_CareGroupMembers_ElderlyId] ON [CareGroupMembers] ([ElderlyId]);
GO


CREATE INDEX [IX_CareGroupMembers_GroupId] ON [CareGroupMembers] ([GroupId]);
GO


CREATE UNIQUE INDEX [UQ_CareGroupMembers_Group_Elderly] ON [CareGroupMembers] ([GroupId], [ElderlyId]);
GO


CREATE INDEX [IX_CareLogPhotos_CareLogId] ON [CareLogPhotos] ([CareLogId]);
GO


CREATE INDEX [IX_CareLogs_ElderlyRecordedAt] ON [CareLogs] ([ElderlyId], [RecordedAt] DESC);
GO


CREATE INDEX [IX_CareLogs_StaffId] ON [CareLogs] ([StaffId]);
GO


CREATE INDEX [IX_CareLogs_PackageActivityId] ON [CareLogs] ([PackageActivityId]);
GO


CREATE INDEX [IX_Conversations_FamilyUserId] ON [Conversations] ([FamilyUserId]);
GO


CREATE INDEX [IX_Conversations_LastMessageAt] ON [Conversations] ([LastMessageAt]);
GO


CREATE INDEX [IX_Conversations_StaffUserId] ON [Conversations] ([StaffUserId]);
GO


CREATE UNIQUE INDEX [UQ_Conversations_Elderly_Family_Staff] ON [Conversations] ([ElderlyId], [FamilyUserId], [StaffUserId]);
GO


CREATE INDEX [IX_DailyAttendanceForecast_PlanId] ON [DailyAttendanceForecasts] ([PlanId]);
GO


CREATE INDEX [IX_DailyAttendanceForecasts_ElderlyId] ON [DailyAttendanceForecasts] ([ElderlyId]);
GO


CREATE UNIQUE INDEX [UQ_DailyAttendanceForecast_Plan_Elderly] ON [DailyAttendanceForecasts] ([PlanId], [ElderlyId]);
GO


CREATE INDEX [IX_DailyCareGroups_PlanId] ON [DailyCareGroups] ([PlanId]);
GO


CREATE INDEX [IX_DailyCareGroups_StaffId] ON [DailyCareGroups] ([StaffId]);
GO


CREATE INDEX [IX_DailySchedulePlans_ConfirmedBy] ON [DailySchedulePlans] ([ConfirmedBy]);
GO


CREATE UNIQUE INDEX [UQ_DailySchedulePlans_Date] ON [DailySchedulePlans] ([PlanDate]);
GO


CREATE INDEX [IX_ElderlyFamilyRelationships_FamilyMemberId] ON [ElderlyFamilyRelationships] ([FamilyMemberId]);
GO


CREATE UNIQUE INDEX [UQ_FamilyMembers_UserId] ON [FamilyMembers] ([UserId]);
GO


CREATE INDEX [IX_IncidentReports_ElderlyId] ON [IncidentReports] ([ElderlyId]);
GO


CREATE INDEX [IX_IncidentReports_HandledBy] ON [IncidentReports] ([HandledBy]);
GO


CREATE INDEX [IX_IncidentReports_ReportedBy] ON [IncidentReports] ([ReportedBy]);
GO


CREATE INDEX [IX_IncidentReports_Status] ON [IncidentReports] ([Status]);
GO


CREATE INDEX [IX_Invoices_InvoiceNo] ON [Invoices] ([InvoiceNo]);
GO


CREATE UNIQUE INDEX [UQ_Invoices_RegistrationId] ON [Invoices] ([RegistrationId]);
GO


CREATE INDEX [IX_MedicationPlans_ElderlyId] ON [MedicationPlans] ([ElderlyId]);
GO


CREATE INDEX [IX_MedicationRecords_PlanScheduledAt] ON [MedicationRecords] ([MedicationPlanId], [ScheduledAt]);
GO


CREATE INDEX [IX_MedicationRecords_StaffId] ON [MedicationRecords] ([StaffId]);
GO


CREATE INDEX [IX_Messages_Conversation_SentAt] ON [Messages] ([ConversationId], [SentAt]);
GO


CREATE INDEX [IX_Messages_SenderUserId] ON [Messages] ([SenderUserId]);
GO


CREATE INDEX [IX_Notifications_UserReadCreated] ON [Notifications] ([UserId], [IsRead], [CreatedAt] DESC);
GO


CREATE INDEX [IX_PackageActivities_PackageId] ON [PackageActivities] ([PackageId]);
GO


CREATE INDEX [IX_Payments_InvoiceId] ON [Payments] ([InvoiceId]);
GO


CREATE INDEX [IX_Payments_RegistrationId] ON [Payments] ([RegistrationId]);
GO


CREATE UNIQUE INDEX [UQ_Roles_RoleName] ON [Roles] ([RoleName]);
GO


CREATE INDEX [IX_ServiceRegistrations_ElderlyId] ON [ServiceRegistrations] ([ElderlyId]);
GO


CREATE INDEX [IX_ServiceRegistrations_PackageId] ON [ServiceRegistrations] ([PackageId]);
GO


CREATE INDEX [IX_StaffCareAssignments_ElderlyId] ON [StaffCareAssignments] ([ElderlyId]);
GO


CREATE INDEX [IX_StaffCareAssignments_Plan_Staff] ON [StaffCareAssignments] ([PlanId], [StaffId]);
GO


CREATE INDEX [IX_StaffCareAssignments_StaffId] ON [StaffCareAssignments] ([StaffId]);
GO


CREATE UNIQUE INDEX [UQ_StaffCareAssignments_Plan_Elderly] ON [StaffCareAssignments] ([PlanId], [ElderlyId]);
GO


CREATE INDEX [IX_StaffRequests_ReviewedBy] ON [StaffRequests] ([ReviewedBy]);
GO


CREATE INDEX [IX_StaffRequests_StaffDate] ON [StaffRequests] ([StaffId], [RequestDate]);
GO


CREATE INDEX [IX_StaffRequests_SwapWithStaffId] ON [StaffRequests] ([SwapWithStaffId]);
GO


CREATE INDEX [IX_StaffSchedules_StaffId] ON [StaffSchedules] ([StaffId]);
GO


CREATE INDEX [IX_StaffSchedules_WorkDate] ON [StaffSchedules] ([WorkDate]);
GO


CREATE UNIQUE INDEX [UQ_StaffSchedules_Staff_Date] ON [StaffSchedules] ([StaffId], [WorkDate]);
GO


CREATE INDEX [IX_SupplyTransactions_IncidentId] ON [SupplyTransactions] ([IncidentId]);
GO


CREATE INDEX [IX_SupplyTransactions_RecordedBy] ON [SupplyTransactions] ([RecordedBy]);
GO


CREATE INDEX [IX_SupplyTransactions_SupplyOccurredAt] ON [SupplyTransactions] ([SupplyId], [OccurredAt] DESC);
GO


CREATE INDEX [IX_UserRoles_RoleId] ON [UserRoles] ([RoleId]);
GO


CREATE UNIQUE INDEX [UQ_Users_Email] ON [Users] ([Email]);
GO


