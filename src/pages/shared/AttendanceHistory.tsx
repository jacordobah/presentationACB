import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { listAttendance } from "../../api/attendance";
import type { AttendanceRecord, TripCode } from "../../api/types";
import { AsyncContent } from "../../components/AsyncContent";
import { Field } from "../../components/Field";
import { EmptyState } from "../../components/States";
import { useResource } from "../../hooks/useResource";
import { addDays, formatShortDate, todayInBogota } from "../../lib/dates";
import { TRIP_LABELS } from "../../lib/labels";

const TRIP_CODES: TripCode[] = ["541", "542"];

function ByStudent({ records }: { records: AttendanceRecord[] }) {
  const students = new Map<
    number,
    { name: string; present: number; total: number }
  >();
  for (const record of records) {
    const entry = students.get(record.studentId) ?? {
      name: record.studentName,
      present: 0,
      total: 0,
    };
    entry.total += 1;
    if (record.present) entry.present += 1;
    students.set(record.studentId, entry);
  }
  const rows = [...students]
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Estudiante</th>
            <th scope="col">Presente</th>
            <th scope="col">Asistencia</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rate = Math.round((row.present / row.total) * 100);
            return (
              <tr key={row.id}>
                <th scope="row">{row.name}</th>
                <td>
                  {row.present} de {row.total}
                </td>
                <td>
                  <span
                    className={
                      rate < 80 ? "chip chip--late" : "chip chip--done"
                    }
                  >
                    {rate} %
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ByDay({ records }: { records: AttendanceRecord[] }) {
  const dates = [...new Set(records.map((record) => record.date))]
    .sort()
    .reverse();
  return (
    <ul className="list">
      {dates.map((date) => (
        <li key={date} className="list-row">
          <strong>{formatShortDate(date)}</strong>
          {TRIP_CODES.map((tripCode) => {
            const trip = records.filter(
              (record) => record.date === date && record.tripCode === tripCode,
            );
            if (trip.length === 0) return null;
            const absent = trip.filter((record) => !record.present);
            return (
              <div key={tripCode} className="day-trip">
                <span>
                  {tripCode} {TRIP_LABELS[tripCode]}:{" "}
                  <strong>
                    {trip.length - absent.length} de {trip.length} presentes
                  </strong>
                </span>
                {absent.length > 0 && (
                  <span className="small muted">
                    Ausentes:{" "}
                    {absent.map((record) => record.studentName).join(", ")}
                  </span>
                )}
              </div>
            );
          })}
        </li>
      ))}
    </ul>
  );
}

export function AttendanceHistory({ routeCode }: { routeCode: string }) {
  const today = todayInBogota();
  const [range, setRange] = useState({ from: addDays(today, -13), to: today });
  const [view, setView] = useState<"student" | "day">("student");
  const validRange =
    range.from !== "" && range.to !== "" && range.from <= range.to;
  const records = useResource(
    validRange ? `attendance:${routeCode}:${range.from}:${range.to}` : null,
    () => listAttendance(routeCode, range.from, range.to),
  );

  return (
    <div className="stack">
      <div className="form-grid">
        <Field label="Desde">
          {(control) => (
            <input
              {...control}
              className="input"
              type="date"
              value={range.from}
              max={range.to || today}
              onChange={(event) =>
                setRange((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          )}
        </Field>
        <Field label="Hasta">
          {(control) => (
            <input
              {...control}
              className="input"
              type="date"
              value={range.to}
              min={range.from}
              max={today}
              onChange={(event) =>
                setRange((current) => ({ ...current, to: event.target.value }))
              }
            />
          )}
        </Field>
      </div>
      {!validRange ? (
        <p className="field__error">
          La fecha inicial debe ser anterior o igual a la final.
        </p>
      ) : (
        <AsyncContent
          resource={records}
          loadingLabel="Cargando asistencia…"
          isEmpty={(list) => list.length === 0}
          empty={
            <EmptyState
              icon={ClipboardList}
              title="No hay asistencia en esas fechas"
            >
              Prueba con un rango más amplio.
            </EmptyState>
          }
        >
          {(list) => (
            <>
              <div
                className="segmented"
                role="group"
                aria-label="Ver asistencia"
              >
                <button
                  type="button"
                  aria-pressed={view === "student"}
                  onClick={() => setView("student")}
                >
                  Por estudiante
                </button>
                <button
                  type="button"
                  aria-pressed={view === "day"}
                  onClick={() => setView("day")}
                >
                  Por día
                </button>
              </div>
              {view === "student" ? (
                <ByStudent records={list} />
              ) : (
                <ByDay records={list} />
              )}
            </>
          )}
        </AsyncContent>
      )}
    </div>
  );
}
