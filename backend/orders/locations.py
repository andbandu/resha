from __future__ import annotations

SRI_LANKA_PROVINCE_DISTRICTS: dict[str, tuple[str, ...]] = {
    "Central Province": ("Kandy", "Matale", "Nuwara Eliya"),
    "Eastern Province": ("Ampara", "Batticaloa", "Trincomalee"),
    "North Central Province": ("Anuradhapura", "Polonnaruwa"),
    "North Western Province": ("Kurunegala", "Puttalam"),
    "Northern Province": ("Jaffna", "Kilinochchi", "Mannar", "Mullaitivu", "Vavuniya"),
    "Sabaragamuwa Province": ("Kegalle", "Ratnapura"),
    "Southern Province": ("Galle", "Hambantota", "Matara"),
    "Uva Province": ("Badulla", "Monaragala"),
    "Western Province": ("Colombo", "Gampaha", "Kalutara"),
}

SRI_LANKA_PROVINCES: tuple[str, ...] = tuple(SRI_LANKA_PROVINCE_DISTRICTS.keys())

SRI_LANKA_DISTRICTS: tuple[str, ...] = tuple(
    district
    for districts in SRI_LANKA_PROVINCE_DISTRICTS.values()
    for district in districts
)
