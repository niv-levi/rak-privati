import { Badge } from "@/components/ui/badge";
import { formatKm, formatNumber, formatDate } from "@/lib/format";
import { bodyStyleLabels, conditionLabels, fuelLabels, ownershipLabels, transmissionLabels, equipmentOptions } from "@/lib/labels";
import type { Enums } from "@/lib/database.types";

export type SpecData = {
  year: number | null; mileage_km: number | null; test_mileage_km: number | null; test_mileage_date: string | null;
  ownership_count_declared: number | null; ownership_type: Enums<"ownership_type"> | null; fuel_type: Enums<"fuel_type"> | null;
  transmission: Enums<"transmission_type"> | null; engine_cc: number | null; body_style: Enums<"body_style"> | null; color: string | null;
  condition: Enums<"vehicle_condition"> | null; first_registration_date: string | null; equipment: string[];
  official_ownership_type?: string | null;
};

type Row = { label: string; value: React.ReactNode; origin: "seller" | "official" | "missing" };

function OriginTag({ origin }: { origin: Row["origin"] }) {
  if (origin === "official") return <Badge variant="outline" className="text-[10px]">מקור רשמי</Badge>;
  if (origin === "seller") return <Badge variant="muted" className="text-[10px]">הצהרת המוכר</Badge>;
  return null;
}

export function SpecSheet({ data }: { data: SpecData }) {
  const rows: Row[] = [
    { label: "שנת ייצור", value: data.year ? <span className="num">{data.year}</span> : null, origin: "seller" },
    { label: "עלייה לכביש", value: data.first_registration_date ? <span className="num">{formatDate(data.first_registration_date)}</span> : null, origin: "official" },
    { label: "קילומטראז׳ נוכחי", value: data.mileage_km != null ? <span className="num">{formatKm(data.mileage_km)}</span> : null, origin: "seller" },
    { label: "נסועה שנרשמה בטסט האחרון", value: data.test_mileage_km != null ? <span className="num">{formatKm(data.test_mileage_km)}{data.test_mileage_date ? ` (${formatDate(data.test_mileage_date)})` : ""}</span> : null, origin: data.test_mileage_km != null ? "official" : "missing" },
    { label: "מספר ידיים", value: data.ownership_count_declared != null ? <span className="num">{data.ownership_count_declared}</span> : null, origin: "seller" },
    { label: "סוג בעלות נוכחית", value: data.ownership_type ? ownershipLabels[data.ownership_type] : null, origin: "seller" },
    { label: "סוג בעלות רשום במקור", value: data.official_ownership_type ?? null, origin: data.official_ownership_type ? "official" : "missing" },
    { label: "דלק", value: data.fuel_type ? fuelLabels[data.fuel_type] : null, origin: "seller" },
    { label: "תיבת הילוכים", value: data.transmission ? transmissionLabels[data.transmission] : null, origin: "seller" },
    { label: "נפח מנוע", value: data.engine_cc ? <span className="num">{formatNumber(data.engine_cc)} סמ״ק</span> : null, origin: "seller" },
    { label: "מרכב", value: data.body_style ? bodyStyleLabels[data.body_style] : null, origin: "seller" },
    { label: "צבע", value: data.color, origin: "seller" },
    { label: "מצב הרכב", value: data.condition ? conditionLabels[data.condition] : null, origin: "seller" },
  ];
  return (
    <div className="space-y-4">
      <dl className="grid gap-x-6 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-start justify-between gap-3 border-b border-border py-2.5">
            <dt className="text-sm text-muted-foreground">{r.label}</dt>
            <dd className="flex items-center gap-2 text-sm font-semibold text-end">
              {r.value ?? <span className="font-normal text-muted-foreground">לא צוין</span>}
              {r.value != null && <OriginTag origin={r.origin} />}
            </dd>
          </div>
        ))}
      </dl>
      {data.equipment.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-bold">אבזור נוסף</h3>
          <ul className="flex flex-wrap gap-2">{data.equipment.map((e) => <li key={e}><Badge variant="secondary">{equipmentOptions.find((o) => o.value === e)?.label ?? e}</Badge></li>)}</ul>
        </div>
      )}
    </div>
  );
}
