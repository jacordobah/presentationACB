import { listRoutes } from "../api/routes";
import { useSessionUser } from "../auth/AuthContext";
import { useResource } from "./useResource";

export function useAssignedRoutes() {
  const user = useSessionUser();
  return useResource(`routes:assigned:${user.id}`, async () => {
    const routes = await listRoutes();
    return routes.filter(
      (route) =>
        route.active &&
        route.guides.some((guide) => guide.guideId === user.id),
    );
  });
}
