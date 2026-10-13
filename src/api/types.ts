export type Role = "GUIDE" | "LEADER" | "MANAGER";
export type TripCode = "541" | "542";
export type DocumentType = "CC" | "CE" | "NUIP" | "PPT" | "PPE";
export type Relationship =
  "FATHER" | "MOTHER" | "UNCLE_AUNT" | "RELATIVE" | "NEIGHBOR";
export type OperationalCode =
  "58" | "512" | "520" | "523" | "524" | "537" | "541" | "542" | "550";
export type SchoolShift = "MORNING" | "AFTERNOON" | "FULL_DAY";
export type RouteStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";
export type TripStatus = "SCHEDULED" | "IN_PROGRESS" | "FINISHED";
export type ArrivalType = "NON_IMPACT" | "IMPACT";
export type ArrivalStatus = "PENDING" | "NOTIFIED" | "OPEN" | "MINUTED";
export type ArrivalAction = "VERBAL" | "WRITTEN" | "REQUIREMENT";
export type Punctuality = "ON_TIME" | "LATE_NO_IMPACT" | "LATE_IMPACT";
export type GeofenceStatus = "inside" | "outside" | "indeterminate";
export type GeofenceReason =
  | "accuracy_missing"
  | "accuracy_exceeds_limit"
  | "uncertainty_within_radius"
  | "uncertainty_outside_radius"
  | "boundary_uncertainty";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface SessionUser {
  id: number;
  name: string;
  role: Role;
  zone: string | null;
}

export interface Zone {
  code: string;
  name: string;
}

export interface School {
  id: number;
  name: string;
  schoolCode: string;
  phone: string;
  address: string;
  zone: string;
  latitude: number;
  longitude: number;
  active: boolean;
}

export type SchoolInput = Omit<School, "id" | "active">;

export interface StaffMember {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  zone: string;
  contractNumber: string;
  username: string;
  active: boolean;
}

export type StaffInput = Omit<StaffMember, "id" | "active"> & {
  password?: string;
};

export interface RouteGuide {
  guideId: number;
  name: string;
  primary: boolean;
}

export interface Route {
  code: string;
  schoolId: number;
  schoolName: string | null;
  zone: string;
  description: string;
  status: RouteStatus;
  reviewNotes: string | null;
  proposedBy: { id: number; name: string };
  active: boolean;
  guides: RouteGuide[];
  studentCount: number;
}

export interface RouteInput {
  code: string;
  schoolId: number;
  description: string;
}

export interface Guardian {
  id?: number;
  name: string;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  relationship: Relationship;
  primary: boolean;
}

export interface Student {
  id: number;
  documentType: DocumentType;
  documentNumber: string;
  name: string;
  address: string;
  grade: string;
  schoolShift: SchoolShift;
  routeCode: string;
  meetingPoints: Record<TripCode, string>;
  guardians: Guardian[];
  active: boolean;
}

export type StudentInput = Omit<Student, "id" | "active">;

export interface AttendanceRecord {
  date: string;
  tripCode: TripCode;
  studentId: number;
  studentName: string;
  present: boolean;
}

export interface Trip {
  id: number;
  routeCode: string;
  tripCode: TripCode;
  date: string;
  scheduledStart: string;
  citationTime: string;
  status: TripStatus;
  startedAt: string | null;
  endedAt: string | null;
  requiredGuides: number;
  guides: RouteGuide[];
  executors: { userId: number; name: string }[];
}

export interface TripSummary {
  tripId: number;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  presentCount: number;
  enrolledCount: number;
}

export interface LateArrival {
  id: number;
  guideId: number;
  guideName: string;
  routeCode: string;
  tripId: number;
  date: string;
  type: ArrivalType;
  minutesLate: number;
  status: ArrivalStatus;
  accumulatedCount: number;
  action: ArrivalAction | null;
}

export interface MeetingPoint {
  code: string;
  order: number;
  name: string;
  description: string | null;
  radiusM: number;
  location: LatLng;
}

export interface Destination {
  name: string;
  radiusM: number;
  location: LatLng;
}

export interface TripGeometry {
  geoRouteId: string;
  routeCode: string;
  tripCode: TripCode;
  name: string;
  lengthM: number;
  line: LatLng[];
  meetingPoints: MeetingPoint[];
  destination: Destination;
}

export interface MeetingPointValidation {
  status: GeofenceStatus;
  reason: GeofenceReason;
  distanceM: number;
  radiusM: number;
  accuracyM: number | null;
  maxAccuracyM: number;
}

export interface CodeReport {
  id: string;
  name: string;
  routeCode: string;
  tripCode: TripCode;
  code: OperationalCode;
  userId: number;
  userName: string | null;
  notifiedAt: string;
  location: LatLng;
  detail: string | null;
  photoUrl: string | null;
}

export interface ArrivalResult {
  arrivedAt: string;
  classification: Punctuality;
  minutesLate: number;
}

export interface LatestPosition {
  userId: number;
  userName: string | null;
  routeCode: string;
  tripCode: TripCode;
  location: LatLng;
  recordedAt: string;
}
