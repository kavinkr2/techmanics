import { createContext, useContext, useState, type ReactNode } from "react";

interface NavCtx {
  expanded: boolean;
  setExpanded: (v: boolean) => void;
}
const NavContext = createContext<NavCtx>({ expanded: true, setExpanded: () => {} });
export const useNav = () => useContext(NavContext);

export function NavProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <NavContext.Provider value={{ expanded, setExpanded }}>
      {children}
    </NavContext.Provider>
  );
}
