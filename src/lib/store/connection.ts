import { create } from "zustand";

interface ConnectionState {
  online: boolean;
  setOnline: (online: boolean) => void;
}

// UI-facing connection status. Initialized from the browser when available.
export const useConnectionStore = create<ConnectionState>((set) => ({
  online: typeof navigator !== "undefined" ? navigator.onLine : true,
  setOnline: (online) => set({ online }),
}));
