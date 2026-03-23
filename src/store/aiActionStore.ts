import { create } from "zustand";

interface AIAction {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: "pending" | "confirmed" | "rejected";
}

interface AIActionStore {
  actions: AIAction[];
  addAction: (action: Omit<AIAction, "status">) => void;
  confirmAction: (id: string) => void;
  rejectAction: (id: string) => void;
  clearProcessed: () => void;
}

export const useAIActionStore = create<AIActionStore>((set) => ({
  actions: [],
  addAction: (action) =>
    set((state) => ({
      actions: [...state.actions, { ...action, status: "pending" }],
    })),
  confirmAction: (id) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === id ? { ...a, status: "confirmed" } : a
      ),
    })),
  rejectAction: (id) =>
    set((state) => ({
      actions: state.actions.map((a) =>
        a.id === id ? { ...a, status: "rejected" } : a
      ),
    })),
  clearProcessed: () =>
    set((state) => ({
      actions: state.actions.filter((a) => a.status === "pending"),
    })),
}));
