export function parseMessages(markdown) {
  const sections = markdown.split(/^## (MSG-\d{2})\s*$/m).slice(1);
  const messages = [];

  for (let index = 0; index < sections.length; index += 2) {
    const id = sections[index];
    const content = sections[index + 1] ?? '';
    const match = content.match(/^\s*Subject: ([^\r\n]+)\r?\nCustomer: (CUST-\d{3})(?: \(([^)\r\n]+)\))?\r?\n\r?\n([\s\S]*?)\s*$/);

    if (!match) {
      throw new Error(`Invalid customer message section: ${id}`);
    }

    messages.push({
      id,
      subject: match[1],
      customer: match[2],
      customerName: match[3] ?? null,
      message: match[4],
    });
  }

  return messages;
}
