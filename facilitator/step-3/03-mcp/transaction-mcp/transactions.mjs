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

const recordKeys = ['transactionId', ...fields.values()].filter((key, index, keys) => keys.indexOf(key) === index);
const changeKeys = ['status', 'amount', 'issueDetails', 'fraudFlag'];

const toRecord = (values) => Object.fromEntries(recordKeys.flatMap((key) => (key in values ? [[key, values[key]]] : [])));

export function listTransactions(transactions, { status, customer, fraudFlag, limit = 20 } = {}) {
  const needle = customer?.toLowerCase();
  const matches = transactions.filter((transaction) => (
    (!status || transaction.status === status)
    && (!needle || String(transaction.customer).toLowerCase().includes(needle))
    && (!fraudFlag || transaction.fraudFlag === fraudFlag)
  ));

  return { count: matches.length, transactions: matches.slice(0, limit) };
}

export function nextTransactionId(transactions) {
  const highest = Math.max(0, ...transactions.map(({ transactionId }) => Number(/^TX-(\d+)$/.exec(transactionId)?.[1] ?? 0)));
  return `TX-${String(highest + 1).padStart(4, '0')}`;
}

export function addTransaction(transactions, values) {
  const record = toRecord({ ...values, transactionId: nextTransactionId(transactions) });
  return { transactions: [...transactions, record], record };
}

export function updateTransaction(transactions, id, changes) {
  const before = findTransaction(transactions, id);

  if (!before) {
    return null;
  }

  const allowed = Object.fromEntries(changeKeys.flatMap((key) => (changes[key] === undefined ? [] : [[key, changes[key]]])));
  const after = { ...before, ...allowed };

  return {
    transactions: transactions.map((transaction) => (transaction === before ? after : transaction)),
    before,
    after,
  };
}

export function deleteTransaction(transactions, id) {
  const record = findTransaction(transactions, id);

  if (!record) {
    return null;
  }

  return { transactions: transactions.filter((transaction) => transaction !== record), record };
}
