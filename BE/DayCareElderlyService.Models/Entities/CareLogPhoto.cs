using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class CareLogPhoto
{
    public Guid CareLogPhotoId { get; set; }

    public Guid CareLogId { get; set; }

    public string FileUrl { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public virtual CareLog CareLog { get; set; } = null!;
}
