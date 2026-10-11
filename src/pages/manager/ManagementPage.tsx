import { Link, useSearchParams } from "react-router";
import { listZones } from "../../api/zones";
import { AsyncContent } from "../../components/AsyncContent";
import { useResource } from "../../hooks/useResource";
import { RoutesSection } from "./RoutesSection";
import { SchoolsSection } from "./SchoolsSection";
import { StaffSection } from "./StaffSection";

const TABS = [
  { id: "schools", label: "Colegios" },
  { id: "guides", label: "Guías" },
  { id: "leaders", label: "Líderes" },
  { id: "routes", label: "Rutas" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function ManagementPage() {
  const [searchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: TabId = TABS.some((option) => option.id === requested)
    ? (requested as TabId)
    : "schools";
  const zones = useResource("zones", listZones);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Gestión</h1>
      </header>
      <nav className="tabs" aria-label="Qué administrar">
        {TABS.map((option) => (
          <Link
            key={option.id}
            to={`?tab=${option.id}`}
            replace
            aria-current={tab === option.id ? "page" : undefined}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      <AsyncContent resource={zones} loadingLabel="Cargando zonas…">
        {(zoneList) => (
          <>
            {tab === "schools" && <SchoolsSection zones={zoneList} />}
            {tab === "guides" && (
              <StaffSection key="guides" kind="guides" zones={zoneList} />
            )}
            {tab === "leaders" && (
              <StaffSection key="leaders" kind="leaders" zones={zoneList} />
            )}
            {tab === "routes" && <RoutesSection />}
          </>
        )}
      </AsyncContent>
    </div>
  );
}
