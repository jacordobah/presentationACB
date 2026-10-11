import { request } from "./http";
import type { OperationalCode, TripCode } from "./types";

interface PhotoContext {
  userId: number;
  routeCode: string;
  tripCode: TripCode;
  code: OperationalCode;
}

export async function uploadPhoto(file: File, context: PhotoContext) {
  const form = new FormData();
  form.append("file", file);
  form.append("user_id", String(context.userId));
  form.append("route", context.routeCode);
  form.append("trip_code", context.tripCode);
  form.append("status", context.code);
  const photo = await request<{ id: string; url: string }>("geo", "photos", {
    method: "POST",
    form,
  });
  return photo.id;
}
