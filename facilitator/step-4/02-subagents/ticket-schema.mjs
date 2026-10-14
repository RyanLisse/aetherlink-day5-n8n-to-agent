export const ticketSchema = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    sentiment: { type: 'string', enum: ['neutral', 'frustrated', 'angry'] },
    recommended_action: { type: 'string', enum: ['auto_reply', 'investigate', 'escalate'] },
    summary: { type: 'string' },
    risk_note: { type: 'string' },
    customer_reply: { type: 'string' },
  },
  required: ['priority', 'sentiment', 'recommended_action', 'summary', 'risk_note', 'customer_reply'],
  additionalProperties: false,
};
