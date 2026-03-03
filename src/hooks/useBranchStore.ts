import { useSyncExternalStore } from 'react';
import { getBranchState, subscribeBranch } from '@/store/branchStore';

export function useBranchStore() {
  return useSyncExternalStore(subscribeBranch, getBranchState, getBranchState);
}
