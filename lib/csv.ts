/** RFC-style CSV cell escaping. */
export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

export function csvRow(cells: Array<string | number | boolean | null | undefined>): string {
  return cells.map(csvCell).join(",");
}

export function toCsv(headers: string[], rows: Array<Array<string | number | boolean | null | undefined>>): string {
  return [csvRow(headers), ...rows.map(csvRow)].join("\r\n") + "\r\n";
}
