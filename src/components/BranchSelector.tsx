import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listBranches } from '@/services/branches';
import { queryKeys } from '@/lib/queryKeys';
import { useBranchStore } from '@/hooks/useBranchStore';
import { setBranchState } from '@/store/branchStore';
import { useAuthStore } from '@/hooks/useAuthStore';

export function BranchSelector() {
  const { selectedBranchId } = useBranchStore();
  const { user } = useAuthStore();

  const branchesQuery = useQuery({
    queryKey: queryKeys.branches.list({ per_page: 200 }),
    queryFn: () => listBranches({ per_page: 200 })
  });

  useEffect(() => {
    const branches = branchesQuery.data?.data ?? [];
    if (!branches.length) {
      return;
    }

    if (selectedBranchId && branches.some((branch) => branch.id === selectedBranchId)) {
      return;
    }

    const preferred = user?.primary_branch?.id ?? user?.branches?.[0]?.id ?? branches[0]?.id;

    if (preferred) {
      setBranchState({ selectedBranchId: preferred });
    }
  }, [branchesQuery.data, selectedBranchId, user]);

  const branches = branchesQuery.data?.data ?? [];

  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft">
      <span className="text-slate-600">Branch</span>
      <select
        className="min-w-[180px] bg-transparent font-medium text-ink outline-none"
        value={selectedBranchId ?? ''}
        onChange={(event) => setBranchState({ selectedBranchId: Number(event.target.value) })}
      >
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}
