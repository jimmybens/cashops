# DASH FINANCE — Cadrage projet

> **Dashboard de pilotage poste client — MARIANNE Éducation**
> Web app Next.js connectée en lecture au Google Sheet `POINTAGE_CA`
> Cible utilisateur : DAF (Jimmy) + COMEX MARIANNE (lecture seule)

---

## 0. Quick start — pour reprendre le projet

```bash
git clone <repo>
cd dash-finance
pnpm install
cp .env.example .env.local      # remplir GOOGLE_SERVICE_ACCOUNT_KEY + SPREADSHEET_ID
pnpm dev                         # http://localhost:3000
```

**Pour déployer** : `git push` → Vercel auto-déploie (preview sur PR, production sur main).

**Pour comprendre le métier** : lire dans l'ordre [§1 Contexte](#1-contexte-métier) → [§3 Source de données](#3-source-de-données) → [§5 Périmètre MVP](#5-périmètre-mvp).

---

## 1. Contexte métier

### Le groupe

**MARIANNE Éducation** est un groupe d'enseignement privé. 3 filiales :

| Code | Nom | Activité | Modèle | V1 ? |
|------|-----|----------|--------|------|
| **PV** | PREVISION | Prépa bac | B2C | ✅ |
| **MD** | MEDIBOX | Prépa médecine | B2C | ✅ |
| **PF** | PERFORMA | BTS alternance | B2B / OPCO | ❌ V2 |

**Volumétrie** : ~2000 élèves par filiale × 6-8 paiements/an = **~14 000 paiements/an** par filiale.

### Le payeur n'est pas l'apprenant

Principe central : un encaissement vient potentiellement d'un parent, tuteur, ou tiers. L'objet métier pivot reste **l'apprenant** (= "qui suit la formation"), pas le payeur.

### Les 4 sources d'encaissement

```
1. Stripe        → CB pré-inscriptions (1× par élève)
2. GoCardless    → SEPA mensuels (échéanciers de scolarité)
3. Qonto         → Virements ponctuels reçus + reversements PSP
4. SG (chèques)  → Chèques multiples remis à l'inscription
```

---

## 2. Architecture globale du système (existant)

