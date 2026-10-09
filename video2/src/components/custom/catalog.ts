/**
 * The custom explainer components as data (no React), for the shot resolver and the director prompt. Each one is a
 * single animated beat on parchment for one event; the director may use one only where the narration covers that
 * event. src/components/custom/registry.ts maps the same names to components (tests keep the two in step).
 */
export interface CustomEntry {
  /** What the viewer sees, for the director. */
  shows: string;
  /** Narration it fits: the event or idea it is about. */
  topic: string;
}

export const CUSTOM_CATALOG = {
  PontiacFortsMap: {topic: "Pontiac's War, 1763", shows: 'Great Lakes forts falling one by one; Detroit and Fort Pitt hold under siege'},
  ProclamationLineMap: {topic: 'Proclamation of 1763', shows: 'The line drawn along the Appalachian divide; the reserve west of it to the Mississippi; settlers already past the line'},
  StampActTax: {topic: 'Stamp Act, 1765', shows: 'The stamp landing on everyday paper (newspaper, will, deed, playing cards, dice), then on every desk: reach, not rate'},
  BoycottPressure: {topic: 'Non-importation boycotts, 1765-1770', shows: 'Colonial ports cutting off British imports; pressure flowing back to British merchants'},
  TeaPartyHarbor: {topic: 'Boston Tea Party, 1773', shows: 'Three ships at Griffin\'s Wharf; tea chests tumble into the harbor'},
  BostonHarborClosed: {topic: 'Boston Port Act, 1774', shows: 'Royal Navy ships close Boston harbor; shipping into the port stops'},
  LexingtonConcordMap: {topic: 'Lexington and Concord, April 1775', shows: 'British column rows across the Back Bay and marches to Lexington and Concord; militia fire on the retreat to Charlestown'},
  BunkerHillMap: {topic: "Bunker Hill (Breed's Hill), June 1775", shows: "Charlestown peninsula: three British assaults up Breed's Hill; the third carries the redoubt"},
  TrentonPrincetonMap: {topic: 'Trenton and Princeton, winter 1776-77', shows: "Washington's night crossing of the Delaware and the strikes on Trenton and Princeton"},
  SaratogaMap: {topic: 'Saratoga campaign, 1777', shows: "Burgoyne's advance down Lake Champlain to Fort Edward; Gates's army closes a ring around him at Saratoga"},
  YorktownMap: {topic: 'Yorktown, 1781', shows: 'Cornwallis trapped on the peninsula: Washington and Rochambeau arrive by the Chesapeake, the French fleet closes the bay, siege lines tighten'},
  ArticlesWeakness: {topic: 'Articles of Confederation', shows: 'Congress with three empty slots: no tax, no executive, no courts'},
  ConstitutionFixes: {topic: 'The Constitution, 1787', shows: 'Three branches grow in; Congress splits into House and Senate; checks run between branches'},
  HamiltonFinanceFlow: {topic: "Hamilton's financial plan, 1790", shows: 'Thirteen state debt stacks (to scale) fly onto one federal pile: assumption'},
  Election1800: {topic: 'Election of 1800', shows: 'Jefferson and Burr tie at 73 electoral votes; the House deadlocks for 35 ballots and picks Jefferson on the 36th'},
} as const satisfies Record<string, CustomEntry>;

export type CustomName = keyof typeof CUSTOM_CATALOG;
export const CUSTOM_NAMES = Object.keys(CUSTOM_CATALOG) as CustomName[];
