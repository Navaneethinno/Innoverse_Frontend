import { useL } from "@/Components/InnoCBS/cbsOps";
import { ForecourtBanner, FuelTank } from "./FmsVisuals";
import { num } from "./fmsShared";

// The top of the InnoFMS dashboard (Admin_42): the day at the pumps as a
// picture. Today's tank: today's share of the month's litres; the month's
// tank fills as the month goes by.
export function FmsDashboardHero({ data }) {
  const L = useL();
  const tile = (key) => Number((data?.tiles ?? []).find((x) => x.key === key)?.value) || 0;
  const today = tile("fuel_litres_today");
  const month = tile("fuel_litres_month");
  const now = new Date();
  const day = now.getDate();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const share = month > 0 ? today / month : 0;
  return (
    <ForecourtBanner
      title={L("Today at the pumps")}
      text={L("Fuel sold today and this month across your stations.")}
      flowing={today > 0}
      facts={[
        [L("Stations selling"), num(tile("fuel_stations_selling"))],
        [L("Fleet vehicles"), num(tile("fuel_fleet_vehicles"))],
        [L("Waiting for approval"), num(tile("pending_approvals"))],
      ]}
    >
      <div className="flex items-end gap-6">
        <FuelTank level={share} size={84} label={`${num(today)} L ${L("today")}`} caption={month > 0 ? `${Math.round(share * 100)}% ${L("of this month")}` : L("Nothing sold yet")} title={L("Litres sold today")} />
        <FuelTank level={day / days} size={84} colour="#0ea5e9" label={`${num(month)} L ${L("this month")}`} caption={`${L("Day")} ${day} / ${days}`} title={L("Litres sold this month; the tank fills as the month goes by")} />
      </div>
    </ForecourtBanner>
  );
}
