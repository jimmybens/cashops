import { differenceInDays, startOfMonth, getDaysInMonth, isSameDay, eachDayOfInterval } from 'date-fns';
import { JournalEvent, DashboardFilter, KpiStats, PaymentMix, DailyAggregate, FailureRate, Source } from './journal-types';

export function filterEvents(events: JournalEvent[], filter: DashboardFilter): JournalEvent[] {
  return events.filter(e => {
    // 1. Filiale filter
    if (filter.filiale !== 'ALL' && e.filiale !== filter.filiale) {
      return false;
    }
    
    // 2. Period filter
    const edate = e.event_date.getTime();
    if (edate < filter.period.from.getTime() || edate > filter.period.to.getTime()) {
      return false;
    }
    
    // 3. Pertinence poste client
    if (e.pertinence_poste_client === 'non') {
      return false;
    }
    
    return true;
  });
}

export function computeKpis(
  events: JournalEvent[],
  filter: DashboardFilter,
  prevEvents: JournalEvent[]
): KpiStats {
  const filtered = filterEvents(events, filter);

  const caEncaisse = filtered
    .filter(e => e.event_type === 'encaissement' && e.statut_unifie === 'encaisse')
    .reduce((s, e) => s + e.montant_signe, 0);

  const retours = Math.abs(filtered
    .filter(e => e.event_type === 'retour')
    .reduce((s, e) => s + e.montant_signe, 0));

  const net = caEncaisse - retours;

  // Run rate : (CA jusqu'à aujourd'hui / jours écoulés) × jours dans le mois
  const today = new Date();
  const daysElapsed = differenceInDays(today, startOfMonth(today)) + 1;
  const daysInMonth = getDaysInMonth(today);
  const runRate = daysElapsed > 0 ? (caEncaisse / daysElapsed) * daysInMonth : 0;

  // Variation vs période précédente
  const prevCa = prevEvents
    .filter(e => e.event_type === 'encaissement' && e.statut_unifie === 'encaisse')
    .reduce((s, e) => s + e.montant_signe, 0);
  const variationVsPrev = prevCa ? (caEncaisse - prevCa) / Math.abs(prevCa) : 0;

  return { caEncaisse, retours, net, variationVsPrev, runRate };
}
