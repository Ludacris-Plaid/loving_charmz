'use client';

import { toCsv, downloadCsv, timestampedFilename } from '@/lib/admin/analytics/csv';

type ExportButtonProps = {
  filename: string;
  rows: Array<Record<string, unknown>>;
  className?: string;
  label?: string;
};

export function ExportButton({ filename, rows, className, label = 'Export CSV' }: ExportButtonProps) {
  function handleExport() {
    const csv = toCsv(rows);
    if (!csv) return;
    downloadCsv(timestampedFilename(filename), csv);
  }
  return (
    <button type="button" className={`analytics-control ${className ?? ''}`} onClick={handleExport} disabled={rows.length === 0}>
      <span aria-hidden>↓</span>
      {label} {rows.length > 0 && `(${rows.length})`}
    </button>
  );
}
