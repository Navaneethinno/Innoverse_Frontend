import { RecordScreen } from "@/Components/MakerChecker/RecordScreen";
import { ageApi, cell, useL } from "@/Components/InnoCBS/Interest/interestShared";

export function AgeCategories() {
  const L = useL();
  return (
    <RecordScreen
      api={ageApi}
      title={L("ageCategories")}
      subtitle={L("Age bands used by rates. Bands may not overlap.")}
      columns={[{ key: "min_age", label: L("ages"), render: (r) => cell(`${r.min_age ?? r.setup?.min_age ?? 0} – ${(r.max_age ?? r.setup?.max_age) ?? "∞"}`) }]}
      fields={[
        { key: "code", label: L("code"), type: "code", required: true, fixedOnEdit: true, placeholder: "SENIOR" },
        { key: "name", label: L("name"), required: true },
        { key: "min_age", label: L("min_age"), type: "int", required: true },
        { key: "max_age", label: L("max_age"), type: "int", hint: L("Leave empty for no upper limit.") },
        { key: "description", label: L("description"), type: "textarea" },
      ]}
      bodyOf={(x) => ({ ...x, min_age: Number(x.min_age), max_age: x.max_age === "" || x.max_age == null ? null : Number(x.max_age) })}
    />
  );
}
