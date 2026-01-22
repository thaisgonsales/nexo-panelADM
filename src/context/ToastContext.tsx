import { createContext, useContext, useState, ReactNode, useRef } from "react";

type ToastType = "success" | "error";

type Toast = {
  message: string;
  type: ToastType;
};

type ToastContextType = {
  showToast: (message: string, type: ToastType) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timeoutRef = useRef<number | null>(null);

  function showToast(message: string, type: ToastType) {
    setToast({ message, type });

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setToast(null);
      timeoutRef.current = null;
    }, 3000);
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}
