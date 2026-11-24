/**
 * CommunityStats - the shape of the live community numbers passed to the
 * Karibu home and about pages. Moved here from the deleted HeroTerminal
 * component so the type outlives the terminal code.
 */
export interface CommunityStats {
  discordMembers: number;
  whatsappMembers: number;
  linkedinMembers: number;
  totalMembers: number;
  eventsHeld: number;
  citiesActive: string[];
  resourceCount: number;
}
