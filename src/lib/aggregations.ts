import { differenceInDays, startOfMonth, getDaysInMonth, format } from 'date-fns';
import { JournalEvent, DashboardFilter, KpiStats, MethodePaiement, Source, Filiale } from './journal-types';

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

// === Encaissements mensuels par élève ===

export interface ApprenantPayment {
  method: MethodePaiement;
  source: Source;
  amount: number;
  date: Date;
}

export interface ApprenantMonthCell {
  total: number;
  payments: ApprenantPayment[];
}

export interface ApprenantRow {
  key: string;
  label: string;
  filiale: Filiale;
  byMonth: Record<string, ApprenantMonthCell>;
  totalAll: number;
}

export interface ApprenantsMonthlyData {
  months: string[];
  rows: ApprenantRow[];
  grandTotal: number;
}

/**
 * Agrège les encaissements EFFECTIFS (event_type=encaissement & statut=encaisse)
 * en lignes = élèves (regroupés par contrepartie ou inscription_id) et colonnes = mois.
 */
export function computeApprenantsMonthly(events: JournalEvent[]): ApprenantsMonthlyData {
  const filtered = events.filter(
    e =>
      e.event_type === 'encaissement' &&
      e.statut_unifie === 'encaisse' &&
      e.pertinence_poste_client === 'oui' &&
      e.event_date.getFullYear() > 2000
  );

  const monthsSet = new Set<string>();
  const rowsMap = new Map<string, ApprenantRow>();
  let grandTotal = 0;

  for (const e of filtered) {
    const monthKey = format(e.event_date, 'yyyy-MM');
    monthsSet.add(monthKey);

    const studentKey =
      (e.contrepartie_brut && e.contrepartie_brut.trim()) ||
      e.metadata_inscription_id ||
      'INCONNU';
    const studentLabel = e.contrepartie_brut?.trim() || e.metadata_inscription_id || 'Inconnu';

    let row = rowsMap.get(studentKey);
    if (!row) {
      row = {
        key: studentKey,
        label: studentLabel,
        filiale: e.filiale,
        byMonth: {},
        totalAll: 0,
      };
      rowsMap.set(studentKey, row);
    }

    if (!row.byMonth[monthKey]) {
      row.byMonth[monthKey] = { total: 0, payments: [] };
    }
    row.byMonth[monthKey].total += e.montant;
    row.byMonth[monthKey].payments.push({
      method: e.methode_paiement,
      source: e.source,
      amount: e.montant,
      date: e.event_date,
    });
    row.totalAll += e.montant;
    grandTotal += e.montant;
  }

  const months = Array.from(monthsSet).sort();
  const rows = Array.from(rowsMap.values()).sort((a, b) => b.totalAll - a.totalAll);

  return { months, rows, grandTotal };
}
