#!/usr/bin/env python3
"""Resolve kit u1e3.ts beats against v9 turns.json.
Usage: python3 tools/map_beats.py
Writes src/data/e3/beats_kit.json.
Each beat has a manual turn_id + an anchor snippet. The script verifies the
anchor resolves (via norm matching) to the manual turn_id, computes word
offsets (estimated method, matching anchors.ts), and writes resolved beats JSON.
"""
import json, re, unicodedata, sys

# Windows consoles and open() default to a locale encoding (cp1252) that
# cannot handle the unicode in beat props (→, ·, —). Be explicit everywhere.
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def norm(s):
    s = s.lower()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.replace('\u2019', '').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return s.strip()

def tokens(s):
    n = norm(s)
    return n.split(' ') if n else []

def find_turn(snippet, turns):
    needle = norm(snippet)
    return [(i, t) for i, t in enumerate(turns) if f" {norm(t['text'])} ".find(f" {needle} ") >= 0]

def find_phrase(hay, phrase, nth=1):
    seen = 0
    for i in range(len(hay) - len(phrase) + 1):
        if hay[i:i+len(phrase)] == phrase:
            seen += 1
            if seen == nth:
                return i
    return -1

def word_offset(text, word, dur):
    st = tokens(text)
    idx = find_phrase(st, tokens(word))
    if idx < 0:
        return None
    chars_before = len(' '.join(st[:idx]))
    total = len(' '.join(st))
    return dur * (chars_before / total) if total else 0.0

import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TURNS = os.path.join(ROOT, 'src', 'data', 'e3', 'turns.json')
TIMING = os.path.join(ROOT, 'src', 'data', 'e3', 'timing_map.json')
OUT = os.path.join(ROOT, 'src', 'data', 'e3', 'beats_kit.json')

turns = json.load(open(TURNS, encoding='utf-8'))
timing = json.load(open(TIMING, encoding='utf-8'))
starts, durations = timing['starts'], timing['durations']
total = starts[-1] + durations[-1]
turn_id_to_idx = {t.get('id', 't%02d' % i): i for i, t in enumerate(turns)}

def visual_end(idx):
    return starts[idx+1] if idx+1 < len(turns) else total

RED, GOLD, GREEN, X = '#e07a5f', '#ffd166', '#90d39a', 0.38

