import React from 'react';

interface KpiCardProps {
  title: string;
  value: number;
  colorClass: string;
  subtitle?: string;
  variation?: number;
}

export function KpiCard({ title, value, colorClass, subtitle, variation }: KpiCardProps) {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatVariation = (val: number) => {
    const sign = val >= 0 ? '+' : '';
    return `${sign}${(val * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-6 border border-line rounded-md bg-bg-1 flex flex-col justify-between">
      <h2 className="font-serif text-lg mb-2 text-text-1">{title}</h2>
      
      <div className="flex items-baseline gap-3">
        <p className={`text-4xl font-bold ${colorClass}`}>
          {formatCurrency(value)}
        </p>
        
        {variation !== undefined && (
          <span className={`text-sm font-bold ${variation >= 0 ? 'text-green' : 'text-red'}`}>
            {formatVariation(variation)}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-text-2 text-sm mt-2">{subtitle}</p>
      )}
    </div>
  );
}
