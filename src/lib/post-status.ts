export const PROJECT_STATES = [
  { value: 'open', label: 'Welcoming collaboration' },
  { value: 'closed', label: 'Not seeking collaboration' },
  { value: 'ended', label: 'No longer operating' },
] as const
const ASK_STATES = [
  {value:'open',label:'Still looking'},
  {value:'closed',label:'Help found'},
  {value:'ended',label:'No longer needed'},
] as const
const OFFER_STATES = [
  {value:'open',label:'Available'},
  {value:'closed',label:'Taking a pause'},
  {value:'ended',label:'No longer offered'},
] as const
export function postStates(type:string) {return type==='ask'?ASK_STATES:type==='offer'?OFFER_STATES:PROJECT_STATES}
export function postStatusLabel(status: string,type='project'): string {
  return postStates(type).find(state => state.value === status)?.label ?? 'Unavailable'
}
export function validPostStatus(status: string): boolean {
  return PROJECT_STATES.some(state => state.value === status)
}
