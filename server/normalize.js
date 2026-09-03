// Normalizes Setu's decrypted DEPOSIT FI data into the same
// {date, dir, amount, party, description, txnId} shape the app's statement
// importer produces (src/lib/statement.js), so the mobile app's review
// screen and store.importTxs don't need to know which source a row came
// from. The DEPOSIT transaction schema is standardized across the AA
// ecosystem (ReBIT spec) and Setu passes it through close to verbatim —
// confirm field names against a real sandbox response before relying on
// this, since a gateway occasionally renames a field.
function normalizeFiData(fiData) {
  const rows = [];
  const warnings = [];

  (fiData || []).forEach(account => {
    const txns = account?.data?.Account?.Transactions?.Transaction
      || account?.Account?.Transactions?.Transaction || [];
    (Array.isArray(txns) ? txns : [txns]).filter(Boolean).forEach(t => {
      const amount = parseFloat(t.amount ?? t._attributes?.amount ?? 0);
      if (!amount) return;

      const dir = String(t.type ?? t._attributes?.type ?? '').toUpperCase() === 'CREDIT' ? 'in' : 'out';
      const when = t.transactionTimestamp ?? t._attributes?.transactionTimestamp ?? t.valueDate;
      const date = when ? new Date(when).toISOString().slice(0, 10) : null;
      if (!date) { warnings.push('Skipped a transaction with no readable date.'); return; }

      const description = t.narration ?? t._attributes?.narration ?? '';
      rows.push({
        date, dir, amount: Math.round(amount * 100) / 100,
        party: description.slice(0, 40) || (dir === 'out' ? 'Bank debit' : 'Bank credit'),
        description,
        txnId: t.txnId ?? t._attributes?.txnId ?? t.reference ?? null,
      });
    });
  });

  return { rows, warnings };
}

module.exports = { normalizeFiData };
