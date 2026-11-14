import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Shown only while the backend is not configured (never in a configured production deployment). */
export function ConfigBanner() {
  if (isSupabaseConfigured()) return null;
  return (
    <div role="status" className="border-b border-warning/30 bg-warning-soft">
      <div className="container-page py-2 text-xs sm:text-sm text-brand-dark">
        <strong>מצב הדגמה:</strong> חיבור ל-Supabase טרם הוגדר בסביבה זו. דפים ציבוריים פועלים, אך התחברות, פרסום ושמירת נתונים אינם זמינים עד להגדרת משתני הסביבה (ראו README).
      </div>
    </div>
  );
}
