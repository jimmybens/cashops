import type {
  ApprenantsMonthlyData,
  ApprenantMonthCell,
} from '@/lib/aggregations';
import type { MethodePaiement } from '@/lib/journal-types';

const METHOD_LABEL: Record<MethodePaiement, string> = {
  check: 'CHQ',
  transfer: 'VIR',
  sepa: 'PRELV',
  card: 'CB',
  '': '—',
};

const METHOD_CLASS: Record<MethodePaiement, string> = {
  check: 'text-text-1 bg-bg-3',
  transfer: 'text-magenta bg-[#3a2433]',
  sepa: 'text-amber bg-[#3a2c14]',
  card: 'text-cyan bg-[#1a3640]',
  '': 'text-text-3 bg-bg-2',
};

const eurFmt = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const FR_MONTHS = [
  'janv.',
  'févr.',
  'mars',
  'avr.',
  'mai',
  'juin',
  'juil.',
  'août',
  'sept.',
  'oct.',
  'nov.',
  'déc.',
];

function formatMonth(yearMonth: string): { label: string; year: string } {
  const [y, m] = yearMonth.split('-');
  return { label: FR_MONTHS[Number(m) - 1] ?? m, year: y.slice(2) };
}

function MethodBadges({ cell }: { cell: ApprenantMonthCell }) {
  const byMethod = new Map<MethodePaiement, number>();
  for (const p of cell.payments) {
    byMethod.set(p.method, (byMethod.get(p.method) ?? 0) + p.amount);
  }
  const ordered: MethodePaiement[] = ['check', 'transfer', 'sepa', 'card', ''];
  return (
    <div className="flex gap-0.5 justify-end mt-0.5">
      {ordered
        .filter(m => byMethod.has(m))
        .map(m => (
          <span
            key={m}
            className={`px-1 py-px text-[9px] font-mono rounded-sm ${METHOD_CLASS[m]}`}
          >
            {METHOD_LABEL[m]}
          </span>
        ))}
    </div>
  );
}

function Cell({ cell }: { cell: ApprenantMonthCell | undefined }) {
  if (!cell || cell.total === 0) {
    return <span className="text-text-3">·</span>;
  }
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="text-text-0 font-medium tabular-nums">
        {eurFmt.format(cell.total)}
      </span>
      <MethodBadges cell={cell} />
    </div>
  );
}

export function ApprenantsTable({ data }: { data: ApprenantsMonthlyData }) {
  if (data.rows.length === 0) {
    return (
      <div className="border border-line rounded-md bg-bg-1 p-8 text-center text-text-2">
        Aucun encaissement effectif trouvé.
      </div>
    );
  }

  return (
    <div className="border border-line rounded-md bg-bg-1 overflow-auto max-h-[calc(100vh-200px)]">
      <table className="min-w-full text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky top-0 left-0 z-30 bg-bg-2 text-left px-3 py-2 border-b border-r border-line text-text-1 font-medium min-w-[260px]">
              Apprenant / Payeur
            </th>
            <th className="sticky top-0 z-20 bg-bg-2 text-center px-3 py-2 border-b border-line text-text-2 font-medium">
              Filiale
            </th>
            {data.months.map(m => {
              const { label, year } = formatMonth(m);
              return (
                <th
                  key={m}
                  className="sticky top-0 z-20 bg-bg-2 text-right px-3 py-2 border-b border-line text-text-1 font-medium whitespace-nowrap min-w-[110px]"
                >
                  <div className="text-text-0">{label}</div>
                  <div className="text-text-3 text-[10px] font-normal">{`'${year}`}</div>
                </th>
              );
            })}
            <th className="sticky top-0 right-0 z-30 bg-bg-2 text-right px-3 py-2 border-b border-l border-line text-amber font-bold min-w-[110px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, idx) => (
            <tr
              key={row.key}
              className={idx % 2 === 0 ? 'bg-bg-1' : 'bg-[#0e1115]'}
            >
              <td
                className={`sticky left-0 z-10 px-3 py-2 border-b border-r border-line-soft text-text-0 font-medium truncate ${
                  idx % 2 === 0 ? 'bg-bg-1' : 'bg-[#0e1115]'
                }`}
                title={row.label}
              >
                {row.label}
              </td>
              <td className="text-center px-3 py-2 border-b border-line-soft text-text-2 font-mono">
                {row.filiale}
              </td>
              {data.months.map(m => (
                <td
                  key={m}
                  className="text-right px-3 py-2 border-b border-line-soft align-top"
                >
                  <Cell cell={row.byMonth[m]} />
                </td>
              ))}
              <td
                className={`sticky right-0 z-10 text-right px-3 py-2 border-b border-l border-line-soft text-amber font-bold tabular-nums ${
                  idx % 2 === 0 ? 'bg-bg-1' : 'bg-[#0e1115]'
                }`}
              >
                {eurFmt.format(row.totalAll)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td
              colSpan={2}
              className="sticky bottom-0 left-0 z-20 bg-bg-3 px-3 py-2 border-t border-line text-text-1 font-bold"
            >
              TOTAL ({data.rows.length} apprenants)
            </td>
            {data.months.map(m => {
              const total = data.rows.reduce(
                (s, r) => s + (r.byMonth[m]?.total ?? 0),
                0,
              );
              return (
                <td
                  key={m}
                  className="sticky bottom-0 z-10 bg-bg-3 text-right px-3 py-2 border-t border-line text-text-0 font-bold tabular-nums"
                >
                  {total > 0 ? eurFmt.format(total) : '·'}
                </td>
              );
            })}
            <td className="sticky bottom-0 right-0 z-20 bg-bg-3 text-right px-3 py-2 border-t border-l border-line text-amber font-bold tabular-nums">
              {eurFmt.format(data.grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
