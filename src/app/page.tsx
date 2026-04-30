import { fetchJournalEvents } from '@/lib/google-sheets';
import { computeKpis, filterEvents } from '@/lib/aggregations';
import { KpiCard } from './components/KpiCard';
import { FilialeSelector } from './components/FilialeSelector';
import { startOfMonth, endOfMonth, subMonths } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function Home({
  searchParams,
}: {
  searchParams: { filiale?: string; period?: string };
}) {
  const filialeRaw = searchParams.filiale as 'PV' | 'MD' | undefined;
  const events = await fetchJournalEvents();

  const today = new Date();
  
  // Default filter: Month-To-Date (MTD)
  const currentFilter = {
    filiale: filialeRaw || 'ALL',
    period: {
      from: startOfMonth(today),
      to: endOfMonth(today),
    }
  };

  // For variation, we compare vs previous month
  const prevMonth = subMonths(today, 1);
  const prevFilter = {
    filiale: currentFilter.filiale as any,
    period: {
      from: startOfMonth(prevMonth),
      to: endOfMonth(prevMonth)
    }
  };

  const prevEvents = filterEvents(events, prevFilter);
  const kpis = computeKpis(events, currentFilter as any, prevEvents);

  return (
    <div className="min-h-screen p-8 text-text-0 font-sans">
      <header className="mb-8 border-b border-line pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0 bg-bg-0 z-10">
        <div>
          <h1 className="font-serif text-2xl font-bold text-amber">MARIANNE · POSTE CLIENT</h1>
        </div>
        
        <div className="flex items-center gap-6">
          <FilialeSelector />
          <div className="text-text-2 text-sm font-mono">
            Last sync: {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KpiCard 
          title="CA Encaissé" 
          value={kpis.caEncaisse} 
          colorClass="text-green"
          variation={kpis.variationVsPrev}
          subtitle={`Run rate projeté: ${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(kpis.runRate)}`}
        />
        <KpiCard 
          title="Retours" 
          value={kpis.retours} 
          colorClass="text-red"
          subtitle={`${kpis.caEncaisse > 0 ? ((kpis.retours / kpis.caEncaisse) * 100).toFixed(1) : 0}% du CA encaissé`}
        />
        <KpiCard 
          title="Net" 
          value={kpis.net} 
          colorClass="text-cyan"
        />
      </main>
      
      <div className="mt-8 text-text-3 text-xs">
        Data loaded: {events.length} events total.
      </div>
    </div>
  );
}
