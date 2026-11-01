using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using DayCareElderlyService.BLL.Common;
using DayCareElderlyService.Models.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace DayCareElderlyService.API.Controllers;

public class CenterElderlyItemDto
{
    public int ElderlyId { get; set; }
    public string MemberCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public DateOnly? DateOfBirth { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string MobilityStatus { get; set; } = "Normal";
    public string? Allergies { get; set; }
    public string? MedicalHistory { get; set; }
    public string? MedicalNotes { get; set; }
    public string? CareNotes { get; set; }
    public string? ServicePackageName { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

[ApiController]
[Route("api/center/elderly")]
[Authorize(Roles = "Center,CenterManager,Admin")]
public class CenterElderlyController : ControllerBase
{
    private readonly AppDbContext _context;

    public CenterElderlyController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetCenterElderlyList([FromQuery] string? search, [FromQuery] string? mobilityStatus)
    {
        var query = _context.ElderlyMembers
            .Include(e => e.ServiceRegistrations)
                .ThenInclude(sr => sr.Package)
            .Where(e => e.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(e => e.FullName.ToLower().Contains(term) ||
                                     e.EmergencyContactName!.ToLower().Contains(term) ||
                                     e.ElderlyId.ToString().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(mobilityStatus) && mobilityStatus != "all")
        {
            var isSupport = mobilityStatus.Equals("Support", StringComparison.OrdinalIgnoreCase);
            if (isSupport)
            {
                query = query.Where(e => e.MobilityStatus == "Support" || e.MobilityStatus == "Cần hỗ trợ");
            }
            else
            {
                query = query.Where(e => e.MobilityStatus == "Normal" || e.MobilityStatus == "Bình thường" || string.IsNullOrEmpty(e.MobilityStatus));
            }
        }

        var list = await query
            .OrderBy(e => e.MobilityStatus == "Support" ? 0 : 1)
            .ThenBy(e => e.FullName)
            .ToListAsync();

        var now = DateTime.UtcNow;
        var result = list.Select(e =>
        {
            int? age = null;
            if (e.DateOfBirth.HasValue)
            {
                age = now.Year - e.DateOfBirth.Value.Year;
                if (now.Month < e.DateOfBirth.Value.Month ||
                    (now.Month == e.DateOfBirth.Value.Month && now.Day < e.DateOfBirth.Value.Day))
                {
                    age--;
                }
            }

            var activePkg = e.ServiceRegistrations.FirstOrDefault(r => r.Status == "Confirmed")?.Package?.PackageName ?? "Gói Cơ bản";
            var mob = string.Equals(e.MobilityStatus?.Trim(), "Support", StringComparison.OrdinalIgnoreCase) ? "Support" : "Normal";

            return new CenterElderlyItemDto
            {
                ElderlyId = e.ElderlyId,
                MemberCode = $"ELD-{e.ElderlyId:D4}",
                FullName = e.FullName,
                DateOfBirth = e.DateOfBirth,
                Age = age,
                Gender = e.Gender,
                Address = e.Address,
                EmergencyContactName = e.EmergencyContactName,
                EmergencyContactPhone = e.EmergencyContactPhone,
                MobilityStatus = mob,
                Allergies = e.Allergies,
                MedicalHistory = e.MedicalHistory,
                MedicalNotes = e.MedicalNotes,
                CareNotes = e.CareNotes,
                ServicePackageName = activePkg,
                IsActive = e.IsActive,
                CreatedAt = e.CreatedAt
            };
        }).ToList();

        return Ok(ApiResponse<List<CenterElderlyItemDto>>.Ok(result));
    }
}