# (id, kind, anchor_snippet, manual_turn_id, word, until, props)
# until: None | ('turns', N) | ('turnEnd',) | ('anchor', snippet, word)
B = [
 # tours / figures / documents
 ('tour-comanche', 'tour', 'So the most traditional Plains life', 't16', None, ('turns', 2),
  {'image': 'historic/u1e2/comanche-horses.jpg', 'caption': 'TRADITION WITH A START DATE',
   'stops': [
     {'turn_id': 't16', 'word': None, 'rect': [0, 0, 1, 1], 'callouts': []},
     {'turn_id': 't17', 'word': 'centuries', 'rect': [0.5, 0.55, 0.95, 1.0],
      'callouts': [{'point': [0.655, 0.775], 'label': 'Riding slung along the side'}]},
   ]}),
 ('figure-crosby', 'figure', 'In 1972 a historian named Alfred Crosby', 't20', 'alfred crosby', ('anchor', 'In 1972 a historian named Alfred Crosby', 'columbian exchange'),
  {'name': 'Alfred W. Crosby', 'dates': '1931–2018', 'role': 'Historian who named the Columbian Exchange (1972)', 'likeness': 'none'}),
 ('figure-sahagun', 'figure', 'The Florentine Codex preserves Nahua accounts', 't37', None, ('turns', 2),
  {'name': 'Bernardino de Sahagún', 'dates': 'c. 1499–1590', 'role': 'Franciscan friar; compiled the Codex with Nahua scholars', 'likeness': 'later likeness'}),
 ('doc-codex', 'document', 'The Florentine Codex preserves Nahua accounts', 't37', 'nahua accounts', ('turns', 3),
  {'image': 'historic/u1e3/florentine-codex-page.jpg', 'title': 'Florentine Codex, Book 12',
   'attribution': 'Compiled under Bernardino de Sahagún with Nahua scholars, c. 1545–1577',
   'excerpt': 'The sick lay in their homes, unable to move, unable even to turn over, and there was no one left to care for them.',
   'quoteStatus': 'paraphrase', 'highlight': 'no one left to care for them',
   'marks': [
     {'word': 'sick lay', 'point': [0.72, 0.5], 'label': 'The sick, lying on mats'},
     {'word': 'unable to move', 'point': [0.3, 0.72], 'label': 'Smallpox sores'},
     {'word': 'care', 'point': [0.33, 0.17], 'label': 'A healer (ticitl) at work'}],
   'marksVerified': True,
   'hipp': {'type': 'Point of View', 'text': 'The Nahua side of the conquest, recorded decades later under a Spanish friar: not a raw diary.'}}),
 # routes
 ('route-west', 'route', 'Westbound, Europe to the Americas', 't01', 'westbound', None,
  {'caption': 'WESTBOUND: Europe → the Americas', 'variant': 'overview',
   'routes': [{'from': 'Seville', 'to': 'Hispaniola', 'label': 'Wheat · horses · cattle · pigs'},
              {'from': 'Madeira', 'to': 'Brazil', 'label': 'Sugarcane'}]}),
 ('route-east', 'route', 'Eastbound, Americas to Europe', 't05', None, ('turns', 2),
  {'caption': 'EASTBOUND: the Americas → Europe', 'variant': 'overview',
   'routes': [{'from': 'Tenochtitlan', 'to': 'Seville', 'label': 'Maize · tomatoes · cacao'},
              {'from': 'Andes', 'to': 'Ireland', 'label': 'Potatoes'},
              {'from': 'Caribbean', 'to': 'Lisbon', 'label': 'Tobacco'}]}),
 ('route-maize', 'route', "Now maize. It didn't stop in Europe", 't19', None, None,
  {'caption': 'MAIZE: on to Africa and Asia', 'variant': 'overview',
   'routes': [{'from': 'Lisbon', 'to': 'West Central Africa', 'label': 'Africa: a staple'},
              {'from': 'Lisbon', 'to': 'China', 'label': 'Asia'}]}),
 ('route-disease', 'route', 'Smallpox, measles, influenza, sailing west', 't29', None, ('anchor', 'Smallpox, measles, influenza, sailing west', 'eight or nine'),
  {'caption': 'DISEASE: almost entirely westbound', 'variant': 'dark',
   'routes': [{'from': 'Seville', 'to': 'Hispaniola', 'label': 'Smallpox, 1518'},
              {'from': 'Seville', 'to': 'Tenochtitlan', 'label': 'Smallpox, 1520'},
              {'from': 'Lisbon', 'to': 'Brazil', 'label': 'Measles, influenza'}]}),
 ('route-middle-passage', 'route', 'The Middle Passage. Thousands at first', 't54', None, None,
  {'caption': 'THE MIDDLE PASSAGE: most to Brazil and the Caribbean', 'variant': 'dark',
   'routes': [{'from': 'West Central Africa', 'to': 'Brazil', 'label': 'Brazil: the largest share'},
              {'from': 'West Africa', 'to': 'Caribbean', 'label': 'Caribbean'}]}),
 ('ships-move', 'route', 'Last time: the three Gs', 't00', 'ships', ('turns', 2),
  {'caption': 'CARGO NOBODY BOUGHT A TICKET FOR', 'variant': 'overview',
   'routes': [{'from': 'Seville', 'to': 'Hispaniola', 'label': 'Horses, wheat, germs'},
              {'from': 'Hispaniola', 'to': 'Lisbon', 'label': 'Maize, potatoes'}]}),
 # cold-open hook card (re-anchored to v9 turns)
 ('hook-ships', 'text', 'Last time: the three Gs', 't00', 'ships', None,
  {'text': 'SAME SHIPS.', 'level': 'hero', 'position': [X, 0.67], 'entrance': 'stamp'}),
 ('boxes-circle', 'text', 'Last time: the three Gs', 't00', 'circle', None,
  {'text': "CIRCLE WHAT YOU CAN'T EXPLAIN", 'level': 'subtitle', 'position': [X, 0.3]}),
 # box 1
 ('bubble-horses-new', 'bubble', 'Wait. No horses? Cowboy movies', 't02', 'horses', None,
  {'text': 'Horses are new here?!', 'position': [X, 0.3], 'width': 420}),
 ('horses-died-out', 'text', 'For about ten thousand years, no horses', 't03', 'died out', None,
  {'text': 'DIED OUT IN THE ICE AGE', 'level': 'subtitle', 'position': [X, 0.22]}),
 ('horses-10k', 'text', 'For about ten thousand years, no horses', 't03', 'ten thousand', None,
  {'text': '10,000+ YEARS', 'level': 'title', 'position': [X, 0.4], 'entrance': 'stamp', 'color': GOLD}),
 ('horses-imports', 'text', 'For about ten thousand years, no horses', 't03', 'imports', ('turns', 2),
  {'text': 'EVERY MUSTANG: A EUROPEAN IMPORT', 'level': 'subtitle', 'position': [X, 0.58]}),
 # potato
 ('bg-potato', 'bg', 'Eastbound, Americas to Europe', 't05', None, None,
  {'image': 'historic/u1e3/potato-plant.jpg'}),
 ('potato-boom', 'text', 'Eastbound, Americas to Europe', 't05', 'population boom', None,
  {'text': 'POPULATION BOOM', 'level': 'title', 'position': [X, 0.22], 'color': GREEN}),
 ('potato-ireland', 'text', 'Eastbound, Americas to Europe', 't05', 'ireland', None,
  {'text': 'IRELAND: ONE POTATO VARIETY', 'level': 'subtitle', 'position': [X, 0.38]}),
 ('potato-famine', 'text', 'Eastbound, Americas to Europe', 't05', 'famine', ('turns', 2),
  {'text': 'BLIGHT → FAMINE', 'level': 'title', 'position': [X, 0.54], 'color': RED}),
 ('potato-hero', 'text', 'So the potato is a hero', 't06', 'hero', ('turns', 2),
  {'text': 'HERO', 'level': 'title', 'position': [0.26, 0.32], 'color': GREEN, 'entrance': 'stamp'}),
 ('potato-bomb', 'text', 'So the potato is a hero', 't06', 'time bomb', ('turns', 2),
  {'text': 'TIME BOMB', 'level': 'title', 'position': [0.5, 0.32], 'color': RED, 'entrance': 'stamp'}),
 # tomato
 ('bg-tomato', 'bg', 'And the tomato.', 't07', None, None,
  {'image': 'historic/u1e3/tomato-plant.jpg'}),
 ('tomato-rome', 'text', 'Nobody in Rome tasted a tomato', 't09', 'rome', None,
  {'text': 'NO TOMATOES IN ROME UNTIL AFTER 1492', 'level': 'subtitle', 'position': [X, 0.24]}),
 ('tomato-wary', 'text', 'The nightshade family', 't13', 'nightshade', None,
  {'text': 'WARY: A COUSIN OF NIGHTSHADE', 'level': 'subtitle', 'position': [X, 0.4]}),
 ('bubble-sunday', 'bubble', "My family's Sunday dinner", 't10', None, None,
  {'text': 'My Sunday dinner. Ruined.', 'position': [X, 0.3], 'width': 420}),
 ('tobacco-east', 'text', 'And tobacco crossed east too', 't11', 'tobacco', None,
  {'text': 'TOBACCO → EAST', 'level': 'title', 'position': [X, 0.3]}),
 # comanche
 ('americas-gained', 'text', 'Not quite. The Americas got calories too', 't15', 'calories', ('anchor', 'Not quite. The Americas got calories too', 'comanche'),
  {'text': 'AMERICAS GAINED: WHEAT, CATTLE, PIGS', 'level': 'subtitle', 'position': [X, 0.24], 'color': GREEN}),
 ('bg-comanche', 'bg', 'Not quite. The Americas got calories too', 't15', 'comanche', ('turnEnd',),
  {'image': 'historic/u1e2/comanche-horses.jpg'}),
 ('comanche-name', 'text', 'Not quite. The Americas got calories too', 't15', 'comanche', None,
  {'text': 'THE COMANCHE', 'level': 'title', 'position': [X, 0.22], 'entrance': 'stamp'}),
 ('comanche-rebuilt', 'text', 'Not quite. The Americas got calories too', 't15', 'rebuilt', None,
  {'text': 'REBUILT LIFE AROUND THE HORSE', 'level': 'subtitle', 'position': [X, 0.36]}),
 # pigs / maize
 ('bg-pigs', 'bg', "And the animals didn't just move in", 't18', 'pigs', None,
  {'image': 'historic/u1e3/feral-pigs.jpg'}),
 ('pigs-feral', 'text', "And the animals didn't just move in", 't18', 'pigs', None,
  {'text': 'FERAL PIGS', 'level': 'title', 'position': [X, 0.22], 'entrance': 'stamp'}),
 ('pigs-cattle', 'text', "And the animals didn't just move in", 't18', 'cattle', None,
  {'text': 'CATTLE → RANCHING', 'level': 'subtitle', 'position': [X, 0.36]}),
 ('bg-maize', 'bg', "Now maize. It didn't stop in Europe", 't19', None, None,
  {'image': 'historic/u1e3/maize-botanical.jpg'}),
 ('crosby-1972', 'text', 'In 1972 a historian named Alfred Crosby', 't20', '1972', ('turns', 2),
  {'text': '1972', 'level': 'hero', 'position': [X, 0.2], 'entrance': 'stamp', 'color': GOLD}),
 ('crosby-label', 'text', 'In 1972 a historian named Alfred Crosby', 't20', 'columbian exchange', ('turns', 2),
  {'text': 'THE COLUMBIAN EXCHANGE', 'level': 'subtitle', 'position': [X, 0.5], 'entrance': 'stamp'}),
 ('cargo-ticket', 'text', 'More important than the label', 't22', 'biggest cargo', None,
  {'text': 'THE BIGGEST CARGO HAD NO TICKET', 'level': 'subtitle', 'position': [X, 0.3]}),
 ('ledger-box1', 'ledger', 'Exam tip, box one', 't23', 'box one', ('turns', 2),
  {'west': ['Wheat', 'Sugarcane', 'Horses', 'Cattle', 'Pigs'],
   'east': ['Maize', 'Potatoes', 'Tomatoes', 'Tobacco']}),
 # box 2: disease
 ('pictogram-dead', 'pictogram', 'Smallpox, measles, influenza, sailing west', 't29', 'eight or nine', ('anchor', 'Eight or nine out of ten. Not a war', 'erasure'),
  {'total': 10, 'lost': [8, 9], 'label': '8 OR 9 OF 10 DIED', 'caption': 'in the hardest-hit towns'}),
 ('erasure', 'text', 'Eight or nine out of ten. Not a war', 't30', 'erasure', ('turns', 2),
  {'text': 'AN ERASURE.', 'level': 'title', 'position': [X, 0.62], 'color': '#e8dcc8', 'entrance': 'fade'}),
 ('bubble-numbers', 'bubble', 'Why that bad, though?', 't31', None, None,
  {'text': 'Just more Spaniards?', 'position': [X, 0.3], 'width': 400}),
 ('herd-animals', 'text', "Europe's plagues came from living cheek by jowl", 't32', 'herds', None,
  {'text': 'HERD ANIMALS → CROWD DISEASES', 'level': 'subtitle', 'position': [X, 0.22]}),
 ('no-exposure', 'text', "Europe's plagues came from living cheek by jowl", 't32', 'far fewer', None,
  {'text': 'THE AMERICAS: NO PRIOR EXPOSURE', 'level': 'subtitle', 'position': [X, 0.36]}),
 ('virgin-soil', 'text', "Europe's plagues came from living cheek by jowl", 't32', 'virgin soil', ('turns', 2),
  {'text': 'VIRGIN-SOIL EPIDEMIC', 'level': 'title', 'position': [X, 0.52]}),
 ('bg-tenochtitlan', 'bg', 'Virgin soil, though that phrase bugs me', 't33', None, ('turns', 2),
  {'image': 'historic/u1e3/tenochtitlan.jpg'}),
 ('bubble-phrase', 'bubble', 'Virgin soil, though that phrase bugs me', 't33', 'bugs', None,
  {'text': 'That phrase bugs me.', 'position': [X, 0.3], 'width': 400}),
 ('had-help', 'text', 'Some historians push back', 't34', 'had help', None,
  {'text': 'THE DYING HAD HELP', 'level': 'title', 'position': [X, 0.22]}),
 ('help-list', 'text', 'Some historians push back', 't34', 'war', None,
  {'text': 'WAR · ENSLAVEMENT · FORCED LABOR · HUNGER', 'level': 'body', 'position': [X, 0.34]}),
 ('disease-led', 'text', 'Some historians push back', 't34', 'disease led', ('turns', 2),
  {'text': "DISEASE LED. IT DIDN'T WORK ALONE.", 'level': 'subtitle', 'position': [X, 0.6]}),
 ('full-answer', 'text', 'Second exam tip', 't42', 'lead with disease', None,
  {'text': 'DISEASE → STEEL → HORSES → ALLIES', 'level': 'subtitle', 'position': [X, 0.44], 'color': GOLD}),
 ('bg-codex', 'bg', 'The Florentine Codex preserves Nahua accounts', 't37', None, ('turns', 3),
  {'image': 'historic/u1e3/florentine-codex-page.jpg'}),
 ('syphilis', 'text', 'The dying went almost entirely one direction', 't39', 'syphilis', ('turns', 2),
  {'text': 'SYPHILIS \u2014 MAYBE', 'level': 'title', 'position': [X, 0.24]}),
 ('syphilis-debate', 'text', 'The dying went almost entirely one direction', 't39', 'argued', ('turns', 2),
  {'text': 'ORIGIN STILL DEBATED', 'level': 'subtitle', 'position': [X, 0.38]}),
 # box 3: versus
 ('versus-ledger', 'versus', 'Now the ledger.', 't44', None, ('turns', 2),
  {'clashTitle': 'WHO GAINED? WHO PAID?', 'periodLabel': 'The Columbian Exchange, 1492–1650',
   'entityA': {'name': 'EUROPE', 'subtitle': 'Gained', 'points': ['Calories: maize, potatoes', 'Wealth: silver, sugar, land', 'Population growth'], 'color': GREEN},
   'entityB': {'name': 'THE AMERICAS', 'subtitle': 'Paid, and also gained', 'points': ['Roughly 50–90% population loss, 1500–1650', 'Gained horses, wheat, cattle', 'Labor collapse → coerced labor'], 'color': RED},
   'verdictSummary': 'Evaluate both halves.'}),
 # box 4: labor
 ('encomienda', 'text', 'The dying broke the labor supply', 't50', None, None,
  {'text': 'ENCOMIENDA', 'level': 'title', 'position': [X, 0.2]}),
 ('coerced', 'text', 'The dying broke the labor supply', 't50', 'labor', None,
  {'text': 'NATIVE LABOR COLLAPSES', 'level': 'subtitle', 'position': [X, 0.34]}),
 ('island-model', 'text', 'The dying broke the labor supply', 't50', 'madeira', None,
  {'text': 'MADEIRA + SÃO TOMÉ', 'level': 'subtitle', 'position': [X, 0.48]}),
 ('bg-brookes', 'bg', "So the Exchange doesn't end with crops", 't55', None, ('anchor', 'Three questions, AP-shaped', None),
  {'image': 'historic/u1e3/brookes-slave-ship.jpg'}),
 ('hispaniola', 'text', 'The Spanish were shipping enslaved Africans', 't56', '1500s', None,
  {'text': 'A CENTURY BEFORE 1619', 'level': 'title', 'position': [X, 0.28]}),
 ('sugar-first', 'text', "And box four's mistake", 't57', 'sugar', None,
  {'text': 'SUGAR FIRST, NOT COTTON', 'level': 'subtitle', 'position': [X, 0.42]}),
 ('not-jamestown', 'text', "And box four's mistake", 't57', "don't write", None,
  {'text': 'NOT JAMESTOWN, 1619', 'level': 'subtitle', 'position': [X, 0.56], 'color': GOLD}),
 # recap + quiz
 ('recap-board', 'board', 'Four boxes. One: the Exchange inventory', 't58', None, ('anchor', 'Three questions, AP-shaped', None),
  {'items': [
    {'box': 1, 'turn_id': 't58', 'word': 'wheat', 'text': 'Livestock west, crops both ways.'},
    {'box': 2, 'turn_id': 't60', 'word': 'disease front', 'text': 'Germs sailed west: 8 or 9 of 10 died in the hardest-hit towns. Syphilis east? Debated.'},
    {'box': 3, 'turn_id': 't62', 'word': 'who won', 'text': 'Both halves: Europe gained calories and wealth; the Americas paid in people and gained the horse.'},
    {'box': 4, 'turn_id': 't64', 'word': 'labor crisis', 'text': 'The labor crisis: the island model crossed the Atlantic in chains.'}],
   'footer': {'turn_id': 't63', 'word': 'germs', 'text': 'GERMS → SILVER → CHAINS'}}),
 ('q1-card', 'question', "One, and it's a stimulus", 't67', None, ('turns', 2),
  {'number': 1, 'format': 'Stimulus · short answer',
   'source': {'title': 'FLORENTINE CODEX, BOOK 12 (PARAPHRASED)', 'text': 'Smallpox victims lay in their houses, unable to move, with no one left to care for them.'},
   'stem': 'What larger pattern does this account illustrate?'}),
 ('q2-card', 'question', 'Two. A historian argues the potato', 't70', None, ('turns', 2),
  {'number': 2, 'format': 'Argument · defend or refute',
   'stem': '“The potato did more to change Europe than any treaty of the 1500s.” Defend or refute, using the Exchange.'}),
 ('q3-card', 'question', 'Three. The dying emptied the Native towns', 't73', None, ('turns', 2),
  {'number': 3, 'format': 'Causation',
   'stem': 'Where had Europeans already used enslaved African labor on sugar, and what happened next?'}),
 ('bonus-card', 'question', 'One more, fast.', 't76', None, ('turns', 2),
  {'number': 4, 'format': 'Bonus · fast', 'stem': 'Name the one domesticated animal that went east.'}),
 ('quiz-intro', 'text', 'Three questions, AP-shaped', 't66', 'say your answer', None,
  {'text': 'SAY IT OUT LOUD', 'level': 'title', 'position': [X, 0.3], 'color': GOLD}),
 ('next-time', 'text', 'Next time: England stops raiding', 't79', 'jamestown', None,
  {'text': 'NEXT: JAMESTOWN, 1607', 'level': 'title', 'position': [X, 0.3]}),
 ('close-food', 'text', 'The food went both ways', 't80', None, ('turns', 2),
  {'text': 'THE FOOD WENT BOTH WAYS', 'level': 'title', 'position': [X, 0.26]}),
 ('close-dying', 'text', 'and the dying only went one', 't81', None, None,
  {'text': 'THE DYING ONLY WENT ONE', 'level': 'title', 'position': [X, 0.5], 'color': RED, 'entrance': 'fade'}),
]

