export const BRANCH_STORAGE_KEY = 'pos.branch';

export interface BranchState {
  selectedBranchId: number | null;
}

const listeners = new Set<() => void>();

function loadInitialState(): BranchState {
  if (typeof window === 'undefined') {
    return { selectedBranchId: null };
  }

  try {
    const raw = window.localStorage.getItem(BRANCH_STORAGE_KEY);
    if (!raw) {
      return { selectedBranchId: null };
    }
    const parsed = JSON.parse(raw) as BranchState;
    return {
      selectedBranchId: Number.isInteger(parsed.selectedBranchId) ? parsed.selectedBranchId : null
    };
  } catch {
    return { selectedBranchId: null };
  }
}

let state: BranchState = loadInitialState();

function persist() {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(BRANCH_STORAGE_KEY, JSON.stringify(state));
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function getBranchState(): BranchState {
  return state;
}

export function setBranchState(next: Partial<BranchState>) {
  state = {
    ...state,
    ...next
  };
  persist();
  emit();
}

export function subscribeBranch(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
