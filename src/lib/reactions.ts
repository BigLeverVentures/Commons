export const REACTIONS = [
 {kind:'appreciate',label:'Appreciate'},
 {kind:'inspired',label:'Inspired'},
 {kind:'celebrate',label:'Celebrate'},
] as const
export type ReactionKind = typeof REACTIONS[number]['kind']
export type ReactionCounts = Record<ReactionKind,number>
export type ReactionActor = {name:string;avatarPath:string|null;avatarStyle:string|null;kind:ReactionKind}
export function isReaction(value:unknown):value is ReactionKind {return REACTIONS.some(reaction=>reaction.kind===value)}
export function reactionCounts(rows:{kind:string;count:number|string}[]):ReactionCounts {
 const result={celebrate:0,inspired:0,appreciate:0}
 for(const row of rows)if(isReaction(row.kind))result[row.kind]=Number(row.count)
 return result
}
