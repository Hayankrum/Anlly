"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { FormatoHora } from "@/modules/eventos/dateUtils";

const STORAGE_KEY = "formatoHora";

const FormatoContext = createContext<{
  formato: FormatoHora;
  setFormato: (formato: FormatoHora) => void;
}>({
  formato: "24h",
  setFormato: () => {},
});

export function useFormatoHora() {
  return useContext(FormatoContext);
}

export function HorarioProvider({ children }: { children: React.ReactNode }) {
  const [formato, setFormatoState] = useState<FormatoHora>("24h");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormatoState(saved === "12h" ? "12h" : "24h");
  }, []);

  const setFormato = useCallback((f: FormatoHora) => {
    setFormatoState(f);
    localStorage.setItem(STORAGE_KEY, f);
  }, []);

  return (
    <FormatoContext.Provider value={{ formato, setFormato }}>
      {children}
    </FormatoContext.Provider>
  );
}