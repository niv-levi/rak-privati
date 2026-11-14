/**
 * Clearly fictional development data for exercising the vehicle report UI without external access.
 * Plates: 1234567 (full data), 7654321 (partial, conflicting year), 8888888 (vehicle only, no history),
 * 9999999 (simulated outage), anything else → not found.
 */
export const devVehicles = {
  "1234567": {
    plate: "1234567", makeCode: 19, makeName: "טויוטה", modelCode: "0213", modelName: "COROLLA", commercialName: "קורולה", trimLevel: "HYBRID SENSE",
    year: 2020, engineModel: "2ZR-FXE", fuel: "בנזין/חשמל", color: "לבן פנינה", bodyStyle: "סדאן", lastTestDate: "2025-09-14", registrationValidUntil: "2026-09-14",
    ownershipType: "פרטי", firstOnRoad: "2020-03", pollutionGroup: 2, safetyLevel: 6, frontTires: "205/55R16", rearTires: "205/55R16", registrationInstruction: null, vinSuffix: "4821", sourceUpdatedAt: "2025-10-01",
  },
  "7654321": {
    plate: "7654321", makeCode: 36, makeName: "יונדאי", modelCode: "0710", modelName: "I20", commercialName: "i20", trimLevel: null,
    year: 2018, engineModel: "G4LC", fuel: "בנזין", color: "אפור מטאלי", bodyStyle: "האצ׳בק", lastTestDate: "2024-11-02", registrationValidUntil: "2025-11-02",
    ownershipType: "ליסינג", firstOnRoad: "2018-07", pollutionGroup: 8, safetyLevel: 3, frontTires: null, rearTires: null, registrationInstruction: null, vinSuffix: "1190", sourceUpdatedAt: null,
  },
  "8888888": {
    plate: "8888888", makeCode: 44, makeName: "קיה", modelCode: "0520", modelName: "PICANTO", commercialName: "פיקנטו", trimLevel: "LX",
    year: 2022, engineModel: "G3LA", fuel: "בנזין", color: "אדום", bodyStyle: "האצ׳בק", lastTestDate: "2025-04-20", registrationValidUntil: "2026-04-20",
    ownershipType: "פרטי", firstOnRoad: "2022-04", pollutionGroup: 5, safetyLevel: 2, frontTires: "175/65R14", rearTires: "175/65R14", registrationInstruction: null, vinSuffix: "0077", sourceUpdatedAt: null,
  },
} as const;

export const devHistory = {
  "1234567": {
    mileage: [
      { date: "2021-03-10", km: 18450 }, { date: "2022-03-08", km: 41200 }, { date: "2023-03-15", km: 63900 }, { date: "2024-03-20", km: 84100 }, { date: "2025-09-14", km: 102300 },
    ],
    ownership: [{ date: "2020-03-05", ownershipType: "פרטי" }],
  },
  "7654321": {
    mileage: [{ date: "2022-10-30", km: 96000 }, { date: "2024-11-02", km: 141000 }],
    ownership: [{ date: "2018-07-12", ownershipType: "ליסינג" }, { date: "2021-08-01", ownershipType: "פרטי" }, { date: "2023-02-14", ownershipType: "פרטי" }],
  },
} as const;

export const devRecalls = {
  "7654321": [
    { code: "RC-2019-0142", title: "בדיקת מערכת בלימה", description: "קריאת שירות לבדיקה והחלפה של רכיב במערכת הבלימה בדגמים נבחרים.", publishedAt: "2019-05-02", applies: "vehicle" as const },
  ],
} as const;
