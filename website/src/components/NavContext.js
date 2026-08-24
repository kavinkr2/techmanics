import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from "react";
const NavContext = createContext({ expanded: true, setExpanded: () => { } });
export const useNav = () => useContext(NavContext);
export function NavProvider({ children }) {
    const [expanded, setExpanded] = useState(true);
    return (_jsx(NavContext.Provider, { value: { expanded, setExpanded }, children: children }));
}
