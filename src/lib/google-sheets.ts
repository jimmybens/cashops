import { google } from 'googleapis';
import { JournalEvent, Source, EventType, Filiale, Sens, StatutUnifie, MethodePaiement } from './journal-types';

export async function fetchJournalEvents(
  filiale?: 'PV' | 'MD'
): Promise<JournalEvent[]> {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const filiales = filiale ? [filiale] : ['PV', 'MD'];
  const results: JournalEvent[] = [];

  for (const f of filiales) {
    const range = `JOURNAL_BANQUE_${f}!A:Y`;
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range,
      });
      const rows = res.data.values || [];
      if (rows.length === 0) continue;

      const [headers, ...dataRows] = rows;
      
      for (const row of dataRows) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj: any = {};
        headers.forEach((h: string, i: number) => { obj[h] = row[i] ?? ''; });
        results.push(parseJournalRow(obj));
      }
    } catch (error) {
      console.error(`Error fetching data for filiale ${f}:`, error);
    }
  }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseJournalRow(raw: any): JournalEvent {
  return {
    mvt_id: String(raw.mvt_id || ''),
    parent_mvt_id: String(raw.parent_mvt_id || ''),
    source: raw.source as Source,
    event_type: raw.event_type as EventType,
    filiale: raw.filiale as Filiale,
    event_date: parseSheetDate(raw.event_date),
    event_timestamp: String(raw.event_timestamp || ''),
    montant: parseFloat(String(raw.montant || '0').replace(',', '.')) || 0,
    sens: raw.sens as Sens,
    montant_signe: parseFloat(String(raw.montant_signe || '0').replace(',', '.')) || 0,
    devise: String(raw.devise || 'EUR'),
    statut_unifie: raw.statut_unifie as StatutUnifie,
    statut_source: String(raw.statut_source || ''),
    contrepartie_brut: String(raw.contrepartie_brut || ''),
    contrepartie_id_source: String(raw.contrepartie_id_source || ''),
    contrepartie_iban: String(raw.contrepartie_iban || ''),
    reference_libelle: String(raw.reference_libelle || ''),
    methode_paiement: raw.methode_paiement as MethodePaiement,
    metadata_inscription_id: String(raw.metadata_inscription_id || ''),
    pertinence_poste_client: raw.pertinence_poste_client === 'oui' ? 'oui' : 'non',
    flag_anomalie: String(raw.flag_anomalie || ''),
    raw_sheet: String(raw.raw_sheet || ''),
    raw_id: String(raw.raw_id || ''),
    import_batch_id: String(raw.import_batch_id || ''),
    import_timestamp: parseSheetDate(raw.import_timestamp),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSheetDate(v: any): Date {
  if (!v) return new Date(0);
  if (v instanceof Date) return v;
  
  // Sheet dates might come as DD/MM/YYYY or ISO
  if (typeof v === 'string') {
    // If it's DD/MM/YYYY
    const parts = v.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
  }
  
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
