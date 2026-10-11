import { CalendarDays, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { assignGuides, listRoutes } from "../../api/routes";
import { listStaff } from "../../api/staff";
import type { Route, StaffMember } from "../../api/types";
import { useSessionUser } from "../../auth/AuthContext";
import { AsyncContent } from "../../components/AsyncContent";
import { RouteStatusChip } from "../../components/Chips";
import { Notice } from "../../components/Notice";
import { EmptyState } from "../../components/States";
import { errorMessage, useToast } from "../../components/toast/ToastContext";
import { useResource } from "../../hooks/useResource";
import { plural } from "../../lib/labels";
import { requiredGuides } from "../../lib/rules";
import "./SchedulePage.css";

interface Assignment {
  guideId: number;
  primary: boolean;
}

const sameAssignments = (a: Assignment[], b: Assignment[]) =>
  a.length === b.length &&
  a.every(
    (item, index) =>
      item.guideId === b[index].guideId && item.primary === b[index].primary,
  );

function RouteAssignment({
  route,
  guides,
  otherRoutesOf,
  onSaved,
}: {
  route: Route;
  guides: StaffMember[];
  otherRoutesOf: (guideId: number) => string[];
  onSaved: () => void;
}) {
  const toast = useToast();
  const saved = route.guides.map(({ guideId, primary }) => ({
    guideId,
    primary,
  }));
  const [draft, setDraft] = useState<Assignment[]>(saved);
  const [candidate, setCandidate] = useState("");
  const [saving, setSaving] = useState(false);
  const required = requiredGuides(route.studentCount);
  const nameOf = (guideId: number) =>
    guides.find((guide) => guide.id === guideId)?.name ??
    route.guides.find((guide) => guide.guideId === guideId)?.name ??
    "Guía";
  const available = guides.filter(
    (guide) => !draft.some((assignment) => assignment.guideId === guide.id),
  );
  const changed = !sameAssignments(draft, saved);
  const missing = required - draft.length;

  const add = () => {
    if (!candidate) return;
    setDraft((current) => [
      ...current,
      { guideId: Number(candidate), primary: current.length === 0 },
    ]);
    setCandidate("");
  };

  const remove = (guideId: number) =>
    setDraft((current) => {
      const remaining = current.filter(
        (assignment) => assignment.guideId !== guideId,
      );
      if (
        remaining.length === 0 ||
        remaining.some((assignment) => assignment.primary)
      ) {
        return remaining;
      }
      return remaining.map((assignment, index) => ({
        ...assignment,
        primary: index === 0,
      }));
    });

  const save = async () => {
    setSaving(true);
    try {
      await assignGuides(route.code, draft);
      toast.show(`Guías de ${route.code} guardados.`, { tone: "success" });
      onSaved();
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      className="assignment"
      aria-labelledby={`assignment-${route.code}`}
    >
      <div className="list-row__top">
        <div className="list-row__title">
          <h2 id={`assignment-${route.code}`} className="route-code">
            {route.code}
          </h2>
          <span>{route.schoolName}</span>
        </div>
        <RouteStatusChip status={route.status} />
      </div>
      <p className="muted">
        {plural(route.studentCount, "estudiante", "estudiantes")}: necesita{" "}
        {plural(required, "guía", "guías")}.
      </p>
      {missing > 0 && (
        <Notice tone="warning">
          Con {plural(route.studentCount, "estudiante", "estudiantes")} esta
          ruta necesita {plural(required, "guía", "guías")} y tiene{" "}
          {draft.length}.
        </Notice>
      )}
      {draft.length > 0 && (
        <ul className="assignment__list">
          {draft.map((assignment) => {
            const others = otherRoutesOf(assignment.guideId).filter(
              (code) => code !== route.code,
            );
            return (
              <li key={assignment.guideId} className="assignment__item">
                <div>
                  <strong>{nameOf(assignment.guideId)}</strong>
                  {others.length > 0 && (
                    <p className="small muted">
                      También en {others.join(", ")}
                    </p>
                  )}
                </div>
                <label className="checkbox">
                  <input
                    type="radio"
                    name={`primary-${route.code}`}
                    checked={assignment.primary}
                    onChange={() =>
                      setDraft((current) =>
                        current.map((item) => ({
                          ...item,
                          primary: item.guideId === assignment.guideId,
                        })),
                      )
                    }
                  />
                  Principal
                </label>
                <button
                  type="button"
                  className="button button--quiet button--icon"
                  onClick={() => remove(assignment.guideId)}
                  aria-label={`Quitar a ${nameOf(assignment.guideId)} de ${route.code}`}
                >
                  <X size={22} aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="cluster">
        <label className="visually-hidden" htmlFor={`candidate-${route.code}`}>
          Guía para agregar a {route.code}
        </label>
        <select
          id={`candidate-${route.code}`}
          className="input assignment__select"
          value={candidate}
          onChange={(event) => setCandidate(event.target.value)}
        >
          <option value="">Elige un guía de la zona</option>
          {available.map((guide) => (
            <option key={guide.id} value={guide.id}>
              {guide.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="button"
          disabled={!candidate}
          onClick={add}
        >
          <UserPlus size={20} aria-hidden="true" />
          Agregar guía
        </button>
      </div>
      <button
        type="button"
        className="button button--primary"
        disabled={!changed || saving || missing > 0}
        onClick={save}
      >
        {saving ? "Guardando…" : `Guardar guías de ${route.code}`}
      </button>
    </section>
  );
}

export default function SchedulePage() {
  const user = useSessionUser();
  const routes = useResource("routes:schedule", async () =>
    (await listRoutes()).filter(
      (route) => route.active && route.status !== "REJECTED",
    ),
  );
  const guides = useResource(`guides:${user.zone}`, async () =>
    (await listStaff("guides", user.zone)).filter((guide) => guide.active),
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-header__title">
          <h1>Programación</h1>
          <p className="page-header__subtitle">
            Asigna los guías principal y de apoyo de cada ruta de la zona{" "}
            {user.zone}.
          </p>
        </div>
      </header>
      <AsyncContent
        resource={routes}
        loadingLabel="Cargando rutas…"
        isEmpty={(list) => list.length === 0}
        empty={
          <EmptyState icon={CalendarDays} title="No hay rutas para programar" />
        }
      >
        {(routeList) => (
          <AsyncContent resource={guides} loadingLabel="Cargando guías…">
            {(guideList) => (
              <div className="stack">
                {routeList.map((route) => (
                  <RouteAssignment
                    key={`${route.code}:${route.guides.map((guide) => guide.guideId).join(",")}`}
                    route={route}
                    guides={guideList}
                    otherRoutesOf={(guideId) =>
                      routeList
                        .filter((other) =>
                          other.guides.some(
                            (guide) => guide.guideId === guideId,
                          ),
                        )
                        .map((other) => other.code)
                    }
                    onSaved={routes.reload}
                  />
                ))}
              </div>
            )}
          </AsyncContent>
        )}
      </AsyncContent>
    </div>
  );
}
