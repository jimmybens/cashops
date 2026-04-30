'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilialeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentFiliale = searchParams.get('filiale') || 'ALL';

  const setFiliale = (filiale: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filiale === 'ALL') {
      params.delete('filiale');
    } else {
      params.set('filiale', filiale);
    }
    router.push(`/?${params.toString()}`);
  };

  const options = ['ALL', 'PV', 'MD'];

  return (
    <div className="flex gap-2">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => setFiliale(opt)}
          className={`px-3 py-1 text-sm border rounded transition-colors ${
            currentFiliale === opt
              ? 'bg-amber text-bg-0 border-amber font-bold'
              : 'bg-bg-1 text-text-1 border-line hover:border-amber-dim'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}
