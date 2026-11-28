export const SRI_LANKA_PROVINCE_DISTRICTS = {
  "Central Province": ["Kandy", "Matale", "Nuwara Eliya"],
  "Eastern Province": ["Ampara", "Batticaloa", "Trincomalee"],
  "North Central Province": ["Anuradhapura", "Polonnaruwa"],
  "North Western Province": ["Kurunegala", "Puttalam"],
  "Northern Province": [
    "Jaffna",
    "Kilinochchi",
    "Mannar",
    "Mullaitivu",
    "Vavuniya",
  ],
  "Sabaragamuwa Province": ["Kegalle", "Ratnapura"],
  "Southern Province": ["Galle", "Hambantota", "Matara"],
  "Uva Province": ["Badulla", "Monaragala"],
  "Western Province": ["Colombo", "Gampaha", "Kalutara"],
} as const;

export type SriLankaProvince = keyof typeof SRI_LANKA_PROVINCE_DISTRICTS;

export const SRI_LANKA_PROVINCES = Object.keys(
  SRI_LANKA_PROVINCE_DISTRICTS
) as SriLankaProvince[];
