import React from "react";
import { HIDDEN_FIELDS, dataFieldLabels, formatDataValue, readWarnings } from "../lib/careLogLabels";

/** Hiện CareLog.Data bằng nhãn tiếng Việt; cảnh báo chỉ số hiện thành khối riêng. */
const CareLogDataDetails: React.FC<{ data: Record<string, unknown> | null | undefined }> = ({ data }) => {
  if (!data) return null;
  const warnings = readWarnings(data);
  const fields = Object.entries(data).filter(([key, value]) => !HIDDEN_FIELDS.has(key) && value !== null && value !== undefined && value !== "");
  if (fields.length === 0 && warnings.length === 0) return null;
  return (
    <div className="mt-3 space-y-2">
      {warnings.length > 0 && (
        <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {warnings.map((warning) => <li key={warning}>⚠ {warning}</li>)}
        </ul>
      )}
      {fields.length > 0 && (
        <dl className="grid gap-x-4 gap-y-2 rounded-lg bg-white p-3 text-xs ring-1 ring-slate-100 sm:grid-cols-2">
          {fields.map(([key, value]) => (
            <div key={key} className="flex justify-between gap-3">
              <dt className="text-slate-500">{dataFieldLabels[key]?.label ?? key}</dt>
              <dd className="text-right font-medium text-slate-700">{formatDataValue(key, value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
};

export default CareLogDataDetails;
