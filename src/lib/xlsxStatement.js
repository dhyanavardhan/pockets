import * as officeCrypto from 'officecrypto-tool';
import * as XLSX from 'xlsx';

// Same column-name matching approach as statement.js's CSV parser —
// duplicated rather than shared, since bank CSV and XLSX exports use the
// same header conventions but arrive through different parsers.
const HEADERS = {
  date: ['date', 'txn date', 'transaction date', 'value date'],
  narration: ['narration', 'description', 'particulars', 'transaction remarks'],
  debit: ['debit', 'withdrawal amt', 'withdrawal amt.', 'debit amount'],
  credit: ['credit', 'deposit amt', 'deposit amt.', 'credit amount'],
  txnId: ['chq/ref no', 'chq/ref no.', 'ref no', 'ref no.', 'txn id', 'transaction id', 'reference number'],
};

function matchColumn(headerRow, names) {
  const idx = headerRow.findIndex(h => names.includes(String(h || '').toLowerCase().trim()));
  return idx === -1 ? null : idx;
}

function cellToDate(cell) {
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  const m = String(cell || '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!m) return null;
  let [, d, mo, y] = m;
  if (y.length === 2) y = '20' + y;
  const iso = `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return isNaN(new Date(iso + 'T00:00:00').getTime()) ? null : iso;
}

function cellToAmount(cell) {
  if (typeof cell === 'number') return Math.round(cell * 100) / 100;
  const raw = String(cell || '').replace(/[,\s₹]/g, '');
  if (raw === '' || raw === '-') return 0;
  const n = parseFloat(raw);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function normalizeGrid(grid) {
  const headerIdx = grid.findIndex(r =>
    matchColumn((r || []).map(c => String(c || '').toLowerCase()), HEADERS.date) !== null);
  if (headerIdx === -1) {
    return { rows: [], warnings: ['Could not find a header row with a recognisable date column.'] };
  }

  const header = grid[headerIdx].map(c => String(c || '').toLowerCase());
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
  for (let i = headerIdx + 1; i < grid.length; i++) {
    const r = grid[i] || [];
    if (r.length < 2) continue;
    const date = cellToDate(r[col.date]);
    if (!date) continue; // blank/summary rows

    const debit = col.debit !== null ? cellToAmount(r[col.debit]) : 0;
    const credit = col.credit !== null ? cellToAmount(r[col.credit]) : 0;
    if (debit === 0 && credit === 0) continue;

    const dir = debit > 0 ? 'out' : 'in';
    const amount = debit > 0 ? debit : credit;
    const description = col.narration !== null ? String(r[col.narration] || '') : '';
    const txnId = col.txnId !== null ? (String(r[col.txnId] || '').trim() || null) : null;

    rows.push({
      date, dir, amount,
      party: description.slice(0, 40) || (dir === 'out' ? 'Bank debit' : 'Bank credit'),
      description, txnId,
    });
  }

  return { rows, warnings: [] };
}

// Decrypts a password-protected .xlsx entirely on-device — no file or
// password ever leaves the phone. officecrypto-tool does the real
// MS-OFFCRYPTO decryption; its `require('crypto')` is routed to
// react-native-quick-crypto by metro.config.js, which is what actually runs
// the AES/SHA math (Hermes has no crypto module of its own). Once
// decrypted, SheetJS reads the resulting plain xlsx the same way it does on
// any platform.
export async function decryptAndParseXlsx(bytes, password) {
  const buffer = Buffer.from(bytes);
  const decrypted = officeCrypto.isEncrypted(buffer)
    ? await officeCrypto.decrypt(buffer, { password })
    : buffer;

  const wb = XLSX.read(decrypted, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

  return normalizeGrid(grid);
}
