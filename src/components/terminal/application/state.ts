import type { FormAction, FormState } from "./types";

let lineIdCounter = 0;
export function uid(): string {
  return `line-${++lineIdCounter}-${Date.now()}`;
}

export function buildProgressBar(percent: number): string {
  const total = 30;
  const filled = Math.round((percent / 100) * total);
  const empty = total - filled;
  return `[${"#".repeat(filled)}${"-".repeat(empty)}] ${percent}%`;
}

export const initialState: FormState = {
  currentStep: "boot",
  responses: {
    name: "",
    email: "",
    city: "",
    role: "",
    experience: "",
    why: "",
    referral: "",
  },
  history: [],
  isTyping: false,
  easterEggsFound: 0,
  foundEggs: new Set<string>(),
};

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "ADD_LINES":
      return { ...state, history: [...state.history, ...action.lines] };
    case "SET_TYPING":
      return { ...state, isTyping: action.isTyping };
    case "SET_STEP":
      return { ...state, currentStep: action.step };
    case "SET_RESPONSE":
      return {
        ...state,
        responses: { ...state.responses, [action.field]: action.value },
      };
    case "FIND_EASTER_EGG": {
      if (state.foundEggs.has(action.egg)) return state;
      const newSet = new Set(state.foundEggs);
      newSet.add(action.egg);
      return {
        ...state,
        easterEggsFound: state.easterEggsFound + 1,
        foundEggs: newSet,
      };
    }
    case "SET_PROGRESS": {
      const existing = state.history.findIndex((l) => l.type === "progress");
      if (existing >= 0) {
        const updated = [...state.history];
        updated[existing] = {
          ...updated[existing],
          content: buildProgressBar(action.percent),
        };
        return { ...state, history: updated };
      }
      return {
        ...state,
        history: [
          ...state.history,
          {
            id: `progress-${Date.now()}`,
            type: "progress",
            content: buildProgressBar(action.percent),
            color: "green",
          },
        ],
      };
    }
    default:
      return state;
  }
}
