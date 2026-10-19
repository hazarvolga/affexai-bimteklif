/**
 * @license
 * Copyright (c) 2026 BIMMetraj ve BIMPlan Academy. Tüm hakları saklıdır. Bkz. LICENSE.
 */
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const USER_TOUR_EVENT = "bimmetraj:start-tour";
export const ADMIN_TOUR_EVENT = "bimmetraj:start-admin-tour";

/** Turu bir pencere olayıyla ya da adresteki `?tour=1` ile açar; parametre okunduktan sonra adresten silinir. */
export function useTourTrigger(eventName: string): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("tour") !== "1") return;
    params.delete("tour");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
    setOpen(true);
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    const start = () => setOpen(true);
    window.addEventListener(eventName, start);
    return () => window.removeEventListener(eventName, start);
  }, [eventName]);

  return [open, setOpen];
}

export function startTour(eventName: string = USER_TOUR_EVENT): void {
  window.dispatchEvent(new CustomEvent(eventName));
}