# ---- resolve ----
issues = []
resolved = []
for bid, kind, anchor, manual_tid, word, until, props in B:
    hits = find_turn(anchor, turns)
    exp_idx = turn_id_to_idx.get(manual_tid)
    if len(hits) == 1:
        ri, rt = hits[0]
        rtid = rt.get('id', 't%02d' % ri)
        if rtid != manual_tid:
            issues.append(f"MISMATCH {bid}: anchor->${rtid} but manual=${manual_tid}")
    elif len(hits) == 0:
        issues.append(f"NO-HIT {bid}: anchor='{anchor}' manual={manual_tid} (using manual)")
    else:
        ids = [h[1].get('id', '') for h in hits]
        issues.append(f"MULTI {bid}: anchor='{anchor}' -> {ids} (using manual {manual_tid})")
    idx = exp_idx
    if idx is None:
        issues.append(f"BAD-MANUAL {bid}: {manual_tid} not a turn")
        continue
    dur = durations[idx]
    off = 0.0
    if word:
        o = word_offset(turns[idx]['text'], word, dur)
        if o is None:
            issues.append(f"WORD-MISS {bid}: '{word}' not in {manual_tid} (offset=0)")
            o = 0.0
        off = round(o, 2)
    start = round(starts[idx] + off, 2)
    # end
    if until is None or until[0] == 'turnEnd':
        end = round(visual_end(idx), 2)
    elif until[0] == 'turns':
        n = until[1]
        end = round(starts[idx+n] if idx+n < len(turns) else total, 2)
    elif until[0] == 'anchor':
        uh = find_turn(until[1], turns)
        if len(uh) == 1:
            ui = uh[0][0]
            uo = 0.0
            if until[2]:
                uo = word_offset(turns[ui]['text'], until[2], durations[ui]) or 0.0
            end = round(starts[ui] + uo, 2)
        else:
            issues.append(f"UNTIL-MISS {bid}: '{until[1]}' -> {len(uh)} hits (using turn end)")
            end = round(visual_end(idx), 2)
    # stop/item sub-anchors
    rprops = dict(props)
    if kind == 'tour':
        nstops = []
        for st in props['stops']:
            si = turn_id_to_idx[st['turn_id']]
            so = word_offset(turns[si]['text'], st['word'], durations[si]) if st['word'] else 0.0
            nstops.append({**st, 'offset': round(so or 0.0, 2), 'time': round(starts[si] + (so or 0.0), 2)})
        rprops['stops'] = nstops
    if kind == 'board':
        nitems = []
        for it in props['items']:
            ii = turn_id_to_idx[it['turn_id']]
            io = word_offset(turns[ii]['text'], it['word'], durations[ii]) if it['word'] else 0.0
            nitems.append({**it, 'offset': round(io or 0.0, 2)})
        rprops['items'] = nitems
        fi = turn_id_to_idx[props['footer']['turn_id']]
        fo = word_offset(turns[fi]['text'], props['footer']['word'], durations[fi]) or 0.0
        rprops['footer'] = {**props['footer'], 'offset': round(fo, 2)}
    resolved.append({'id': bid, 'kind': kind, 'turn_id': manual_tid, 'turn_idx': idx,
                     'offset': off, 'start': start, 'end': end, 'props': rprops})

print(f"Resolved {len(resolved)}/{len(B)} beats")
print(f"Issues: {len(issues)}")
for i in issues:
    print(" ", i)
json.dump(resolved, open(OUT, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