```
┌──────────────────────────────────────────────────────────────────┐
│  STACK ACTUEL — déjà opérationnel                                │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [Stripe] ─┐                                                     │
│  [GCL]    ─┼──→ Apps Script connecteurs ──→ Google Sheet        │
│  [Qonto]  ─┤    (cron quotidien 6h-7h)      "POINTAGE_CA"        │
│  [SG/chq] ─┘                                  ├── *_RAW_PV/MD    │
│                                               ├── JOURNAL_BANQUE │
│                                               └── ... 21 onglets │
│                                                       │          │
│                                                       ▼          │
│                            ┌───────────────────────────────────┐ │
│                            │   ⭐ NOUVEAU PROJET : DASH-FINANCE │ │
│                            │   Web app Next.js sur Vercel      │ │
│                            │   Lit le Sheet via Sheets API     │ │
│                            └───────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

**Le dashboard NE remplace PAS** l'Apps Script. Il **lit** ce que l'Apps Script produit.

---

## 3. Source de données

### Le Google Sheet `POINTAGE_CA`

**Sheet ID** : à récupérer dans l'URL du Sheet (variable d'env `SPREADSHEET_ID`).

**Onglets utiles pour le dashboard** :

#### `JOURNAL_BANQUE_PV` et `JOURNAL_BANQUE_MD` (sources primaires)

C'est **la table principale** que le dashboard doit lire. Une ligne = un événement de tréso constaté.

Schéma à 25 colonnes :

| Colonne | Type | Description |
|---------|------|-------------|
| `mvt_id` | string (PK) | Identifiant unique du mouvement |
| `parent_mvt_id` | string | FK self : parent pour les retours (refund → charge) |
| `source` | enum | `qonto`, `gcl`, `stripe`, `chq` |
| `event_type` | enum | `encaissement`, `retour`, `echec`, `depense` |
| `filiale` | enum | `PV`, `MD` |
| `event_date` | Date | Date de l'événement (jour de tréso constaté) |
| `event_timestamp` | string | Timestamp brut de la source |
| `montant` | number | Montant absolu en € |
| `sens` | enum | `credit` ou `debit` |
| `montant_signe` | number | `+montant` si credit, `-montant` si debit |
| `devise` | string | `EUR` |
| `statut_unifie` | enum | `encaisse`, `en_attente`, `echoue`, `rembourse`, `annule` |
| `statut_source` | string | Statut natif (paid_out, succeeded, etc.) |
| `contrepartie_brut` | string | Nom du payeur tel que reçu |
| `contrepartie_id_source` | string | ID dans la source |
| `contrepartie_iban` | string | IBAN si dispo |
| `reference_libelle` | string | Libellé / référence concaténés |
| `methode_paiement` | enum | `transfer`, `card`, `sepa`, `check` |
| `metadata_inscription_id` | string | ID inscription (depuis metadata GCL/Stripe) |
| `pertinence_poste_client` | enum | `oui` / `non` |
| `flag_anomalie` | string | `chargeback`, `impaye`, `refund`, `remboursement_scolarite`, etc. |
| `raw_sheet` | string | Onglet d'origine |
| `raw_id` | string | ID dans l'onglet d'origine |
| `import_batch_id` | string | ID du batch d'import |
| `import_timestamp` | Date | Timestamp d'import |

**Filtres déjà appliqués en amont** (pas à refaire côté dashboard) :
- ✅ GCL : seuls les statuts terminaux (`paid_out`, `failed`, `cancelled`, `charged_back`)
- ✅ Qonto debits : reclassés en `retour` si "remboursement" dans la note, sinon ignorés
- ✅ Qonto credits : reversements PSP (GoCardless/Stripe) déjà exclus pour éviter double-comptage
- ✅ Intragroupes (MARIANNE/PREVISION/MEDIBOX/PERFORMA) exclus

→ Le dashboard peut **faire confiance** à `event_type` et `pertinence_poste_client`.

#### `JOURNAL_BANQUE_SNAPSHOT_YYYY-MM_PV/MD` (snapshots immuables)

Onglets figés du mois M-1 pour le reporting COMEX. Même schéma que ci-dessus, mais avec une **ligne d'en-tête mergée** au-dessus du header (orange, "📸 SNAPSHOT FIGÉ — YYYY-MM"). Le dashboard peut les ignorer ou les utiliser comme alternative au journal vivant.

#### `JOURNAL_LOG`

Historique des builds du journal (batch_id, mode, durée, compteurs). Utile pour afficher un "Last sync" dans le header du dashboard.

---

## 4. Stack technique cible

### Frontend
- **Framework** : Next.js 15+ (App Router)
- **Langage** : TypeScript strict
- **Style** : Tailwind CSS + variables CSS custom (palette ci-dessous)
- **Charts** : Recharts (composants React natifs, bonne intégration TS)
- **Icons** : Lucide React
- **Date utils** : date-fns (locale fr)
- **State** : React Server Components par défaut, `useState` côté client uniquement pour filtres

### Data layer
- **Connexion Sheets** : `googleapis` (officiel) ou `google-spreadsheet` (plus simple)
- **Auth Google** : Service Account avec clé JSON (stockée dans env Vercel)
- **Cache** : Next.js `revalidate: 300` (5 min) sur les fetch — pas besoin de live-live

### Auth utilisateur
- **Provider** : NextAuth.js v5
- **Mode** : Google OAuth restreint au domaine `@marianne.fr` (ou similaire)
- **Pages protégées** : tout sauf `/login` et `/api/auth/*`
- **Permissions futures** : système de rôles via DB (Postgres Vercel ou Supabase) — V2

### Déploiement
- **Hébergeur** : Vercel
- **CI/CD** : auto-deploy GitHub → main = production, autres branches = preview
- **Variables d'env** :
  ```
  GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@xxx.iam.gserviceaccount.com
  GOOGLE_SERVICE_ACCOUNT_KEY="-----BEGIN PRIVATE KEY-----..."
  SPREADSHEET_ID=1ABC...
  NEXTAUTH_URL=https://dash-finance.vercel.app
  NEXTAUTH_SECRET=<openssl rand -base64 32>
  GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
  GOOGLE_OAUTH_CLIENT_SECRET=GOCSPX-xxx
  ALLOWED_DOMAIN=marianne.fr
  ```

### Setup Service Account (étape manuelle pré-projet)
1. Console Google Cloud → Créer projet "marianne-dash-finance"
2. Activer Sheets API
3. Créer Service Account "dash-finance-reader"
4. Télécharger clé JSON
5. **Partager le Sheet POINTAGE_CA en lecture** avec l'email du service account
6. Coller `client_email` et `private_key` dans `.env.local`

---

## 5. Périmètre MVP

### MVP — V1 du dashboard (scope cette mission)

**Objectif** : afficher en lecture seule, avec filtres, l'état du poste client en temps quasi-réel.

#### Page unique `/`
Layout 1 page, scroll vertical, sections empilées.

#### Header sticky
- Titre "MARIANNE · POSTE CLIENT"
- Sélecteur de filiale : `[ALL] [PV] [MD]`
- Sélecteur de période : `[MTD] [M-1] [YTD] [Custom...]`
- Indicateur "Last sync" (lit `JOURNAL_LOG`)
- Avatar utilisateur connecté

#### Section 1 — KPIs hero (3 cartes)
- **CA encaissé** (somme `montant_signe` où `event_type = encaissement`) + variation vs période précédente
- **Retours** (somme abs où `event_type = retour`) + % du brut
- **Net** (CA - retours) + projection fin de mois (run rate linéaire)

#### Section 2 — Encaissements / jour (chart aire)
- X = jours du mois, Y = € encaissés
- Lisser si trop de variance (moving average optionnel)
- Survol = tooltip détaillé

#### Section 3 — Mix de paiement (donut + table)
- 4 segments : Stripe / GCL / Qonto / Chèques
- % et montant absolu
- Couleurs distinctes (voir palette)

#### Section 4 — Taux d'échec par source (barres horizontales)
- Pour chaque source : `count(echoue) / count(total)`
- Inclure GCL `failed`/`cancelled`, Stripe `failed`, Chèques `flag_anomalie=impaye`
- Couleur conditionnelle (rouge si > seuil)

#### Section 5 — Top retours du mois (table)
- 10 lignes max, triées par montant abs DESC
- Colonnes : date, contrepartie, source, montant, motif (`flag_anomalie`)

#### Section 6 — Historique 12 mois (chart)
- Bars groupés par mois
- 2 séries : encaissements (vert) / retours (rouge)
- Filiale active

### Filtres globaux
Le sélecteur filiale + période **affecte toutes les sections simultanément**. État géré via URL search params (shareable).

### Pas dans le MVP
- ❌ Édition des données (lecture seule stricte)
- ❌ Drill-down élève par élève (V2 quand journal facturation existera)
- ❌ Comparaison de scénarios
- ❌ Export PDF/Excel (l'utilisateur peut prendre des captures pour le COMEX)
- ❌ Notifications / alertes
- ❌ Dashboard mobile-optimized (responsive basique suffit, focus desktop)

---

## 6. Esthétique — palette Bloomberg trading terminal

**Référence visuelle** : `marianne_present.html` dans le projet (présentation COMEX déjà validée).

### Variables CSS (à mettre dans `globals.css`)

```css
:root {
  /* Backgrounds — niveaux de profondeur */
  --bg-0: #0b0d10;       /* fond absolu */
  --bg-1: #111418;       /* surface */
  --bg-2: #181c22;       /* surface raised */
  --bg-3: #1f242b;       /* surface highest */

  /* Lines */
  --line: #2a313b;
  --line-soft: #1f242b;

  /* Texts — hiérarchie */
  --text-0: #e8eaed;     /* primary */
  --text-1: #9aa3ad;     /* secondary */
  --text-2: #5e6770;     /* dim */
  --text-3: #3d444c;     /* very dim */

  /* Signal colors */
  --amber: #f5a524;      /* primary signal */
  --amber-dim: #8a5d14;
  --cyan: #58c4dc;       /* secondary signal */
  --cyan-dim: #2c6e7d;

  /* Semantic */
  --green: #5ec27e;      /* positive (CA, encaissements) */
  --green-dim: #2f6c44;
  --red: #ec5b5b;        /* negative (retours, échecs) */
  --red-dim: #7c2c2c;
  --magenta: #c777aa;    /* tertiary */
}
```

### Typographie

```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600&display=swap" rel="stylesheet">
```

- **JetBrains Mono** : tous les chiffres, labels, données tabulaires (par défaut sur `<body>`)
- **Fraunces serif italique** : titres de section uniquement (`<h1>`, `<h2>` clés)
- Taille de base : 14px, line-height 1.5

### Couleurs par source de paiement

| Source | Couleur | Usage |
|--------|---------|-------|
| Stripe | `--cyan` | Bars, donut, lignes |
| GCL | `--amber` | Bars, donut, lignes |
| Qonto | `--magenta` | Bars, donut, lignes |
| Chèques | `--text-1` (gris) | Bars, donut, lignes |

### Touches signature

- **Grille de fond subtile** sur le `<body>` :
  ```css
  background-image:
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  background-size: 40px 40px;
  ```
- **Halos lumineux** en coins (`radial-gradient` ambre + cyan, opacité 4%)
- **Animations** : transitions douces 200ms, pas d'animations gratuites
- **Borders** : 1px solid `--line`, jamais de border-radius > 4px (esthétique terminal)
- **Chiffres clés** : taille importante (32-48px), font-weight 600, en `--amber` ou `--text-0`

---

## 7. Architecture du repo

```
dash-finance/
├── README.md                       # ← ce fichier en condensé + setup
├── dash_finance_projet.md          # ← le présent doc
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
├── .env.example
├── .gitignore
│
├── app/
│   ├── layout.tsx                  # layout root + auth
│   ├── globals.css                 # palette + typo + reset
│   ├── page.tsx                    # dashboard principal (MVP)
│   ├── login/
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   └── journal/route.ts        # endpoint qui lit le Sheet
│   └── components/
│       ├── KpiCard.tsx
│       ├── DailyChart.tsx
│       ├── PaymentMixDonut.tsx
│       ├── FailureRateBars.tsx
│       ├── TopReturnsTable.tsx
│       ├── MonthlyHistoryChart.tsx
│       ├── FilialeSelector.tsx
│       ├── PeriodSelector.tsx
│       └── ui/                     # primitives (Card, Button, etc.)
│
├── lib/
│   ├── google-sheets.ts            # client Sheets + parsing
│   ├── journal-types.ts            # types TS du schéma JOURNAL_BANQUE
│   ├── aggregations.ts             # logique métier (KPIs, mix, etc.)
│   ├── date-utils.ts
│   └── auth.ts                     # NextAuth config
│
└── public/
    └── (assets statiques si besoin)
