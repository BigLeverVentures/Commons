export function postConnection(type: string) {
  if (type === 'ask') return { action: 'Offer help', prompt: 'How could you help with this ask?' }
  if (type === 'offer') return { action: 'Take up this offer', prompt: 'How would you like to make use of this offer?' }
  return { action: 'Get involved', prompt: 'How would you like to contribute or participate?' }
}
