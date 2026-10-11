import { listRoutes } from "../api/routes";
import { useSessionUser } from "../auth/AuthContext";
import { useResource } from "./useResource";

export function useAssignedRoutes() {
  const user = useSessionUser();
  return useResource(`routes:assigned:${user.id}`, async () => {
    const routes = await listRoutes({ guideId: user.id });
    return routes.filter((route) => route.active);
  });
}
