export type Source = 'qonto' | 'gcl' | 'stripe' | 'chq';
export type EventType = 'encaissement' | 'retour' | 'echec' | 'depense';
export type Filiale = 'PV' | 'MD';
export type Sens = 'credit' | 'debit';
export type StatutUnifie = 'encaisse' | 'en_attente' | 'echoue' | 'rembourse' | 'annule';
export type MethodePaiement = 'transfer' | 'card' | 'sepa' | 'check' | '';

export interface JournalEvent {
  mvt_id: string;
  parent_mvt_id: string;
  source: Source;
  event_type: EventType;
  filiale: Filiale;
  event_date: Date;
  event_timestamp: string;
  montant: number;
  sens: Sens;
  montant_signe: number;
  devise: string;
  statut_unifie: StatutUnifie;
  statut_source: string;
  contrepartie_brut: string;
  contrepartie_id_source: string;
  contrepartie_iban: string;
  reference_libelle: string;
  methode_paiement: MethodePaiement;
  metadata_inscription_id: string;
  pertinence_poste_client: 'oui' | 'non';
  flag_anomalie: string;
  raw_sheet: string;
  raw_id: string;
  import_batch_id: string;
  import_timestamp: Date;
}

// Filtre actif depuis l'UI
export interface DashboardFilter {
  filiale: 'ALL' | 'PV' | 'MD';
  period: { from: Date; to: Date };
}

// Agrégations calculées
export interface KpiStats {
  caEncaisse: number;
  retours: number;          // valeur absolue
  net: number;              // caEncaisse - retours
  variationVsPrev: number;  // ratio (ex: 0.042 = +4.2%)
  runRate: number;          // projection fin de mois
}

export interface PaymentMix {
  source: Source;
  amount: number;
  share: number;            // 0..1
  count: number;
}

export interface DailyAggregate {
  date: Date;
  encaissements: number;
  retours: number;
}

export interface FailureRate {
  source: Source;
  failed: number;
  total: number;
  rate: number;             // 0..1
}
