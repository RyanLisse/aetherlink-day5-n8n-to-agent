const fields = new Map([
  ['Transaction ID', 'transactionId'],
  ['Customer', 'customer'],
  ['Amount', 'amount'],
  ['Status', 'status'],
  ['Date', 'date'],
  ['Currency', 'currency'],
  ['Issue Details', 'issueDetails'],
  ['Fraud Flag', 'fraudFlag'],
]);

export function rowsToTransactions(rows) {
  const headers = rows[0] ?? [];
  const columns = headers.map((header) => fields.get(header));

  return rows.slice(1).map((row) => Object.fromEntries(
    columns.flatMap((key, index) => (key ? [[key, row[index]]] : [])),
  ));
}

export function findTransaction(transactions, id) {
  return transactions.find((transaction) => transaction.transactionId === id) ?? null;
}

export const STATUSES = ['COMPLETED', 'DECLINED', 'PENDING', 'REFUNDED', 'FAILED', 'DUPLICATE'];

export function listTransactions(transactions, { status, customer, fraudFlag, limit = 20 } = {}) {
  const needle = customer?.toLowerCase();
  const matches = transactions.filter((transaction) => (
    (!status || transaction.status === status)
    && (!needle || String(transaction.customer).toLowerCase().includes(needle))
    && (!fraudFlag || transaction.fraudFlag === fraudFlag)
  ));

  return { count: matches.length, transactions: matches.slice(0, limit) };
}
