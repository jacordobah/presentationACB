import { Timer } from "lucide-react";
import { useState } from "react";
import { saveAttendance } from "../../../api/attendance";
import type { MeetingPoint, Student, Trip } from "../../../api/types";
import { errorMessage, useToast } from "../../../components/toast/ToastContext";
import { formatCountdown } from "../../../lib/dates";
import { distanceMeters, formatDistance } from "../../../lib/geo";
import type { Fix } from "../../../location/LocationContext";
import { tripProgress, type PointProgress } from "./tripProgress";

function WaitTimer({
  point,
  now,
  onExtend,
}: {
  point: PointProgress;
  now: number;
  onExtend: () => void;
}) {
  const remaining = point.deadline - now;
  const expired = remaining <= 0;
  return (
    <div className={expired ? "wait-timer wait-timer--expired" : "wait-timer"}>
      <Timer size={28} aria-hidden="true" />
      <div className="wait-timer__text">
        <span className="wait-timer__label">
          {expired ? "Tiempo de espera cumplido" : "Tiempo de espera"}
        </span>
        <span className="wait-timer__value" role="timer">
          {formatCountdown(remaining)}
        </span>
      </div>
      {point.extended ? (
        <span className="chip">Extendida a 5:00</span>
      ) : (
        <button type="button" className="button" onClick={onExtend}>
          Extender a 5:00
        </button>
      )}
    </div>
  );
}

function AttendanceChecklist({
  students,
  present,
  disabled,
  onChange,
}: {
  students: Student[];
  present: Set<number>;
  disabled: boolean;
  onChange: (present: Set<number>) => void;
}) {
  const toggle = (studentId: number) => {
    const next = new Set(present);
    if (next.has(studentId)) next.delete(studentId);
    else next.add(studentId);
    onChange(next);
  };

  return (
    <fieldset className="attendance" disabled={disabled}>
      <legend className="attendance__legend">
        Asistencia: {present.size} de {students.length} presentes
      </legend>
      <button
        type="button"
        className="button button--quiet"
        onClick={() => onChange(new Set(students.map((student) => student.id)))}
      >
        Marcar todos presentes
      </button>
      <ul className="attendance__list">
        {students.map((student) => {
          const isPresent = present.has(student.id);
          return (
            <li key={student.id}>
              <label
                className={
                  isPresent
                    ? "attendance__row attendance__row--present"
                    : "attendance__row"
                }
              >
                <input
                  type="checkbox"
                  checked={isPresent}
                  onChange={() => toggle(student.id)}
                />
                <span className="attendance__name">{student.name}</span>
                <span className="attendance__state">
                  {isPresent ? "Presente" : "Ausente"}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

interface PointPanelProps {
  trip: Trip;
  point: MeetingPoint;
  students: Student[];
  progress: PointProgress | undefined;
  fix: Fix | null;
  now: number;
}

export function PointPanel({
  trip,
  point,
  students,
  progress,
  fix,
  now,
}: PointPanelProps) {
  const toast = useToast();
  const [present, setPresent] = useState<Set<number>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const distance = fix ? distanceMeters(fix, point.location) : null;
  const inside = distance !== null && distance <= point.radiusM;
  // In 541 every point is a pickup; in 542 attendance is taken once at the
  // school (PE01) and the remaining points are drop-offs.
  const takesAttendance = trip.tripCode === "541" || point.order === 1;
  const listed =
    trip.tripCode === "541"
      ? students.filter(
          (student) => student.meetingPoints["541"] === point.code,
        )
      : point.order === 1
        ? students
        : students.filter(
            (student) => student.meetingPoints["542"] === point.code,
          );
  const savesAttendance = takesAttendance && listed.length > 0;

  const complete = async () => {
    setSaving(true);
    try {
      if (savesAttendance) {
        await saveAttendance(
          trip.id,
          point.code,
          listed.map((student) => ({
            studentId: student.id,
            present: present.has(student.id),
          })),
        );
      }
      tripProgress.complete(trip.id, point.code);
      toast.show(
        savesAttendance ? "Asistencia guardada." : "Punto completado.",
        {
          tone: "success",
        },
      );
    } catch (error) {
      toast.show(errorMessage(error), { tone: "error" });
      setSaving(false);
    }
  };

  return (
    <section className="point-panel" aria-labelledby={`point-${point.code}`}>
      <div className="point-panel__header">
        <span className="point-badge">{point.code}</span>
        <div>
          <h2 id={`point-${point.code}`}>{point.name}</h2>
          {point.description && (
            <p className="small muted">{point.description}</p>
          )}
        </div>
        {inside ? (
          <span className="chip chip--progress">En el punto</span>
        ) : (
          distance !== null && (
            <span className="chip">A {formatDistance(distance)}</span>
          )
        )}
      </div>

      {progress && (
        <WaitTimer
          point={progress}
          now={now}
          onExtend={() => tripProgress.extendWait(trip.id, point.code)}
        />
      )}

      {takesAttendance ? (
        listed.length > 0 ? (
          <AttendanceChecklist
            students={listed}
            present={present}
            disabled={!inside || saving}
            onChange={setPresent}
          />
        ) : (
          <p className="muted">Ningún estudiante tiene asignado este punto.</p>
        )
      ) : (
        <div className="stack">
          <h3>Se bajan aquí</h3>
          {listed.length > 0 ? (
            <ul className="drop-off-list">
              {listed.map((student) => (
                <li key={student.id}>{student.name}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Ningún estudiante se baja en este punto.</p>
          )}
        </div>
      )}

      {!inside && distance !== null && (
        <p className="field__error">
          Estás a {formatDistance(distance)} del {point.code}. Acércate al punto
          para {savesAttendance ? "tomar la asistencia" : "completarlo"}.
        </p>
      )}
      <button
        type="button"
        className="button button--primary button--large button--block"
        disabled={!inside || saving}
        onClick={complete}
      >
        {saving
          ? "Guardando…"
          : savesAttendance
            ? "Guardar asistencia"
            : "Completar punto"}
      </button>
    </section>
  );
}
