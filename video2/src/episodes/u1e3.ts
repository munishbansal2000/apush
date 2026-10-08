/**
 * U1E3 — The Exchange. Pure data: no turn numbers, no timings, no components.
 *
 * Anchors quote the script (script/u1e3.v10.md). If a line is edited so an anchor no
 * longer matches, `npm run validate` fails with A001/A002 instead of drifting.
 * Tone arc: playful (inventory) → serious (disease) → sobering (labor) → recap.
 */
import { defineEpisode, until } from '../kit/episode';

const X = 0.38; // horizontal centre of the stage (left of the head and box tracker)
const MAP = 'historic/u1e3/cantino-planisphere.jpg';
const RED = '#e07a5f';
const GOLD = '#ffd166';
const GREEN = '#90d39a';

export const u1e3 = defineEpisode({
  id: 'u1e3',
  manifestKey: 'E3',
  script: 'script/u1e3.v10.md',
  title: { kicker: 'UNIT 1 · EPISODE 3', title: 'THE EXCHANGE', subline: 'WHAT CROSSED THE ATLANTIC', at: { turn: 'Last time: the three Gs' } },

  sections: [
    { from: { turn: 'No horses in America' }, tone: 'playful', bg: MAP },
    { from: { turn: 'Smallpox, measles, influenza, sailing west' }, tone: 'serious', bg: 'historic/u1e3/smallpox-victims.jpg' },
    { from: { turn: 'Then the labor.' }, tone: 'sobering', bg: 'historic/u1e3/sugarcane-plantation.jpg' },
    { from: { turn: 'Four boxes. One, already checked' }, tone: 'recap', bg: MAP },
  ],

  traps: [
    { at: { turn: 'Wait, the turkey went east?' }, myth: 'Every animal went west', fact: 'Big farm animals went west; the turkey went east' },
    { at: { turn: 'Okay, here\'s my take.' }, myth: 'The Americas lost the trade', fact: 'The Americas gained wheat, cattle, and the horse' },
    { at: { turn: 'So if the exam asks why the Spanish' }, myth: 'Smallpox was a Spanish weapon', fact: 'Disease ran ahead of the soldiers, with help' },
    { at: { turn: 'So, final answer: Europe' }, myth: 'Europe won the Exchange', fact: 'Evaluate both halves: gains and losses' },
    { at: { turn: 'And I always thought slavery' }, myth: 'Slavery started at Jamestown, 1619', fact: 'Enslaved Africans reached Hispaniola c. 1502' },
  ],

  chapters: [
    { label: 'Cold open', at: { turn: 'No horses in America' } },
    { label: 'Box 1 · The Exchange inventory', box: 1, at: { turn: 'Westbound first' } },
    { label: 'Box 2 · The disease front', box: 2, at: { turn: 'Smallpox, measles, influenza, sailing west' } },
    { label: 'Box 3 · Who won and who paid', box: 3, at: { turn: 'Now the ledger.' } },
    { label: 'Box 4 · The labor crisis', box: 4, at: { turn: 'Then the labor.' } },
    { label: 'Recap', at: { turn: 'Four boxes. One, already checked' } },
    { label: 'Quick check', at: { turn: 'Before you go, one fast one.' } },
  ],

  pauseCards: [
    {
      after: { turn: 'Your turn. Crops and animals crossed' },
      kind: 'predict',
      prompt: 'Germs mostly crossed one way. Which side empties out, and what does that make possible?',
      reveal: 'The side with no immunity. Emptied land is easier to conquer.',
    },
    {
      after: { turn: 'Your turn. Native labor is collapsing' },
      kind: 'predict',
      prompt: 'Native labor is collapsing. Sugar needs workers. What happens next?',
      reveal: 'The island model crosses the Atlantic: enslaved African labor.',
    },
    {
      after: { turn: 'Before you go, one fast one.' },
      kind: 'selftest',
      prompt: 'Name the one domesticated animal that went east.',
      reveal: 'The turkey.',
    },
  ],

  beats: [
    /* figures, documents, camera tours */
    {
      id: 'tour-comanche', kind: 'tour', at: { turn: 'So the classic picture of Plains life' }, until: until.turns(2),
      image: 'historic/u1e2/comanche-horses.jpg', caption: 'TRADITION WITH A START DATE',
      stops: [
        { at: { turn: 'So the classic picture of Plains life' }, rect: [0, 0, 1, 1] },
        { at: { turn: 'Post-Exchange. A few centuries', word: 'post exchange' }, region: 'riders', callouts: [{ point: [0.655, 0.775], label: 'Riding slung along the side' }] },
      ],
    },
    {
      id: 'figure-crosby', kind: 'figure', at: { turn: 'In 1972 a historian named Alfred Crosby', word: 'alfred crosby' }, until: until.at('In 1972 a historian named Alfred Crosby', 'columbian exchange'),
      name: 'Alfred W. Crosby', dates: '1931–2018', role: 'Historian who named the Columbian Exchange (1972)', likeness: 'none',
    },
    {
      id: 'figure-sahagun', kind: 'figure', at: { turn: 'The Florentine Codex, compiled', word: 'spanish friar' }, until: until.at('The Florentine Codex, compiled', 'their account'),
      name: 'Bernardino de Sahagún', dates: 'c. 1499–1590', role: 'Franciscan friar; compiled the Codex with Nahua scholars', likeness: 'later likeness',
      image: 'historic/u1e3/sahagun-portrait.jpg',
    },
    {
      id: 'doc-codex', kind: 'document', at: { turn: 'The Florentine Codex, compiled', word: 'their account' }, until: until.turns(3),
      image: 'historic/u1e3/florentine-codex-page.jpg',
      title: 'Florentine Codex, Book 12',
      attribution: 'Compiled under Bernardino de Sahagún with Nahua scholars, c. 1545–1577',
      excerpt: 'The sick lay in their homes, unable to move, unable even to turn over, and there was no one left to care for them.',
      quoteStatus: 'paraphrase',
      highlight: 'no one left to care for them',
      marks: [
        { word: 'sick lay', point: [0.72, 0.5], label: 'The sick, lying on mats' },
        { word: 'unable to move', point: [0.3, 0.72], label: 'Smallpox sores' },
        { word: 'care', point: [0.33, 0.17], label: 'A healer (ticitl) at work' },
      ],
      marksVerified: true,
      hipp: { type: 'Point of View', text: 'The Nahua side of the conquest, recorded decades later under a Spanish friar: not a raw diary.' },
    },

    /* real-geography route maps (data/places.json) */
    {
      id: 'route-west', kind: 'route', at: { turn: 'Westbound first', word: 'westbound' }, variant: 'overview',
      caption: 'WESTBOUND: Europe → the Americas',
      routes: [
        { from: 'Seville', to: 'Hispaniola', label: 'Wheat · horses · cattle · pigs' },
        { from: 'Madeira', to: 'Brazil', label: 'Sugarcane' },
      ],
    },
    {
      id: 'route-east', kind: 'route', at: { turn: 'Maize, potatoes, tomatoes, cacao, tobacco' }, until: until.at('Maize, potatoes, tomatoes, cacao, tobacco', 'one bird'), variant: 'overview',
      caption: 'EASTBOUND: the Americas → Europe',
      routes: [
        { from: 'Tenochtitlan', to: 'Seville', label: 'Maize · tomatoes · cacao' },
        { from: 'Andes', to: 'Ireland', label: 'Potatoes' },
        { from: 'Caribbean', to: 'Lisbon', label: 'Tobacco' },
      ],
    },
    {
      id: 'route-maize', kind: 'route', at: { turn: 'Maize didn\'t stop in Europe, either.', word: 'portuguese' }, variant: 'overview',
      caption: 'MAIZE: on to Africa and Asia',
      routes: [
        { from: 'Lisbon', to: 'West Central Africa', label: 'Africa: a staple' },
        { from: 'Lisbon', to: 'China', label: 'Asia' },
      ],
    },
    {
      id: 'route-disease', kind: 'route', at: { turn: 'Smallpox, measles, influenza, sailing west' }, until: until.at('Smallpox, measles, influenza, sailing west', 'eight or nine'), variant: 'dark',
      caption: 'DISEASE: almost entirely westbound',
      routes: [
        { from: 'Seville', to: 'Hispaniola', label: 'Smallpox, 1518' },
        { from: 'Seville', to: 'Tenochtitlan', label: 'Smallpox, 1520' },
        { from: 'Lisbon', to: 'Brazil', label: 'Measles, influenza' },
      ],
    },
    {
      id: 'route-middle-passage', kind: 'route', at: { turn: 'The Middle Passage. African states' }, variant: 'dark',
      caption: 'THE MIDDLE PASSAGE: most to Brazil and the Caribbean',
      routes: [
        { from: 'West Central Africa', to: 'Brazil', label: 'Brazil: the largest share' },
        { from: 'West Africa', to: 'Caribbean', label: 'Caribbean' },
      ],
    },
    /* ---------------- cold open: one card that keeps building ---------------- */
    { id: 'hook-horses', kind: 'text', at: { turn: 'No horses in America', word: 'horses' }, text: 'NO HORSES IN AMERICA', level: 'title', position: [X, 0.2] },
    { id: 'hook-tomatoes', kind: 'text', at: { turn: 'No horses in America', word: 'tomatoes' }, text: 'NO TOMATOES IN ITALY', level: 'title', position: [X, 0.31] },
    { id: 'hook-potatoes', kind: 'text', at: { turn: 'No horses in America', word: 'potatoes' }, text: 'NO POTATOES IN IRELAND', level: 'title', position: [X, 0.42] },
    { id: 'hook-dead', kind: 'text', at: { turn: 'No horses in America', word: 'nine' }, text: '9 IN 10 DEAD, IN SOME TOWNS', level: 'subtitle', position: [X, 0.53], color: RED },
    { id: 'hook-ships', kind: 'text', at: { turn: 'No horses in America', word: 'same ships' }, text: 'SAME SHIPS.', level: 'hero', position: [X, 0.67], entrance: 'stamp' },
    {
      id: 'ships-move', kind: 'route', at: { turn: 'Last time: the three Gs', word: 'ships move' }, variant: 'overview', caption: 'CARGO NOBODY BOUGHT A TICKET FOR',
      routes: [
        { from: 'Seville', to: 'Hispaniola', label: 'Horses, wheat, germs' },
        { from: 'Hispaniola', to: 'Lisbon', label: 'Maize, potatoes' },
      ],
    },
    { id: 'boxes-circle', kind: 'text', at: { turn: 'Four boxes today', word: 'circle' }, text: 'CIRCLE WHAT YOU CAN\'T EXPLAIN', level: 'subtitle', position: [X, 0.3] },

    /* ---------------- box 1: inventory (playful) ---------------- */
    { id: 'bubble-horses-new', kind: 'bubble', at: { turn: 'Hold on. Horses are new here?' }, text: 'Horses are new here?!', position: [X, 0.3], width: 420 },
    { id: 'horses-died-out', kind: 'text', at: { turn: 'Horses evolved here', word: 'died out' }, text: 'DIED OUT IN THE ICE AGE', level: 'subtitle', position: [X, 0.22] },
    { id: 'horses-10k', kind: 'text', at: { turn: 'Horses evolved here', word: 'ten thousand' }, text: '10,000+ YEARS', level: 'title', position: [X, 0.4], entrance: 'stamp', color: GOLD },
    { id: 'horses-imports', kind: 'text', at: { turn: 'Horses evolved here', word: 'european imports' }, text: 'EVERY MUSTANG: A EUROPEAN IMPORT', level: 'subtitle', position: [X, 0.58] },
    { id: 'bubble-cowboy', kind: 'bubble', at: { turn: 'So cowboy movies have been lying' }, text: 'Cowboy movies lied to me.', position: [X, 0.3], width: 420 },
    { id: 'turkey-bird', kind: 'text', at: { turn: 'Maize, potatoes, tomatoes, cacao, tobacco', word: 'one bird' }, text: 'AND ONE BIRD: THE TURKEY', level: 'subtitle', position: [X, 0.3], entrance: 'stamp', color: GOLD },

    { id: 'bg-potato', kind: 'bg', at: { turn: 'The potato might be the most important' }, image: 'historic/u1e3/potato-plant.jpg' },
    { id: 'potato-boom', kind: 'text', at: { turn: 'The potato might be the most important', word: 'population boom' }, text: 'POPULATION BOOM', level: 'title', position: [X, 0.22], color: GREEN },
    { id: 'potato-ireland', kind: 'text', at: { turn: 'The potato might be the most important', word: '1840s' }, text: 'IRELAND, 1840s: ONE VARIETY', level: 'subtitle', position: [X, 0.38] },
    { id: 'potato-famine', kind: 'text', at: { turn: 'The potato might be the most important', word: 'famine' }, until: until.turns(2), text: 'BLIGHT → FAMINE', level: 'title', position: [X, 0.54], color: RED },
    { id: 'potato-hero', kind: 'text', at: { turn: 'So the potato is a hero', word: 'hero' }, until: until.turns(2), text: 'HERO', level: 'title', position: [0.26, 0.32], color: GREEN, entrance: 'stamp' },
    { id: 'potato-bomb', kind: 'text', at: { turn: 'So the potato is a hero', word: 'time bomb' }, until: until.turns(2), text: 'TIME BOMB', level: 'title', position: [0.5, 0.32], color: RED, entrance: 'stamp' },

    { id: 'bg-tomato', kind: 'bg', at: { turn: 'And then there\'s the tomato.' }, image: 'historic/u1e3/tomato-plant.jpg' },
    { id: 'tomato-rome', kind: 'text', at: { turn: 'Nobody in Rome tasted a tomato', word: 'rome' }, text: 'NO TOMATOES IN ROME BEFORE 1492', level: 'subtitle', position: [X, 0.24] },
    { id: 'tomato-wary', kind: 'text', at: { turn: 'Nobody in Rome tasted a tomato', word: 'wary' }, text: 'WARY: A COUSIN OF NIGHTSHADE', level: 'subtitle', position: [X, 0.4] },
    { id: 'bubble-sunday', kind: 'bubble', at: { turn: 'My family\'s Sunday dinner' }, text: 'My Sunday dinner. Ruined.', position: [X, 0.3], width: 420 },
    { id: 'tobacco-east', kind: 'text', at: { turn: 'You\'re welcome. Tobacco crossed too', word: 'tobacco' }, text: 'TOBACCO → EAST', level: 'title', position: [X, 0.3] },

    { id: 'americas-gained', kind: 'text', at: { turn: 'Not so fast. The Americas got calories', word: 'calories' }, until: until.at('Not so fast. The Americas got calories', 'comanche'), text: 'AMERICAS GAINED: WHEAT, CATTLE, PIGS', level: 'subtitle', position: [X, 0.24], color: GREEN },
    { id: 'bg-comanche', kind: 'bg', at: { turn: 'Not so fast. The Americas got calories', word: 'comanche' }, until: until.turnEnd(), image: 'historic/u1e2/comanche-horses.jpg' },
    { id: 'comanche-name', kind: 'text', at: { turn: 'Not so fast. The Americas got calories', word: 'comanche' }, text: 'THE COMANCHE', level: 'title', position: [X, 0.22], entrance: 'stamp' },
    { id: 'comanche-rebuilt', kind: 'text', at: { turn: 'Not so fast. The Americas got calories', word: 'rebuilt' }, text: 'REBUILT LIFE AROUND THE HORSE', level: 'subtitle', position: [X, 0.36] },

    { id: 'bg-pigs', kind: 'bg', at: { turn: 'And the animals rearranged the land', word: 'pigs' }, image: 'historic/u1e3/feral-pigs.jpg' },
    { id: 'pigs-feral', kind: 'text', at: { turn: 'And the animals rearranged the land', word: 'pigs' }, text: 'FERAL PIGS', level: 'title', position: [X, 0.22], entrance: 'stamp' },
    { id: 'pigs-cattle', kind: 'text', at: { turn: 'And the animals rearranged the land', word: 'cattle' }, text: 'CATTLE → RANCHING', level: 'subtitle', position: [X, 0.36] },

    { id: 'bg-maize', kind: 'bg', at: { turn: 'Maize didn\'t stop in Europe, either.' }, image: 'historic/u1e3/maize-botanical.jpg' },
    { id: 'crosby-1972', kind: 'text', at: { turn: 'In 1972 a historian named Alfred Crosby', word: '1972' }, text: '1972', level: 'hero', position: [X, 0.2], entrance: 'stamp', color: GOLD },
    { id: 'crosby-label', kind: 'text', at: { turn: 'In 1972 a historian named Alfred Crosby', word: 'columbian exchange' }, text: 'THE COLUMBIAN EXCHANGE', level: 'subtitle', position: [X, 0.5], entrance: 'stamp' },
    { id: 'cargo-ticket', kind: 'text', at: { turn: 'And Crosby\'s point', word: 'biggest cargo' }, text: 'THE BIGGEST CARGO HAD NO TICKET', level: 'subtitle', position: [X, 0.3] },
    {
      id: 'ledger-box1', kind: 'ledger', at: { turn: 'Let me try box one in one line', word: 'livestock' }, until: until.turns(2),
      west: ['Wheat', 'Sugarcane', 'Horses', 'Cattle', 'Pigs'],
      east: ['Maize', 'Potatoes', 'Tomatoes', 'Tobacco', 'Turkey'],
      exception: 'Turkey',
    },

    /* ---------------- box 2: disease (serious) ---------------- */
    {
      id: 'pictogram-dead', kind: 'pictogram', at: { turn: 'Smallpox, measles, influenza, sailing west', word: 'eight or nine' }, until: until.at('Eight or nine out of ten. That\'s not a war', 'erasure'),
      total: 10, lost: [8, 9], label: '8 OR 9 OF 10 DIED', caption: 'in the hardest-hit towns',
    },
    { id: 'erasure', kind: 'text', at: { turn: 'Eight or nine out of ten. That\'s not a war', word: 'erasure' }, until: until.turns(2), text: 'AN ERASURE.', level: 'title', position: [X, 0.62], color: '#e8dcc8', entrance: 'fade' },
    { id: 'bubble-numbers', kind: 'bubble', at: { turn: 'Was it just that the Spanish brought' }, text: 'Just more Spaniards?', position: [X, 0.3], width: 400 },
    { id: 'herd-animals', kind: 'text', at: { turn: 'It wasn\'t numbers.', word: 'herd animals' }, text: 'HERD ANIMALS → CROWD DISEASES', level: 'subtitle', position: [X, 0.22] },
    { id: 'no-exposure', kind: 'text', at: { turn: 'It wasn\'t numbers.', word: 'far fewer' }, text: 'THE AMERICAS: NO PRIOR EXPOSURE', level: 'subtitle', position: [X, 0.36] },
    { id: 'virgin-soil', kind: 'text', at: { turn: 'It wasn\'t numbers.', word: 'virgin soil' }, text: 'VIRGIN-SOIL EPIDEMIC', level: 'title', position: [X, 0.52] },
    { id: 'bg-tenochtitlan', kind: 'bg', at: { turn: 'Virgin soil. That phrase bugs me' }, until: until.turns(2), image: 'historic/u1e3/tenochtitlan.jpg', focus: 'center' },
    { id: 'bubble-phrase', kind: 'bubble', at: { turn: 'Virgin soil. That phrase bugs me', word: 'bugs' }, text: 'That phrase bugs me.', position: [X, 0.3], width: 400 },
    { id: 'had-help', kind: 'text', at: { turn: 'A lot of historians push back', word: 'had help' }, text: 'THE DYING HAD HELP', level: 'title', position: [X, 0.22] },
    { id: 'help-list', kind: 'text', at: { turn: 'A lot of historians push back', word: 'war' }, text: 'WAR · ENSLAVEMENT · FORCED LABOR · HUNGER', level: 'body', position: [X, 0.34] },
    { id: 'disease-led', kind: 'text', at: { turn: 'A lot of historians push back', word: 'disease led' }, until: until.turns(2), text: 'DISEASE LED. IT DIDN\'T WORK ALONE.', level: 'subtitle', position: [X, 0.6] },
    { id: 'full-answer', kind: 'text', at: { turn: 'Careful. That\'s the box-two trap.', word: 'lead with disease' }, text: 'DISEASE → STEEL → HORSES → ALLIES', level: 'subtitle', position: [X, 0.44], color: GOLD },
    { id: 'bg-codex', kind: 'bg', at: { turn: 'The Florentine Codex, compiled' }, until: until.turns(3), image: 'historic/u1e3/florentine-codex-page.jpg', focus: 'healer' },
    { id: 'syphilis', kind: 'text', at: { turn: 'And the dying went almost entirely one way', word: 'syphilis' }, text: 'SYPHILIS?', level: 'title', position: [X, 0.24] },
    { id: 'syphilis-debate', kind: 'text', at: { turn: 'And the dying went almost entirely one way', word: 'still argue' }, text: 'ORIGIN STILL DEBATED', level: 'subtitle', position: [X, 0.38] },

    /* ---------------- box 3: who gained, who paid ---------------- */
    {
      id: 'versus-ledger', kind: 'versus', at: { turn: 'Now the ledger.' }, until: until.turns(2),
      clashTitle: 'WHO GAINED? WHO PAID?', periodLabel: 'The Columbian Exchange, 1492–1650',
      entityA: { name: 'EUROPE', subtitle: 'Gained', points: ['Calories: maize, potatoes', 'Wealth: silver, sugar, land', 'Population growth'], color: GREEN },
      entityB: { name: 'THE AMERICAS', subtitle: 'Paid, and also gained', points: ['Roughly 50–90% population loss, 1500–1650', 'Gained horses, wheat, cattle', 'Labor collapse → coerced labor'], color: RED },
      verdictSummary: 'Evaluate both halves.',
    },

    /* ---------------- box 4: labor (sobering) ---------------- */
    { id: 'encomienda', kind: 'text', at: { turn: 'Then the labor.', word: 'encomiendas' }, text: 'ENCOMIENDA', level: 'title', position: [X, 0.2] },
    { id: 'coerced', kind: 'text', at: { turn: 'Then the labor.', word: 'collapsed' }, text: 'NATIVE LABOR COLLAPSES', level: 'subtitle', position: [X, 0.34] },
    { id: 'island-model', kind: 'text', at: { turn: 'Then the labor.', word: 'madeira' }, text: 'MADEIRA + SÃO TOMÉ', level: 'subtitle', position: [X, 0.48] },
    { id: 'bg-brookes', kind: 'bg', at: { turn: 'So the Exchange doesn\'t end with crops' }, image: 'historic/u1e3/brookes-slave-ship.jpg', focus: 'hold' },
    { id: 'hispaniola', kind: 'text', at: { turn: 'That\'s the box-four trap.', word: 'hispaniola' }, text: 'HISPANIOLA, c. 1502', level: 'title', position: [X, 0.28] },
    { id: 'sugar-first', kind: 'text', at: { turn: 'That\'s the box-four trap.', word: 'sugar' }, text: 'SUGAR FIRST, NOT COTTON', level: 'subtitle', position: [X, 0.42] },
    { id: 'not-jamestown', kind: 'text', at: { turn: 'That\'s the box-four trap.', word: 'don\'t start' }, text: 'NOT JAMESTOWN, 1619', level: 'subtitle', position: [X, 0.56], color: GOLD },

    /* ---------------- recap + quiz ---------------- */
    {
      id: 'recap-board', kind: 'board', at: { turn: 'Four boxes. One, already checked' }, until: until.at('Before you go, one fast one.'),
      items: [
        { box: 1, at: { turn: 'Four boxes. One, already checked', word: 'livestock' }, text: 'Livestock west, crops both ways. The turkey went east.' },
        { box: 2, at: { turn: 'Two: the disease front.', word: 'disease front' }, text: 'Germs sailed west: 8 or 9 of 10 died in the hardest-hit towns. Syphilis east? Debated.' },
        { box: 3, at: { turn: 'Box two, checked. Three', word: 'who won' }, text: 'Both halves: Europe gained calories and wealth; the Americas paid in people and gained the horse.' },
        { box: 4, at: { turn: 'Box three, checked. Four', word: 'labor crisis' }, text: 'Encomienda, then collapse, then the island model crossed the Atlantic in chains.' },
      ],
      footer: { at: { turn: 'Germs, then sugar, then chains.' }, text: 'GERMS → SUGAR → CHAINS' },
    },
    { id: 'bonus-card', kind: 'question', at: { turn: 'Before you go, one fast one.' }, number: 1, format: 'Quick check', stem: 'Name the one domesticated animal that went east.' },
    { id: 'practice-pointer', kind: 'text', at: { turn: 'Want the exam-style questions?', word: 'unit 1 practice' }, text: 'NEXT UP: UNIT 1 PRACTICE', level: 'subtitle', position: [X, 0.3], color: GOLD },
    { id: 'next-time', kind: 'text', at: { turn: 'Next time: England stops raiding', word: 'jamestown' }, text: 'NEXT: JAMESTOWN, 1607', level: 'title', position: [X, 0.3] },
    { id: 'close-food', kind: 'text', at: { turn: 'The food went both ways' }, until: until.turns(2), text: 'THE FOOD WENT BOTH WAYS', level: 'title', position: [X, 0.26], allowWrap: true },
    { id: 'close-dying', kind: 'text', at: { turn: 'and the dying only went one' }, text: 'THE DYING ONLY WENT ONE', level: 'title', position: [X, 0.5], color: RED, entrance: 'fade', allowWrap: true },
  ],
});