```

---

## 8. Modèle de données TypeScript

```typescript
// lib/journal-types.ts

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
```

---

## 9. Logique d'agrégation (lib/aggregations.ts)

### KPIs hero
```typescript
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
  const runRate = (caEncaisse / daysElapsed) * daysInMonth;

  // Variation vs période précédente
  const prevCa = prevEvents
    .filter(e => e.event_type === 'encaissement')
    .reduce((s, e) => s + e.montant_signe, 0);
  const variationVsPrev = prevCa ? (caEncaisse - prevCa) / prevCa : 0;

  return { caEncaisse, retours, net, variationVsPrev, runRate };
}
```

### Mix de paiement
```typescript
export function computePaymentMix(events: JournalEvent[]): PaymentMix[] {
  const encaissements = events.filter(
    e => e.event_type === 'encaissement' && e.statut_unifie === 'encaisse'
  );
  const total = encaissements.reduce((s, e) => s + e.montant, 0);

  const sources: Source[] = ['gcl', 'stripe', 'qonto', 'chq'];
  return sources.map(source => {
    const evts = encaissements.filter(e => e.source === source);
    const amount = evts.reduce((s, e) => s + e.montant, 0);
    return {
      source,
      amount,
      share: total > 0 ? amount / total : 0,
      count: evts.length,
    };
  });
}
```

### Daily aggregates pour chart
```typescript
export function computeDaily(
  events: JournalEvent[],
  from: Date,
  to: Date
): DailyAggregate[] {
  const days = eachDayOfInterval({ start: from, end: to });
  return days.map(day => {
    const evts = events.filter(e => isSameDay(e.event_date, day));
    return {
      date: day,
      encaissements: evts
        .filter(e => e.event_type === 'encaissement' && e.statut_unifie === 'encaisse')
        .reduce((s, e) => s + e.montant, 0),
      retours: evts
        .filter(e => e.event_type === 'retour')
        .reduce((s, e) => s + e.montant, 0),
    };
  });
}
```

---

## 10. Connexion Sheets (lib/google-sheets.ts)

### Fonction principale
```typescript
import { google } from 'googleapis';

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
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range,
    });
    const [headers, ...rows] = res.data.values || [];
    if (!headers) continue;

    for (const row of rows) {
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
      results.push(parseJournalRow(obj));
    }
  }

  return results;
}

