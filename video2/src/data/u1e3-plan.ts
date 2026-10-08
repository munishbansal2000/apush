/**
 * U1E3 lesson plan: "The Exchange" (Columbian Exchange).
 * Sections, pause cards, traps, chapters — all anchored to script text.
 * Adapted from apush-episode-kit/src/episodes/u1e3.ts.
 */
import { defineLessonPlan } from '../lib/lesson-plan';

const MAP = 'historic/u1e3/cantino-planisphere.jpg';

export const u1e3Plan = defineLessonPlan({
  id: 'u1e3',
  manifestKey: 'E3',
  title: {
    kicker: 'UNIT 1 · EPISODE 3',
    title: 'THE EXCHANGE',
    subline: 'WHAT CROSSED THE ATLANTIC',
    at: { turn: 'Last time: the three Gs' },
  },

  sections: [
    {
      from: { turn: 'For about ten thousand years, no horses' },
      tone: 'playful',
      bg: MAP,
    },
    {
      from: { turn: 'Smallpox, measles, influenza, sailing west' },
      tone: 'serious',
      bg: 'historic/u1e3/smallpox-victims.jpg',
    },
    {
      from: { turn: 'The dying broke the labor supply' },
      tone: 'sobering',
      bg: 'historic/u1e3/sugarcane-plantation.jpg',
    },
    {
      from: { turn: 'Four boxes. One: the Exchange inventory' },
      tone: 'recap',
      bg: MAP,
    },
  ],

  pauseCards: [
    {
      after: { turn: 'Your turn. Two worlds swap everything' },
      kind: 'predict',
      prompt: 'Germs mostly crossed one way. Which side empties out, and what does that make possible?',
      reveal: 'The side with no immunity. Emptied land is easier to conquer.',
    },
    {
      after: { turn: 'Your turn. The Native towns are emptying' },
      kind: 'predict',
      prompt: 'Native labor is collapsing. Sugar needs workers. What happens next?',
      reveal: 'The island model crosses the Atlantic: enslaved African labor.',
    },
    {
      after: { turn: "One, and it's a stimulus" },
      kind: 'selftest',
      prompt: 'A Nahua account: smallpox victims unable to move, no one left to care for them. What larger pattern?',
      reveal: 'A virgin-soil epidemic. Disease ran ahead of the conquest.',
    },
    {
      after: { turn: 'Two. A historian argues the potato' },
      kind: 'selftest',
      prompt: 'Did the potato change Europe more than any treaty of the 1500s? Defend or refute.',
      reveal: 'Defend: new crops fueled population growth. Either way, bring evidence.',
    },
    {
      after: { turn: 'Three. The dying emptied the Native towns' },
      kind: 'selftest',
      prompt: 'Where had Europeans already used enslaved African labor on sugar? What happened next?',
      reveal: 'Madeira and São Tomé. The model crossed to the Americas.',
    },
    {
      after: { turn: 'One more, fast' },
      kind: 'selftest',
      // matches the v9 question; the reveal keeps the turkey correction (F-U1-013) even though
      // the v9 audio says "all of them" — regenerate from v10 to fix the audio itself
      prompt: 'Which direction did the farm animals travel, and why?',
      reveal: 'West: horses, cattle, pigs. Exception: the turkey went east.',
    },
  ],

  traps: [
    {
      // Maya's mistake, Marcus corrects in the next turn
      at: { turn: 'So the Americas only lost' },
      myth: 'The Americas lost the trade',
      fact: 'The Americas gained wheat, cattle, and the horse',
    },
    {
      // v9 states myth and correction in one turn: the fact lands when the correction starts
      at: { turn: 'Common mistake, box two' },
      factAt: { turn: 'Common mistake, box two', word: 'the epidemics' },
      myth: 'Smallpox was a Spanish weapon',
      fact: 'Disease ran ahead of the soldiers, with help',
    },
    {
      at: { turn: "Box three's trap" },
      factAt: { turn: "Box three's trap", word: 'the americas got' },
      myth: 'Europe won the Exchange',
      fact: 'Evaluate both halves: gains and losses',
    },
    {
      at: { turn: 'Last tip. The exam can ask when enslaved' },
      factAt: { turn: 'Last tip. The exam can ask when enslaved', word: 'the spanish were shipping' },
      myth: 'Slavery started at Jamestown, 1619',
      fact: 'Enslaved Africans reached Hispaniola c. 1502',
    },
  ],

  chapters: [
    { label: 'Cold open', at: { turn: 'Last time: the three Gs' } },
    { label: 'Box 1 · The Exchange inventory', box: 1, at: { turn: 'Westbound, Europe to the Americas' } },
    { label: 'Box 2 · The disease front', box: 2, at: { turn: 'Smallpox, measles, influenza, sailing west' } },
    { label: 'Box 3 · Who won and who paid', box: 3, at: { turn: 'Now the ledger' } },
    { label: 'Box 4 · The labor crisis', box: 4, at: { turn: 'The dying broke the labor supply' } },
    { label: 'Recap', at: { turn: 'Four boxes. One: the Exchange inventory' } },
    { label: 'Self-test', at: { turn: "One, and it's a stimulus" } },
  ],
});
