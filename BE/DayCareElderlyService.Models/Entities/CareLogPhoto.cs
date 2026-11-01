using System;
using System.Collections.Generic;

namespace DayCareElderlyService.Models.Entities;

public partial class CareLogPhoto
{
    public int CareLogPhotoId { get; set; }

    public int CareLogId { get; set; }

    public string FileUrl { get; set; } = null!;

    public DateTime UploadedAt { get; set; }

    public virtual CareLog CareLog { get; set; } = null!;
}
