import { fetchJournalEvents } from '@/lib/google-sheets';
import { computeApprenantsMonthly } from '@/lib/aggregations';
import { ApprenantsTable } from '@/components/domain/ApprenantsTable';
import { FilialeSelector } from '../../components/FilialeSelector';
import type { Filiale } from '@/lib/journal-types';

export const dynamic = 'force-dynamic';

function parseFiliale(v: string | undefined): 'ALL' | Filiale {
  return v === 'PV' || v === 'MD' ? v : 'ALL';
}

export default async function ApprenantsPage({
  searchParams,
}: {
  searchParams: { filiale?: string };
}) {
  const filialeParam = parseFiliale(searchParams.filiale);
  const events = await fetchJournalEvents();

  const scoped =
    filialeParam === 'ALL'
      ? events
      : events.filter(e => e.filiale === filialeParam);

  const data = computeApprenantsMonthly(scoped);

  return (
    <div className="p-8 text-text-0">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif italic text-2xl text-amber">
            Encaissements mensuels par élève
          </h1>
          <p className="text-text-2 text-xs mt-1">
            Encaissements effectifs uniquement · {data.rows.length} apprenants ·{' '}
            {data.months.length} mois
          </p>
        </div>
        <FilialeSelector />
      </header>

      <div className="mb-3 flex items-center gap-3 text-[10px] text-text-2 font-mono">
        <span>Légende&nbsp;:</span>
        <span className="px-1.5 py-0.5 rounded-sm text-text-1 bg-bg-3">CHQ</span>
        <span className="px-1.5 py-0.5 rounded-sm text-magenta bg-[#3a2433]">VIR</span>
        <span className="px-1.5 py-0.5 rounded-sm text-amber bg-[#3a2c14]">PRELV</span>
        <span className="px-1.5 py-0.5 rounded-sm text-cyan bg-[#1a3640]">CB</span>
      </div>

      <ApprenantsTable data={data} />
    </div>
  );
}
