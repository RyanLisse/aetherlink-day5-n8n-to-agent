export const routes = {
  low: { action: 'AUTO_REPLY', team: 'Self-service support' },
  medium: { action: 'INVESTIGATE', team: 'Support team' },
  high: { action: 'ESCALATE', team: 'Payments escalation team' },
};

export function route(priority) {
  if (typeof priority !== 'string') {
    return null;
  }

  return routes[priority.toLowerCase()] ?? null;
}
