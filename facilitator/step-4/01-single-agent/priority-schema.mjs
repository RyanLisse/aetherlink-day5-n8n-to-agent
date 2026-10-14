export const prioritySchema = {
  type: 'object',
  properties: {
    priority: { type: 'string', enum: ['low', 'medium', 'high'] },
    reason: { type: 'string' },
  },
  required: ['priority', 'reason'],
  additionalProperties: false,
};