function parseJournalRow(raw: any): JournalEvent {
  return {
    mvt_id: String(raw.mvt_id || ''),
    parent_mvt_id: String(raw.parent_mvt_id || ''),
    source: raw.source as Source,
    event_type: raw.event_type as EventType,
    filiale: raw.filiale as Filiale,
    event_date: parseSheetDate(raw.event_date),
    event_timestamp: String(raw.event_timestamp || ''),
    montant: parseFloat(raw.montant) || 0,
    sens: raw.sens as Sens,
    montant_signe: parseFloat(raw.montant_signe) || 0,
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

function parseSheetDate(v: any): Date {
  if (!v) return new Date(0);
  if (v instanceof Date) return v;
  // Sheets renvoie souvent du ISO string, parfois du nombre série
  const d = new Date(v);
  return isNaN(d.getTime()) ? new Date(0) : d;
}
```

### Cache & revalidation
```typescript
// app/api/journal/route.ts
export const revalidate = 300;  // 5 min

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filiale = searchParams.get('filiale') as 'PV' | 'MD' | null;
  const events = await fetchJournalEvents(filiale ?? undefined);
  return Response.json({ events, fetchedAt: new Date().toISOString() });
}
```

---

## 11. Authentification (lib/auth.ts)

```typescript
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ALLOWED_DOMAIN = process.env.ALLOWED_DOMAIN ?? 'marianne.fr';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      // Restriction au domaine MARIANNE
      if (!profile?.email) return false;
      if (!profile.email.endsWith(`@${ALLOWED_DOMAIN}`)) return false;
      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
});
```

### Middleware Next.js
```typescript
// middleware.ts
import { auth } from '@/lib/auth';

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== '/login') {
    return Response.redirect(new URL('/login', req.url));
  }
});

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)'],
};
```

---

## 12. Plan de livraison

### Phase 1 — Bootstrap (≈ 30 min)
- [ ] Créer repo GitHub `dash-finance`
- [ ] `npx create-next-app@latest --typescript --tailwind --app`
- [ ] Installer deps : `googleapis next-auth recharts lucide-react date-fns`
- [ ] Setup palette CSS dans `globals.css`
- [ ] Créer Service Account Google + télécharger clé
- [ ] Créer projet Vercel et lier au repo
- [ ] Variables d'env locales et Vercel
- [ ] **Validation** : `pnpm dev` ouvre une page Next vide stylée

### Phase 2 — Connexion Sheet (≈ 45 min)
- [ ] Implémenter `lib/google-sheets.ts`
- [ ] Endpoint `/api/journal` qui retourne le JSON
- [ ] Page test `/debug` qui affiche `{events.length}`
- [ ] **Validation** : visiter `/debug` → on voit le bon nombre d'events

### Phase 3 — Layout & filtres (≈ 1h)
- [ ] `app/page.tsx` avec layout 6 sections
- [ ] `FilialeSelector`, `PeriodSelector` (state via URL params)
- [ ] Header sticky avec "Last sync"
- [ ] **Validation** : changer filtre = URL change + sections vides ne crashent pas

### Phase 4 — KPIs hero (≈ 1h)
- [ ] `lib/aggregations.ts` : `computeKpis`
- [ ] `KpiCard` avec animation chiffre + variation
- [ ] **Validation** : 3 cartes affichent les bonnes valeurs

### Phase 5 — Charts (≈ 2h)
- [ ] `DailyChart` (area chart Recharts)
- [ ] `PaymentMixDonut`
- [ ] `FailureRateBars`
- [ ] `TopReturnsTable`
- [ ] `MonthlyHistoryChart`
- [ ] **Validation** : chaque section répond aux filtres

### Phase 6 — Auth & deploy (≈ 45 min)
- [ ] `NextAuth.js` avec Google + restriction domaine
- [ ] Middleware de protection
- [ ] Page `/login` minimaliste
- [ ] Déploiement Vercel
- [ ] **Validation** : autre compte non-MARIANNE = bloqué

### Phase 7 — Polish (≈ 1h)
- [ ] Animations d'apparition (intersection observer)
- [ ] États de loading (skeletons)
- [ ] Gestion erreurs (Sheet inaccessible, etc.)
- [ ] Mobile responsive minimal
- [ ] Favicon, OG image

**Total estimé : 6h30 de travail effectif** (étalable sur 3-4 sessions).

---

## 13. Conventions de code

### Naming
- Composants : `PascalCase.tsx`
- Hooks : `useCamelCase.ts`
- Utils : `camelCase.ts`
- Types : `PascalCase` dans `types.ts`
- Variables CSS : `--kebab-case`

### Imports
- Aliases : `@/lib/*`, `@/app/components/*`
- Pas de `import * as ...` sauf cas exceptionnels (recharts)
- Tri alphabétique optionnel mais recommandé

### Commentaires
- En français, comme le reste du projet
- Privilégier les commentaires "pourquoi" plutôt que "quoi"
- Marquer les TODO avec `// TODO(claude):` pour facilement repérer

### Git
- Messages commits en français, format : `[type] description courte`
  - Types : `feat`, `fix`, `style`, `refactor`, `docs`, `chore`
  - Ex : `[feat] ajout du chart d'historique 12 mois`
- Branche main protégée, PR avec preview Vercel

---

## 14. Don'ts — pièges à éviter

1. **Ne pas refaire les filtres anti-pollution** : ils sont déjà dans Apps Script. Le dashboard fait confiance à `event_type` et `pertinence_poste_client`.

2. **Ne pas requêter le Sheet à chaque interaction utilisateur** : utiliser le cache Next.js (`revalidate: 300`) + state local pour les filtres.

3. **Ne pas écrire dans le Sheet** : scope `.readonly` strict. Le dashboard est une vue uniquement.

4. **Ne pas exposer le Sheet ID dans le client** : tout passe par les Server Components / API Routes.

5. **Ne pas oublier `NEXTAUTH_URL` en prod** : doit matcher l'URL Vercel exacte sinon redirections cassées.

6. **Ne pas trader l'esthétique pour de la simplicité** : la promesse à Jimmy = "trading terminal Bloomberg". Ne pas livrer du shadcn/ui par défaut sans le re-styler.

7. **Ne pas oublier que les données sont en français** : montants `1 234,56 €`, dates `dd/mm/yyyy`, locale `fr-FR` partout.

8. **Ne pas ignorer la perf** : un journal à 30k lignes parsé au runtime à chaque requête, c'est lent. Cache + memoization indispensables.

---

## 15. Évolutions futures (V2+)

| Feature | Prio | Complexité | Notes |
|---------|------|------------|-------|
| Drill-down élève par élève | 🔴 Haute | Moyenne | Nécessite le journal facturation (autre projet) |
| Comparaison multi-périodes | 🟡 Moyenne | Faible | Layer sur les charts existants |
| Export PDF du dashboard | 🟢 Basse | Moyenne | Puppeteer côté serveur |
| Alertes (impayés > seuil) | 🟡 Moyenne | Moyenne | Cron Vercel + email |
| PERFORMA (B2B/OPCO) | 🔴 Haute | Haute | Modèle de données différent |
| Connexion Pennylane (compta) | 🟢 Basse | Haute | Réconciliation comptable |
| Multi-tenant (autres CFOs) | 🟢 Basse | Très haute | Refactor complet |

---

## 16. Documents de référence du projet

Tous dans `/mnt/project/` :

- `01_CADRAGE_MARIANNE_v0_3.md` — vision projet, sources, typologie impayés
- `02_MAPPING_NORMALISATION.md` — schéma cible "Registre Exabanque enrichi"
- `03_PSEUDOCODE_MOTEUR.md` — orchestrateur, aspirateurs, matching cascade
- `04_PLAN_ATTAQUE_P1.md` — 11 lots sur 6 semaines, schémas SQL Supabase
- `marianne_present.html` — référence esthétique COMEX (palette + style)

**Code Apps Script existant** (pas dans ce repo, mais référencé) :
- `00_common.gs` — orchestrateurs et menu
- `qonto_connector.gs` — aspirateur Qonto
- `gcl_connector.gs` — aspirateur GoCardless
- `chq_connector.gs` — aspirateur Chèques SG
- `stripe_connector.gs` — aspirateur Stripe (en attente de clés)
- `journal_banque_builder.gs` — builder du JOURNAL_BANQUE (4 modes)

---

## 17. Contact projet

- **Sponsor** : Jimmy, DAF MARIANNE (mandant CFO externe BSSN CORP SAS)
- **Builder principal** : Claude (Anthropic) en pair programming avec Jimmy
- **Code IDE** : Claude Code + Cursor (ou Antigravity)

---

**Fin du brief.**

Pour démarrer : ouvrir ce fichier dans Cursor/Claude Code, demander à l'agent de lire ce doc puis lancer la Phase 1 du plan de livraison.
