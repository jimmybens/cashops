import { fetchJournalEvents } from '@/lib/google-sheets';
import { computeKpis, filterEvents } from '@/lib/aggregations';
import { KpiCard } from '../components/KpiCard';
import { FilialeSelector } from '../components/FilialeSelector';
import type { DashboardFilter } from '@/lib/journal-types';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

function parseFiliale(v: string | undefined): DashboardFilter['filiale'] {
  return v === 'PV' || v === 'MD' ? v : 'ALL';
}

export default async function Home({
  searchParams,
}: {
  searchParams: { filiale?: string; period?: string };
}) {
  const events = await fetchJournalEvents();
  const today = new Date();
  const filiale = parseFiliale(searchParams.filiale);

  const currentFilter: DashboardFilter = {
    filiale,
    period: { from: startOfMonth(today), to: endOfMonth(today) },
  };

  const prevMonth = subMonths(today, 1);
  const prevFilter: DashboardFilter = {
    filiale,
    period: { from: startOfMonth(prevMonth), to: endOfMonth(prevMonth) },
  };

  const prevEvents = filterEvents(events, prevFilter);
  const kpis = computeKpis(events, currentFilter, prevEvents);

  const eurFmt = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  });

  return (
    <div className="p-8 text-text-0">
      <header className="mb-8 border-b border-line pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif italic text-2xl text-amber">
            MARIANNE · POSTE CLIENT
          </h1>
          <p className="text-text-2 text-xs mt-1">Mois en cours · MTD</p>
        </div>

        <div className="flex items-center gap-6">
          <FilialeSelector />
          <div className="text-text-2 text-xs font-mono">
            Last sync:{' '}
            {new Date().toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard
          title="CA Encaissé"
          value={kpis.caEncaisse}
          colorClass="text-green"
          variation={kpis.variationVsPrev}
          subtitle={`Run rate projeté: ${eurFmt.format(kpis.runRate)}`}
        />
        <KpiCard
          title="Retours"
          value={kpis.retours}
          colorClass="text-red"
          subtitle={`${
            kpis.caEncaisse > 0
              ? ((kpis.retours / kpis.caEncaisse) * 100).toFixed(1)
              : 0
          }% du CA encaissé`}
        />
        <KpiCard title="Net" value={kpis.net} colorClass="text-cyan" />
      </section>

      <div className="mt-8 text-text-3 text-xs">
        Data loaded: {events.length} events total.
      </div>
    </div>
  );
}
