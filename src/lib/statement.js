// Best-effort CSV parser for Indian bank statement exports. Layouts vary by
// bank, so columns are matched by name (case-insensitively) rather than
// position, and rows that can't be read are reported instead of dropped
// silently.

const HEADERS = {
  date: ['date', 'txn date', 'transaction date', 'value date'],
  narration: ['narration', 'description', 'particulars', 'transaction remarks', 'details'],
  debit: ['debit', 'withdrawal amt', 'withdrawal amt.', 'debit amount'],
  credit: ['credit', 'deposit amt', 'deposit amt.', 'credit amount'],
  txnId: ['chq/ref no', 'chq/ref no.', 'ref no', 'ref no.', 'ref no/cheque no', 'txn id', 'transaction id', 'reference number'],
};

// UPI narrations bury the actual counterparty inside a delimited string, e.g.
// "WDL TFR  UPI/DR/881030914441/Shobha N P/YESB/...": the segment right
// after the numeric reference is the payee/payer name. Pull that out instead
// of showing the raw narration or a generic label.
function extractParty(description, dir) {
  const m = description.match(/\bUPI\/(?:DR|CR)\/\d+\/([^/]+)\//i)
    || description.match(/\bUPI-(?:DR|CR)-\d+-([^-]+)-/i);
  if (m) return m[1].trim();
  return description.slice(0, 40) || (dir === 'out' ? 'Bank debit' : 'Bank credit');
}

function splitLine(line) {
  // Handles quoted fields containing commas, which plain split(',') breaks on.
  const out = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim().replace(/^"|"$/g, ''));
}

function matchColumn(headerRow, names) {
  const idx = headerRow.findIndex(h => names.includes(h.toLowerCase().trim()));
  return idx === -1 ? null : idx;
}

// DD/MM/YYYY or DD-MM-YYYY, the common Indian bank statement date format.
function parseStatementDate(text) {
  const m = text.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  const iso = `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(new Date(iso + 'T00:00:00').getTime()) ? null : iso;
}

function parseAmount(text) {
  const raw = text.replace(/[,\s₹]/g, '');
  if (raw === '' || raw === '-') return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

// A row matches an existing tx by txnId when both have one, otherwise by an
// exact date+amount+description fingerprint. Shared between the store (which
// enforces it on import) and the review screen (which previews it).
export function isDuplicateTx(existingTxs, row) {
  return existingTxs.some(t =>
    (row.txnId && t.txnId === row.txnId) ||
    (!row.txnId && !t.txnId && t.party === row.party && t.amount === row.amount &&
     t.description === (row.description || '') &&
     new Date(t.at).toISOString().slice(0, 10) === row.date)
  );
}

export function parseStatementCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  const warnings = [];
  const headerIdx = lines.findIndex(l => matchColumn(splitLine(l).map(h => h.toLowerCase()), HEADERS.date) !== null);
  if (headerIdx === -1) {
    return { rows: [], warnings: ['Could not find a header row with a recognisable date column.'] };
  }
  const header = splitLine(lines[headerIdx]).map(h => h.toLowerCase());
  const col = {
    date: matchColumn(header, HEADERS.date),
    narration: matchColumn(header, HEADERS.narration),
    debit: matchColumn(header, HEADERS.debit),
    credit: matchColumn(header, HEADERS.credit),
    txnId: matchColumn(header, HEADERS.txnId),
  };
  if (col.debit === null && col.credit === null) {
    return { rows: [], warnings: ['Could not find a debit or credit amount column.'] };
  }

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.length < 2) continue;
    const date = parseStatementDate(cells[col.date] || '');
    if (!date) { warnings.push(`Row ${i + 1}: unreadable date "${cells[col.date] || ''}", skipped.`); continue; }

    const debit = col.debit !== null ? parseAmount(cells[col.debit] || '') : 0;
    const credit = col.credit !== null ? parseAmount(cells[col.credit] || '') : 0;
    if (debit === 0 && credit === 0) continue; // blank/total rows

    const dir = debit > 0 ? 'out' : 'in';
    const amount = debit > 0 ? debit : credit;
    const description = col.narration !== null ? cells[col.narration] || '' : '';
    const txnId = col.txnId !== null ? (cells[col.txnId] || '').trim() || null : null;

    rows.push({
      date, dir, amount,
      party: extractParty(description, dir),
      description,
      txnId,
    });
  }

  return { rows, warnings };
}
