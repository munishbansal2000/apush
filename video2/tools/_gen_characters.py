from _gen_lib import item, write

COMMON_AVOID = ['modern clothing or accessories', 'caricatured or exaggerated facial features', 'text or lettering on clothing', 'background scenery']

def poses(hold=None):
    h = f', {hold}' if hold else ''
    return [
        {'id': 'idle', 'subject': f'Same figure and costume, standing relaxed facing three-quarter left, weight on one leg, arms hanging slightly away from the body, calm attentive expression{h}.'},
        {'id': 'point', 'subject': f'Same figure and costume, right arm extended straight out at shoulder height pointing toward the viewer\'s left, head turned to follow the hand, other arm relaxed{h}.'},
        {'id': 'speak', 'subject': f'Same figure and costume, mid-sentence with mouth slightly open, one forearm raised with open palm in an explaining gesture, engaged expression{h}.'},
        {'id': 'walk', 'subject': f'Same figure and costume, mid-stride walking toward the viewer\'s left in three-quarter profile, opposite arm and leg forward, legs clearly separated for rigging{h}.'},
    ]

INDIG = 'Depicts Indigenous people: verify regional, nation-specific dress against museum sources (e.g. NMAI, nation cultural centers) for the stated decade; no pan-Indian tropes; review by a qualified reviewer before use.'
ENSL = 'Depicts enslaved people: dignified, individual, non-caricatured; clothing per runaway advertisements and plantation records (Colonial Williamsburg, NMAAHC); no chains, wounds or degradation in the figure itself.'

def C(slug, name, units, dates, subject, details, avoid, priority, tags, hold=None, sens=None, note=None):
    return item('character', slug, name, units, 'cutout-flat', subject, details, avoid + COMMON_AVOID,
                '1024x1536', 'transparent', priority, dates=dates, tags=tags, sens=sens, note=note, variants=poses(hold))

items = [
# ---------------- Unit 1 ----------------
C('taino-man', 'Taíno man (Caribbean, 1490s)', [1], 'c. 1490s',
  '''Adult Taíno man of Hispaniola in the 1490s, bare-chested with a small woven cotton loincloth, red annatto
  (bixa) and black jagua body paint in geometric bands on arms and torso, woven cotton bands tied below the knees
  and above the calves, a necklace of shell and stone beads, straight black shoulder-length hair with bangs,
  barefoot, holding a long pointed wooden digging stick (coa) used for planting cassava mounds.''',
  ['Cotton ligatures below knees/biceps (Taíno practice)', 'Body paint red (annatto) and black (jagua), not feathers-headdress', 'Coa digging stick, not a spear or bow as default', 'Little clothing appropriate to Caribbean climate, not Plains-style buckskin'],
  ['Plains feather war bonnet', 'buckskin fringe', 'tipis', 'metal tools or weapons', 'grass skirt Polynesian tropes'],
  1, ['unit1', 'indigenous', 'caribbean', 'columbian-exchange'], 'the coa digging stick held upright in the left hand', 'high', INDIG + ' Taíno: consult Smithsonian NMAI "Taíno: Native Heritage and Identity in the Caribbean".'),
C('taino-woman', 'Taíno woman (Caribbean, 1490s)', [1], 'c. 1490s',
  '''Adult Taíno woman of Hispaniola in the 1490s wearing a short woven white cotton nagua skirt wrapped at the hips
  (length marking married status), cotton bands tied below the knees, a necklace and arm band of shell beads, a small
  red annatto paint design on the cheeks, long straight black hair loose, barefoot, carrying a shallow woven basket
  of cassava (yuca) roots on one hip.''',
  ['Nagua cotton skirt (married women)', 'Cassava/yuca roots (staple; casabe bread)', 'Shell beads; cotton ligatures', 'Caribbean context — no North American dress'],
  ['Plains or Hollywood "Indian princess" costume', 'feathered headband', 'buckskin', 'sarong-and-flower Polynesian tropes', 'sexualized pose'],
  1, ['unit1', 'indigenous', 'caribbean'], 'the cassava basket resting on the left hip', 'high', INDIG + ' Taíno: consult NMAI Taíno exhibition materials.'),
C('mexica-noble', 'Mexica noble (Tenochtitlan, 1519)', [1], 'c. 1519',
  '''Mexica nobleman (pilli) of Tenochtitlan in 1519 wearing a white cotton tilmatli cloak knotted at the right shoulder
  with a woven geometric border in red and black, a cotton maxtlatl loincloth with decorated end flaps, leather cactli
  sandals with heel guards, jade ear spools, a lip plug (labret), hair cut with a fringe and tied up with a red cord,
  a small band of quetzal feathers, holding a bouquet of flowers and a smoking tube as a sign of rank.''',
  ['Tilmatli knotted at the shoulder; length and border indicated rank', 'Sandals restricted to nobles in the city', 'Jade ear spools and labret', 'Based on Codex Mendoza / Florentine Codex imagery'],
  ['Maya or Inca dress', 'huge Moctezuma-style crown of plumes on a non-ruler', 'metal armor', 'Plains headdress', 'blood or sacrifice imagery'],
  1, ['unit1', 'indigenous', 'mesoamerica', 'aztec'], 'the flowers held in the left hand', 'high', INDIG + ' Mexica: verify against Codex Mendoza and Florentine Codex (Book 8) illustrations.'),
C('conquistador', 'Spanish conquistador (c. 1520)', [1], 'c. 1520',
  '''Spanish soldier of the conquest era around 1520: an open-faced steel cabasset helmet, a quilted cotton escaupil
  jacket adopted from Mesoamerican armor worn over a wool doublet, a steel breastplate, puffed and slashed upper hose
  over wool stockings, low leather shoes, a cut-and-thrust sword on a leather baldric, a round steel-rimmed buckler,
  short beard, weathered face, standing alert.''',
  ['Helmet is a cabasset or sallet — NOT the high-combed morion (common only after c. 1550)', 'Quilted cotton escaupil (adopted in New Spain)', 'Doublet and slashed hose of the 1510s–20s', 'Sword and buckler; crossbow or arquebus acceptable alternatives'],
  ['comb morion helmet', 'full plate knight armor', 'flintlock musket', 'pirate costume', 'cavalier wide hats with ostrich plumes'],
  1, ['unit1', 'spain', 'conquest', 'military'], 'the sword held lowered in the right hand at rest'),
C('franciscan-friar', 'Franciscan friar (New Spain, 16th–17th c.)', [1, 2], 'c. 1550–1680',
  '''Franciscan missionary friar in New Spain or New Mexico, 16th–17th century: an ankle-length habit of undyed grey-brown
  coarse wool with a deep hood and wide sleeves, a white rope cord at the waist tied with three knots, a wooden rosary
  hanging from the cord, simple leather sandals, tonsured head with a ring of short hair, short beard, holding a small
  wooden cross and a leather-bound breviary.''',
  ['Three knots in the cord (poverty, chastity, obedience)', 'Undyed grey-brown wool (blue habits are later, 18th-c. California)', 'Tonsure', 'Sandals, not boots'],
  ['Benedictine black habit', 'Jesuit cassock', 'ornate gold vestments', 'Friar Tuck comic portly caricature'],
  2, ['unit1', 'unit2', 'spain', 'religion', 'missions'], 'the breviary held against the chest in the left hand'),
C('pueblo-farmer', 'Pueblo farmer (New Mexico, 1680)', [2], 'c. 1680',
  '''Pueblo man of the upper Rio Grande around 1680, working a cornfield: a white handwoven cotton shirt and a cotton
  kilt-like breechcloth with a woven sash in red and black, deerskin moccasins with wrapped leggings, hair cut with
  bangs and gathered at the back in a folded chongo knot tied with yarn, a cloth headband, holding a wooden-bladed
  digging hoe and a few ears of multicolored maize.''',
  ['Pueblo men were the weavers; handwoven cotton garments', 'Chongo hair knot and headband', 'Maize agriculture, irrigated fields', 'Pre-revolt 1680: some Spanish-introduced items (iron hoe blade, wool) acceptable but not dominant'],
  ['tipi', 'Plains war bonnet', 'horse-riding warrior', 'Navajo silver concho belts (later)', 'feathered headdress'],
  1, ['unit2', 'indigenous', 'southwest', 'pueblo-revolt'], 'the hoe held diagonally across the body', 'high', INDIG + ' Pueblo: consult Indian Pueblo Cultural Center (Albuquerque) and Museum of Indian Arts & Culture sources.'),
# ---------------- Unit 2 ----------------
C('haudenosaunee-man', 'Haudenosaunee man (Eastern Woodlands, 18th c.)', [2, 3], 'c. 1700–1760',
  '''Haudenosaunee (Iroquois) man of the mid-18th century: a gustoweh cap of wooden splints and cloth with upright and
  trailing feathers, a white linen trade shirt, a dark blue wool stroud breechcloth, red wool leggings with ribbon
  edging, center-seam deerskin moccasins with porcupine-quill decoration, a wool trade blanket over one shoulder,
  silver trade brooches on the shirt, a finger-woven sash, holding a flintlock trade musket upright.''',
  ['Gustoweh (not a Plains war bonnet); feather arrangement varies by nation', 'Trade goods: linen shirt, wool stroud, silver brooches', 'Center-seam puckered moccasins', 'Flintlock trade gun appropriate for 18th c.'],
  ['Plains war bonnet', 'tipi', 'mohawk haircut punk style', 'buckskin fringe jacket of the West', 'tomahawk raised menacingly'],
  1, ['unit2', 'unit3', 'indigenous', 'eastern-woodlands', 'iroquois'], 'the trade musket held upright at the side', 'high', INDIG + ' Haudenosaunee: consult Seneca-Iroquois National Museum / Ganondagan sources; gustoweh feathers by nation (Mohawk three upright).'),
C('haudenosaunee-woman', 'Haudenosaunee woman (Eastern Woodlands, 18th c.)', [2, 3], 'c. 1700–1760',
  '''Haudenosaunee woman of the mid-18th century: a calico or linen overblouse fastened with rows of small silver brooches,
  a dark blue wool stroud skirt with silk ribbonwork and white beadwork along the hem, red wool leggings, deerskin
  moccasins with quillwork, long black hair in a single clubbed braid, carrying a woven splint basket with corn,
  beans and squash (the Three Sisters).''',
  ['Women owned fields and longhouses (matrilineal society)', 'Silver brooches, wool stroud, ribbonwork — 18th-c. trade materials', 'Three Sisters crops', 'Not Plains or "princess" costume'],
  ['"Indian princess" costume', 'feather headband', 'tipi', 'Plains beaded buckskin dress', 'sexualized pose'],
  1, ['unit2', 'unit3', 'indigenous', 'eastern-woodlands', 'iroquois'], 'the basket held at the left hip', 'high', INDIG + ' Haudenosaunee: consult Ganondagan State Historic Site and Iroquois Indian Museum sources.'),
C('puritan-man', 'Puritan man (New England, 1630s)', [2], 'c. 1630s',
  '''English Puritan colonist in Massachusetts Bay, 1630s: a russet-brown wool doublet with plain buttons, a wide white
  linen falling-band collar, matching knee breeches, grey knitted wool stockings, square-toed leather shoes tied with
  laces, a tall-crowned brown felt capotain hat with a plain band, short hair and trimmed beard, holding a small
  leather-bound Bible.''',
  ['Muted "sadd" colors (russet, brown, grey, dark green) — not all black', 'No buckles on hat or shoes (buckles c. 1660s+)', 'Falling-band collar of the 1630s', 'Capotain hat'],
  ['buckle hat', 'buckled shoes', 'Thanksgiving costume clichés', 'blunderbuss', 'tricorn hat'],
  1, ['unit2', 'new-england', 'religion'], 'the Bible held in the left hand'),
C('puritan-woman', 'Puritan woman (New England, 1630s)', [2], 'c. 1630s',
  '''English Puritan colonist woman in Massachusetts Bay, 1630s: a fitted wool waistcoat bodice in muted madder red, an
  ankle-length dark green wool petticoat skirt, a white linen apron, a white linen coif covering the hair with a broad
  plain linen falling collar over the shoulders, a black felt hat over the coif, sturdy leather shoes, carrying a
  wooden pail.''',
  ['Muted colors, not black-and-white costume', 'Linen coif and falling band of the 1630s', 'Apron and practical household work', 'No buckles'],
  ['buckle hat', 'pilgrim costume clichés', 'witch imagery', 'Victorian bonnet'],
  2, ['unit2', 'new-england', 'women'], 'the pail held in the left hand'),
C('chesapeake-planter', 'Chesapeake tobacco planter (Virginia, c. 1700)', [2], 'c. 1690–1720',
  '''Prosperous Virginia tobacco planter around 1700: a long knee-length brown wool justaucorps coat with wide turned-back
  cuffs and many buttons, a long waistcoat, a white linen cravat, knee breeches, white stockings, square-toed shoes
  with small buckles, a shoulder-length natural periwig, an early black cocked hat, holding a cured tobacco leaf and
  a walking cane.''',
  ['Long coat with deep cuffs of c. 1700', 'Square-toe shoes with small buckles', 'Periwig and early cocked hat', 'Cured tobacco leaf (Chesapeake staple)'],
  ['Antebellum white suit and Panama hat', 'Revolutionary-era short coat', 'mint julep', 'cigar (cigars uncommon until 19th c.)'],
  2, ['unit2', 'chesapeake', 'tobacco', 'elite'], 'the cane in the left hand'),
C('indentured-servant', 'Indentured servant (Chesapeake, 1640s)', [2], 'c. 1640s–1670s',
  '''Young English indentured servant in a Chesapeake tobacco field, 1640s–1670s: a coarse unbleached osnaburg linen
  shirt open at the neck with sleeves rolled, loose canvas breeches, a knitted wool Monmouth cap, bare lower legs
  and worn leather shoes, sunburned face, lean build, holding a heavy iron weeding hoe.''',
  ['Monmouth cap (common issue to servants)', 'Coarse osnaburg/canvas', 'Hoe for tobacco cultivation', 'Young adult (most servants were 15–25)'],
  ['tricorn hat', 'chains (servants were not chained)', 'cowboy hat', 'modern work boots'],
  2, ['unit2', 'chesapeake', 'labor'], 'the hoe held at the left side'),
C('enslaved-field-worker', 'Enslaved field worker (18th c.)', [2, 3, 4], 'c. 1720s–1790s',
  '''Adult enslaved African or African American man working tobacco or rice fields in the 18th-century Chesapeake or
  Lowcountry, shown with dignity and individuality: a coarse unbleached osnaburg linen shirt, loose breeches of
  rough undyed "negro cloth" wool, a wide-brimmed woven straw hat, barefoot, strong steady posture, calm composed
  face, holding a long-handled iron hoe.''',
  ['Osnaburg linen and coarse wool issue clothing (per period records)', 'Straw hat for field work', 'Dignified, individual face', 'No chains or wounds'],
  ['chains or shackles', 'whip marks or wounds', 'cowering or degraded posture', 'minstrel caricature', 'exaggerated lips or features', 'bandana-and-smile "happy slave" trope'],
  1, ['unit2', 'unit3', 'unit4', 'slavery', 'african-american'], 'the hoe held at the left side', 'high', ENSL),
C('enslaved-household-worker', 'Enslaved household worker (18th c.)', [2, 3, 4], 'c. 1740s–1790s',
  '''Adult enslaved African American woman working in a Virginia household in the later 18th century, depicted with
  dignity: a linen short gown in faded blue check, an ankle-length brown wool petticoat, a white linen apron, a cotton
  kerchief folded over the shoulders, a head wrap of madras-check cloth, leather shoes, upright composed posture,
  carrying folded linens.''',
  ['Short gown and petticoat (18th-c. working dress)', 'Head wrap (African-rooted practice)', 'Dignified, individual face', 'Domestic labor context'],
  ['"mammy" caricature', 'exaggerated features', 'chains', 'servile or smiling stereotype', 'Victorian maid uniform'],
  1, ['unit2', 'unit3', 'unit4', 'slavery', 'african-american', 'women'], 'the folded linens carried in both arms', 'high', ENSL),
C('enslaved-artisan', 'Enslaved skilled artisan (cooper, c. 1790s)', [2, 3, 4], 'c. 1760s–1820s',
  '''Adult enslaved African American craftsman, a cooper, in the late 18th century, shown as a skilled worker: a linen
  shirt with sleeves rolled, a long brown leather work apron, wool breeches, knitted stockings and leather shoes, a
  round felt hat, focused and confident expression, holding a cooper's adze beside a half-finished wooden barrel stave.''',
  ['Skilled enslaved labor (coopers, smiths, carpenters) was common', 'Leather apron and adze', 'Dignified, individual face', 'Period working dress'],
  ['chains', 'caricature', 'degraded posture', 'modern tools'],
  2, ['unit2', 'unit3', 'unit4', 'slavery', 'african-american', 'labor'], 'the adze held in the right hand', 'high', ENSL),
C('colonial-merchant', 'Colonial merchant (Boston, 1760s)', [2, 3], 'c. 1760s',
  '''Prosperous Boston merchant in the 1760s: a knee-length plum-colored wool frock coat with self-covered buttons, a
  gold-yellow silk waistcoat, a white linen stock at the neck, matching breeches, white silk stockings, black leather
  shoes with silver buckles, a black cocked tricorn hat, a powdered bag wig tied at the nape, holding a leather-bound
  account ledger.''',
  ['1760s cut: slimmer coat, shorter waistcoat than 1700', 'Tricorn hat and powdered wig', 'Buckled shoes (correct for 1760s)', 'Ledger (Atlantic trade)'],
  ['top hat', 'long trousers', 'Regency tailcoat', 'pocket watch chains of the Victorian era'],
  2, ['unit2', 'unit3', 'trade', 'elite'], 'the ledger tucked under the left arm'),
C('colonial-militiaman', 'Colonial militiaman (Massachusetts, 1775)', [3], '1775',
  '''Massachusetts minuteman in April 1775 wearing his own civilian clothes: a brown wool coat, a sleeved red wool
  waistcoat, a linen shirt, buckskin breeches, grey wool stockings, buckled shoes, a black felt cocked hat, a powder
  horn and leather cartridge box on shoulder straps, holding a Brown Bess-type flintlock musket.''',
  ['Civilian clothing, no uniform', 'Powder horn and cartridge box', 'Flintlock musket (Brown Bess or fowler)', 'Cocked or round hat'],
  ['blue Continental uniform', 'coonskin cap', 'rifle with telescopic sight', 'American flag patches'],
  1, ['unit3', 'revolution', 'military'], 'the musket held upright at the right side'),
C('continental-soldier', 'Continental Army soldier (1779)', [3], 'c. 1779–1781',
  '''Continental Army infantryman around 1779–1781: a dark blue wool regimental coat with red facings on lapels and cuffs,
  white metal buttons, white linen waistcoat, white linen overalls gaitered over the shoes, a black cocked hat with
  white tape edging and a black cockade, white crossbelts with a cartridge box and bayonet, holding a French
  Charleville flintlock musket.''',
  ['Blue coat with red facings per 1779 regulations (facings varied by state)', 'Charleville musket (French aid after 1778)', 'Overalls instead of breeches common', 'Cocked hat'],
  ['Union Civil War uniform', '50-star flag', 'tall shako', 'rifle with scope'],
  1, ['unit3', 'revolution', 'military'], 'the musket shouldered'),
C('british-regular', 'British regular infantryman (1775)', [3], 'c. 1775',
  '''British battalion-company infantryman in 1775: a madder-red wool regimental coat with buff or blue facings on lapels
  and cuffs and white worsted lace buttonholes, a white waistcoat and white breeches, black wool gaiters to the knee,
  a black cocked tricorn hat with white tape edging, white buff-leather crossbelts with a black cartridge pouch,
  powdered queued hair, holding a Brown Bess musket with fixed bayonet.''',
  ['Battalion company (tricorn) — not grenadier bearskin', 'Brown Bess Long or Short Land Pattern', 'Regimental lace and facings', 'Black gaiters'],
  ['bearskin cap', 'Napoleonic shako', 'khaki', 'red coat with gold officer epaulettes on a private'],
  1, ['unit3', 'revolution', 'military', 'britain'], 'the musket shouldered'),
C('hessian-soldier', 'Hessian musketeer (1776)', [3], 'c. 1776–1783',
  '''German auxiliary musketeer from Hesse-Kassel in British service, 1776: a dark Prussian-blue wool coat with red
  facings on lapels and cuffs, straw-yellow waistcoat and breeches, black knee-length gaiters, a black tricorn hat
  edged with white tape and red-and-white pompoms at the corners, hair in a long queue, white crossbelts, a brass
  match case, holding a flintlock musket.''',
  ['Dark blue coat (not red)', 'Hesse-Kassel regiments varied in facing color', 'Tricorn for musketeers (brass mitre caps were for grenadiers)', 'Queue hairstyle'],
  ['spiked Pickelhaube helmet (19th c.)', 'headless horseman imagery', 'red British coat'],
  3, ['unit3', 'revolution', 'military'], 'the musket shouldered'),
C('french-marine', 'French colonial marine (New France, 1755)', [2, 3], 'c. 1750s',
  '''Soldier of the Compagnies franches de la Marine in New France, 1755: a greyish-white wool justaucorps coat with
  deep blue cuffs and brass buttons, a blue wool waistcoat, blue breeches, blue stockings, black shoes, a black tricorn
  hat edged in gold-colored braid, white crossbelt with cartridge box, holding a French Tulle flintlock musket.''',
  ['Grey-white coat with blue cuffs, blue smallclothes', 'Gold-edged tricorn', 'French-made musket', 'French and Indian War era'],
  ['Napoleonic uniform', 'Foreign Legion kepi', 'British red coat'],
  2, ['unit3', 'unit2', 'france', 'military', 'seven-years-war'], 'the musket held upright'),
C('frontier-settler-man', 'Frontier settler man (Ohio Valley, 1790s)', [3, 4], 'c. 1790s–1810s',
  '''Trans-Appalachian frontier farmer in the 1790s: a fringed linen hunting shirt belted at the waist with a knife,
  wool trousers or leather leggings, center-seam moccasins, a wide-brimmed round felt hat, a powder horn and shot
  pouch, long hair tied back, holding a long-barreled Pennsylvania (Kentucky) flintlock rifle and an iron felling axe
  over the shoulder.''',
  ['Hunting shirt of linen (Revolutionary-era frontier dress)', 'Long rifle, flintlock', 'Felling axe for clearing land', 'Round hat or felt hat'],
  ['coonskin cap Davy Crockett cliché', 'cowboy hat', 'revolver', 'lever-action rifle'],
  2, ['unit3', 'unit4', 'frontier', 'westward'], 'the rifle held upright and the axe on the left shoulder'),
C('frontier-settler-woman', 'Frontier settler woman (Ohio Valley, 1790s)', [3, 4], 'c. 1790s–1810s',
  '''Trans-Appalachian frontier woman in the 1790s: a linsey-woolsey short gown in faded indigo, an ankle-length brown
  homespun petticoat, a linen apron, a cotton kerchief over the shoulders, a white linen cap under a wide straw
  bonnet, sturdy leather shoes, carrying an iron cooking pot and a bundle of flax.''',
  ['Homespun linsey-woolsey', 'Short gown and petticoat working dress', 'Household production (flax, spinning)', 'No Victorian hoop skirt'],
  ['hoop skirt', 'prairie dress of 1880s', 'sunbonnet with modern print fabric'],
  2, ['unit3', 'unit4', 'frontier', 'women'], 'the pot held in the right hand'),
# ---------------- Unit 4 ----------------
C('cherokee-man-1830s', 'Cherokee man (1830s)', [4], 'c. 1830s',
  '''Cherokee man of the Southeast in the 1830s, reflecting the blend of Cherokee and Euro-American dress of the era: a
  printed cotton calico hunting frock (long shirt) belted with a red finger-woven sash, a cloth turban wrapped around
  the head, a wool vest, dark wool trousers, leather shoes or moccasins, a beaded shoulder bag, holding a copy of a
  newspaper folded under the arm.''',
  ['Calico long shirt and cloth turban (Cherokee men\'s dress, 1820s–30s)', 'Finger-woven sash; bandolier bag', 'Mixed dress reflecting acculturation and literacy (Cherokee Phoenix, 1828)', 'Southeast, not Plains'],
  ['Plains war bonnet', 'tipi', 'buckskin fringe', 'bare-chested warrior trope', 'tomahawk'],
  1, ['unit4', 'indigenous', 'southeast', 'indian-removal', 'trail-of-tears'], 'the folded newspaper held in the left hand', 'high', INDIG + ' Cherokee: consult Museum of the Cherokee People (Cherokee, NC) and Cherokee Heritage Center sources.'),
C('cherokee-woman-1830s', 'Cherokee woman (1830s)', [4], 'c. 1830s',
  '''Cherokee woman of the Southeast in the 1830s: an ankle-length printed cotton calico dress with long sleeves and a
  fitted bodice, a wool shawl around the shoulders, a cloth head kerchief, leather shoes, black hair parted in the
  middle, a woven rivercane basket with a double-weave pattern in red and black on her arm.''',
  ['Calico dress of the 1830s', 'Rivercane double-weave basket (Cherokee craft)', 'Southeast context', 'Dignified, individual'],
  ['"Indian princess" costume', 'feathered headband', 'Plains beaded dress', 'tipi'],
  2, ['unit4', 'indigenous', 'southeast', 'indian-removal', 'women'], 'the basket on the left forearm', 'high', INDIG + ' Cherokee: consult Museum of the Cherokee People and Cherokee Heritage Center sources.'),
C('lowell-mill-girl', 'Lowell mill worker (1830s)', [4], 'c. 1830s–1840s',
  '''Young New England woman working in a Lowell, Massachusetts textile mill in the 1830s–40s: a plain dark calico dress
  with a fitted bodice, full skirt to the ankles and slightly full sleeves, a white work apron, a small white collar,
  hair parted in the middle and pinned in a low bun, flat leather shoes, holding a wooden bobbin of cotton thread.''',
  ['1830s–40s silhouette (natural waist, ankle-length skirt)', 'Apron and bobbin (spinning/weaving rooms)', 'Young, unmarried farm daughters', 'Not Victorian lace finery'],
  ['hoop skirt (1850s+)', 'Gilded Age bustle', 'modern hairstyle', 'flapper dress'],
  1, ['unit4', 'industrialization', 'women', 'labor', 'market-revolution'], 'the bobbin held in the right hand'),
C('irish-laborer-1840s', 'Irish immigrant laborer (1840s)', [4, 5], 'c. 1845–1855',
  '''Irish immigrant laborer on a canal or railroad crew in the late 1840s: a worn dark wool tailcoat with frayed cuffs, a
  waistcoat over a collarless linen shirt, a knotted neckerchief, patched wool trousers, heavy hobnailed boots, a
  battered low-crowned felt hat, clean-shaven with side whiskers, holding a long-handled spade.''',
  ['Worn secondhand formal coat (common among laborers)', 'Spade or pick — canal/railroad work', 'Famine-era immigration 1845–1852', 'Respectful, non-caricatured'],
  ['simian Victorian anti-Irish caricature', 'leprechaun or shamrock clichés', 'whiskey bottle', 'green costume'],
  2, ['unit4', 'immigration', 'labor', 'nativism'], 'the spade held upright', 'care', 'Avoid 19th-century anti-Irish caricature conventions (Thomas Nast–style simian faces).'),
C('union-soldier', 'Union soldier (1863)', [5], 'c. 1862–1865',
  '''Union infantry private during the Civil War: a dark blue wool four-button sack coat, sky-blue kersey trousers, a
  dark blue forage cap with a short brim, black leather brogans, a black leather cartridge box on a shoulder belt, a
  tin canteen in a wool cover, a rolled wool blanket, holding a Springfield Model 1861 rifle-musket.''',
  ['Dark blue coat, sky-blue trousers', 'Forage cap (kepi style)', 'Springfield 1861 percussion rifle-musket', 'Brogans'],
  ['khaki', 'steel helmet', 'bolt-action rifle', 'modern camouflage'],
  1, ['unit5', 'civil-war', 'military', 'union'], 'the rifle-musket held at order arms'),
C('confederate-soldier', 'Confederate soldier (1863)', [5], 'c. 1862–1865',
  '''Confederate infantry private during the Civil War: a grey-brown butternut wool shell jacket with a short standing
  collar and plain buttons, mismatched grey trousers, a sweat-stained brown slouch hat, worn brogans, a rolled
  blanket worn across the body, a tin cup and haversack, gaunt face, holding an Enfield pattern 1853 rifle-musket.''',
  ['Butternut/grey shell jacket, irregular supply', 'Slouch hat', 'Enfield rifle-musket (imported)', 'No flag on the figure'],
  ['Confederate battle flag on clothing or held', 'heroic Lost Cause posing', 'modern camouflage'],
  2, ['unit5', 'civil-war', 'military', 'confederacy'], 'the rifle-musket held at order arms', 'care', 'Historical context only: no flags or Lost Cause romanticization in the figure.'),
C('usct-soldier', 'U.S. Colored Troops soldier (1864)', [5], 'c. 1863–1865',
  '''African American soldier of the United States Colored Troops, 1864, shown with dignity and resolve: a dark blue wool
  nine-button frock coat with sky-blue piping, sky-blue kersey trousers, a dark blue forage cap with a brass
  infantry horn insignia, black brogans, a black leather cartridge box and cap box on a white waist belt, holding a
  Springfield rifle-musket at order arms.''',
  ['Same regulation Union uniform as white soldiers', 'Roughly 180,000 served (estimate ~179,000)', 'Dignified, soldierly bearing', 'Springfield rifle-musket'],
  ['caricature', 'servile pose', 'Buffalo Soldier cavalry uniform of the 1870s', 'modern gear'],
  1, ['unit5', 'civil-war', 'military', 'african-american', 'union'], 'the rifle-musket at order arms', 'care', 'Dignified depiction; verify uniform against NMAAHC and Library of Congress USCT photographs.'),
C('freedman-1866', 'Freedman (1866)', [5], 'c. 1865–1870',
  '''African American freedman in the South in 1866, shown with dignity and self-possession: a brown wool sack coat, a
  buttoned waistcoat, a white cotton shirt with a dark cravat, grey wool trousers, worn leather boots, a black felt
  slouch hat, holding a printed labor contract in one hand and a small spelling primer in the other.''',
  ['Mid-1860s civilian dress', 'Labor contract and primer (education and contract labor)', 'Dignified, individual', 'Not shown in chains'],
  ['caricature', 'minstrel imagery', 'chains', 'Union uniform (unless intended)'],
  1, ['unit5', 'reconstruction', 'african-american'], 'the contract in the right hand and primer in the left', 'care', 'Dignified depiction of freedpeople; avoid Reconstruction-era racist caricature conventions.'),
C('freedwoman-1866', 'Freedwoman (1866)', [5], 'c. 1865–1870',
  '''African American freedwoman in the South in 1866, upright and composed: a long-sleeved printed cotton calico dress
  with a fitted bodice and full ankle-length skirt (no hoop), a white collar, a white apron, a head wrap of plaid
  cotton, leather shoes, holding a slate and a small schoolbook as a student at a freedmen's school.''',
  ['Mid-1860s working dress without hoop', 'Slate and schoolbook (freedmen\'s schools)', 'Dignified, individual', 'Head wrap'],
  ['"mammy" caricature', 'exaggerated features', 'chains'],
  2, ['unit5', 'reconstruction', 'african-american', 'women', 'education'], 'the slate held in the left hand', 'care', 'Dignified depiction; verify against period photographs (Library of Congress).'),
C('freedmens-bureau-agent', "Freedmen's Bureau agent (1866)", [5], 'c. 1865–1872',
  '''Freedmen's Bureau agent in 1866, a former Union army officer: a dark blue wool officer's frock coat with shoulder
  straps, a buttoned waistcoat, dark trousers, a dark slouch hat, full beard, a leather satchel strap across the
  chest, holding an open ledger book and a pencil to record a labor contract.''',
  ['Many agents were Union officers', 'Ledger for contracts and complaints', '1860s uniform/civilian mix', 'Generic person, not a named official'],
  ['modern clipboard', 'police badge', 'Confederate grey'],
  2, ['unit5', 'reconstruction', 'government'], 'the ledger open in the left hand'),
# ---------------- Unit 6 ----------------
C('cowboy-1870s', 'Cowboy (Texas trail drive, 1870s)', [6], 'c. 1870s',
  '''Texas cattle-drive cowboy in the 1870s: a high-crowned, wide-brimmed light felt hat with an uncreased or simple
  crown, a cotton bandana at the neck, a collarless pullover cotton shirt, a wool vest, wool trousers tucked into tall
  high-heeled leather boots with spurs, leather shotgun chaps, a canvas duster rolled on the shoulder, holding a coiled
  braided rawhide lariat.''',
  ['1870s hat (no 20th-century cattleman crease)', 'Shotgun chaps (batwings are later)', 'Boots with spurs', 'Lariat for trail work'],
  ['modern Stetson crease', 'denim jeans with modern cut', 'sunglasses', 'Hollywood gunslinger pose'],
  1, ['unit6', 'west', 'cattle'], 'the lariat coiled in the left hand'),
C('black-cowboy-1870s', 'Black cowboy (Texas trail drive, 1870s)', [6], 'c. 1870s',
  '''African American cowboy on a Texas cattle drive in the 1870s: a wide-brimmed dark felt hat, a red cotton bandana,
  a striped pullover cotton shirt, a buttoned wool vest, wool trousers tucked into high-heeled leather boots with
  spurs, leather shotgun chaps, a leather gun belt, confident relaxed stance, holding a coiled rawhide lariat.''',
  ['Many cowboys were Black (estimates often cited ~ one in four in Texas drives)', 'Same working gear as other cowboys', 'Dignified, skilled', '1870s gear'],
  ['caricature', 'servile pose', 'modern hat crease'],
  1, ['unit6', 'west', 'cattle', 'african-american'], 'the lariat coiled in the left hand', 'care', 'Dignified depiction; the "one in four" figure is an estimate — do not print it as fact.'),
C('vaquero-1870s', 'Mexican vaquero (1870s)', [6], 'c. 1860s–1880s',
  '''Mexican or Tejano vaquero in the 1870s: a wide flat-brimmed felt sombrero with a low crown and braided band, a short
  waist-length chaqueta jacket with embroidery, a cotton shirt with a sash at the waist, calzoneras trousers buttoned
  down the outer leg, leather botas leggings wrapped below the knee, large-roweled spurs, holding a long coiled
  braided rawhide reata.''',
  ['Vaqueros originated ranching techniques adopted by Anglo cowboys', 'Reata of braided rawhide', 'Calzoneras and botas', 'Sombrero with flat brim'],
  ['mariachi costume', 'sleeping-under-sombrero stereotype', 'bandido caricature', 'serape-as-costume cliché'],
  2, ['unit6', 'unit5', 'west', 'cattle', 'mexican-american'], 'the reata coiled in the left hand', 'care', 'Avoid Mexican stereotypes (bandido, siesta); verify against period photographs.'),
C('chinese-railroad-worker', 'Chinese railroad worker (Central Pacific, 1860s)', [5, 6], 'c. 1865–1869',
  '''Chinese immigrant laborer on the Central Pacific Railroad in the late 1860s: a loose indigo-blue cotton tunic with
  side fastening, wide cotton trousers, cloth shoes, a broad conical woven bamboo hat, hair in a long braided queue
  (required under Qing law), lean and strong, carrying a sledgehammer on the shoulder.''',
  ['Queue (Qing requirement)', 'Conical bamboo hat, cotton work clothes', 'Sierra Nevada railroad work (Central Pacific)', 'Dignified, individual face'],
  ['"coolie" caricature', 'buck teeth or slanted-eye caricature', 'Fu Manchu mustache', 'opium imagery', 'modern hard hat'],
  1, ['unit5', 'unit6', 'immigration', 'railroad', 'asian-american', 'labor'], 'the sledgehammer resting on the right shoulder', 'care', 'Avoid anti-Chinese caricature conventions; verify against Stanford Chinese Railroad Workers Project photographs.'),
C('plains-lakota-man', 'Lakota man (Northern Plains, 1870s)', [6], 'c. 1870s',
  '''Lakota man of the Northern Plains in the 1870s: a smoked deerskin shirt with porcupine-quill or beaded strips
  over the shoulders and sleeves, a wool trade-cloth breechcloth, deerskin leggings with beaded strips, beaded
  moccasins, a painted buffalo robe worn around the body, hair in two braids wrapped in fur with a single eagle
  feather, holding a bow in a quilled case.''',
  ['Single feather for daily wear; war bonnet only for honored men on occasions', 'Mix of hide and trade cloth by the 1870s', 'Buffalo robe', 'Lakota beadwork motifs (geometric)'],
  ['full war bonnet as default', 'warpaint savage trope', 'scalping imagery', 'Hollywood "chief" pose', 'tomahawk raised'],
  1, ['unit6', 'indigenous', 'plains', 'west'], 'the bow case held in the left hand', 'high', INDIG + ' Lakota: consult Akta Lakota Museum, South Dakota State Historical Society and NMAI collections.'),
C('plains-lakota-woman', 'Lakota woman (Northern Plains, 1870s)', [6], 'c. 1870s',
  '''Lakota woman of the Northern Plains in the 1870s: a dark blue wool trade-cloth dress with wide sleeves decorated
  across the yoke with rows of dentalium shells or elk teeth, a wide leather belt with brass tacks and an awl case,
  knee-high beaded leggings, beaded moccasins, hair in two braids with the part painted red, a small beaded bag.''',
  ['Wool trade-cloth dress with dentalium/elk teeth (1870s)', 'Hair part painted red', 'Awl case on belt', 'Not a "princess" costume'],
  ['"Indian princess" costume', 'feather headband', 'sexualized pose', 'tipi as background'],
  2, ['unit6', 'indigenous', 'plains', 'west', 'women'], 'the beaded bag held at the left side', 'high', INDIG + ' Lakota: consult Akta Lakota Museum and NMAI collections.'),
C('plains-homesteader', 'Plains homesteader (1880s)', [6], 'c. 1880s',
  '''Homesteading farmer on the Great Plains in the 1880s, near a sod house: a faded collarless cotton work shirt, a
  buttoned wool vest, heavy canvas trousers held up by suspenders, scuffed leather boots, a sweat-stained wide-brimmed
  felt hat, full beard, holding a steel-bladed hay fork.''',
  ['Homestead Act era', 'Suspenders and vest', 'Hay fork or plow handle', '1880s dress'],
  ['modern bib overalls with logos', 'tractor', 'cowboy gunfighter gear'],
  3, ['unit6', 'west', 'agriculture', 'populism'], 'the hay fork held upright'),
C('industrialist-1890s', 'Gilded Age businessman (1890s)', [6, 7], 'c. 1885–1900',
  '''Wealthy Gilded Age businessman in the 1890s (generic, not a real person): a black wool frock coat to the knee, a
  dove-grey double-breasted waistcoat with a gold watch chain, a high white wing collar with a dark silk cravat,
  striped grey trousers, polished black shoes, a tall black silk top hat, a trimmed mustache, holding a silver-topped
  walking stick.''',
  ['1890s formal day dress', 'Top hat and watch chain', 'Generic — must not resemble Rockefeller, Carnegie etc.', 'No caricature money-bag head'],
  ['money-bag caricature', 'resemblance to any real person', 'monocle villain cliché'],
  2, ['unit6', 'unit7', 'gilded-age', 'business'], 'the walking stick in the left hand'),
C('factory-worker-1890s', 'Factory worker (1890s)', [6, 7], 'c. 1890s–1900s',
  '''Industrial factory worker in the 1890s: a soot-stained collarless cotton shirt with sleeves rolled to the elbow, a
  dark wool vest, wool trousers held by suspenders, heavy leather work boots, a wool flat cap, a short mustache,
  carrying a tin lunch pail.''',
  ['Flat cap, suspenders, vest', 'Lunch pail', '1890s dress', 'Generic worker'],
  ['hard hat', 'safety goggles', 'modern jeans'],
  1, ['unit6', 'unit7', 'industrialization', 'labor'], 'the lunch pail in the left hand'),
C('child-mill-worker', 'Child mill worker (c. 1908)', [7], 'c. 1905–1915',
  '''Child worker of about twelve in a Southern textile mill around 1908, shown with dignity: a long-sleeved cotton
  dress in faded print with a pinafore apron, bare feet, hair tied back with a strip of cloth, lint on the clothing,
  tired but steady face, standing beside a large spool of cotton yarn.''',
  ['Bare feet in mills were common', 'Progressive Era child labor reform context (Lewis Hine documentation)', 'Dignified, not pitiable caricature', 'c. 1908 dress'],
  ['injury or gore', 'sentimentalized crying', 'modern clothing'],
  2, ['unit7', 'progressive-era', 'labor', 'children'], 'one hand resting on the spool', 'care', 'Child depiction: dignified and non-exploitative; verify against Lewis Hine photographs (Library of Congress).'),
C('immigrant-man-1900s', 'Immigrant man at Ellis Island (1900s)', [6, 7], 'c. 1900–1914',
  '''Newly arrived European immigrant man at Ellis Island around 1905: a heavy dark wool overcoat over a buttoned
  jacket and vest, a collarless shirt, wool trousers, worn leather boots, a wool flat cap, a full mustache, a
  paper inspection tag pinned to the coat, carrying a cloth-wrapped bundle and a battered leather suitcase tied with
  rope.''',
  ['Inspection tag on coat', 'Bundles and suitcase', 'c. 1900–1914 dress', 'Generic nationality, respectful'],
  ['ethnic caricature', 'modern luggage with wheels'],
  1, ['unit6', 'unit7', 'immigration'], 'the suitcase held in the right hand', 'care', 'Avoid ethnic caricature; verify against Augustus Sherman Ellis Island photographs.'),
C('immigrant-woman-1900s', 'Immigrant woman at Ellis Island (1900s)', [6, 7], 'c. 1900–1914',
  '''Newly arrived European immigrant woman at Ellis Island around 1905: a dark wool ankle-length skirt, a long-sleeved
  blouse, a heavy knitted shawl around the shoulders, a patterned headscarf tied under the chin, worn leather boots,
  a paper inspection tag pinned to the shawl, holding a small child's hand and carrying a wicker basket.''',
  ['Headscarf and shawl', 'Inspection tag', 'c. 1905 dress', 'Respectful, generic'],
  ['ethnic caricature', 'modern clothing'],
  2, ['unit6', 'unit7', 'immigration', 'women'], 'the basket on the left arm', 'care', 'Avoid ethnic caricature; verify against Ellis Island photographic archives.'),
# ---------------- Unit 7 ----------------
C('suffragist-1910s', 'Suffragist (1910s)', [7], 'c. 1910–1920',
  '''American suffragist marching in the 1910s: a white cotton shirtwaist blouse with a high collar, a long white skirt
  to the ankle, a plain cloth sash worn over one shoulder in solid color with no lettering, a wide-brimmed straw hat
  with a ribbon, white gloves, laced leather boots, holding a blank cloth banner on a wooden pole.''',
  ['White dress (suffrage parades)', 'Sash with no text (code renders text)', '1910s silhouette, ankle-length skirt', 'Generic, not a named suffragist'],
  ['text on sash or banner', 'flapper dress', 'resemblance to Alice Paul or other named figures'],
  1, ['unit7', 'progressive-era', 'women', 'suffrage'], 'the banner pole held in both hands'),
C('doughboy-1918', 'WWI American doughboy (1918)', [7], '1917–1918',
  '''American Expeditionary Forces infantryman in 1918: an olive-drab wool tunic with a high standing collar and four
  pockets, olive-drab wool breeches, wrapped wool puttees, brown leather hobnailed boots, an olive-drab steel M1917
  Brodie helmet, a canvas cartridge belt and gas-mask bag, holding an M1903 Springfield rifle.''',
  ['Brodie (dish) helmet', 'Standing-collar tunic, puttees', 'M1903 Springfield or M1917 Enfield', 'Gas mask bag'],
  ['WWII M1 helmet', 'German Stahlhelm', 'modern camouflage'],
  1, ['unit7', 'wwi', 'military'], 'the rifle at order arms'),
C('harlem-musician-1920s', 'Harlem jazz musician (1920s)', [7], 'c. 1925–1930',
  '''African American jazz musician in a Harlem club in the late 1920s (generic, not a real person): a black double-breasted
  tuxedo jacket with satin lapels, a white wing-collar shirt and black bow tie, high-waisted black trousers,
  polished two-tone shoes, neatly pomaded short hair, holding a brass trumpet.''',
  ['Late-1920s formal band attire', 'Brass trumpet or cornet', 'Generic — not Armstrong or Ellington', 'Dignified'],
  ['minstrel caricature', 'exaggerated features', 'resemblance to real musicians', 'modern instrument'],
  1, ['unit7', 'harlem-renaissance', 'african-american', 'culture'], 'the trumpet held in the right hand'),
C('flapper-1920s', 'Flapper (1920s)', [7], 'c. 1925–1929',
  '''Young American woman of the late 1920s: a knee-length drop-waist sleeveless dress in slate blue with a beaded fringe
  hem, a long strand of pearls, a close-fitting felt cloche hat over a short bobbed haircut, sheer stockings,
  T-strap shoes with a low heel, holding a small beaded purse.''',
  ['Knee-length hem (c. 1926–29)', 'Bobbed hair, cloche hat', 'T-strap shoes', 'Drop waist'],
  ['modern costume-party flapper with feather boa clichés', 'miniskirt', 'cigarette holder caricature'],
  2, ['unit7', 'twenties', 'women', 'culture'], 'the purse held in the left hand'),
C('dust-bowl-farmer', 'Dust Bowl farmer (1930s)', [7], 'c. 1934–1937',
  '''Southern Plains farmer during the Dust Bowl, mid-1930s: faded denim bib overalls over a sweat-stained collarless
  work shirt, a cotton bandana loose around the neck for dust, a worn felt fedora with a dusty brim, scuffed leather
  work boots, thin weathered face, holding a long-handled shovel.''',
  ['Bib overalls, bandana for dust', '1930s hat', 'Weathered appearance', 'Generic farmer'],
  ['modern logos', 'cowboy movie costume', 'tractor'],
  1, ['unit7', 'great-depression', 'agriculture'], 'the shovel held upright'),
C('rosie-worker-1943', 'Woman defense worker (1943)', [7], 'c. 1942–1945',
  '''American woman aircraft-plant worker in 1943: navy-blue cotton work coveralls with sleeves rolled up, a cloth
  bandana tied over the hair, a leather work belt, flat leather work shoes, a factory identification badge clipped
  to the chest pocket, holding a pneumatic rivet gun with an air hose.''',
  ['Coveralls and hair covering for safety', 'Rivet gun (aircraft riveting)', 'Badge with no readable text', 'Generic worker — not a copy of the "We Can Do It!" poster'],
  ['copy of the J. Howard Miller poster pose', 'pin-up styling', 'text on badge'],
  1, ['unit7', 'wwii', 'women', 'home-front', 'labor'], 'the rivet gun held in the right hand'),
C('wwii-gi', 'WWII American GI (1944)', [7], 'c. 1943–1945',
  '''U.S. Army infantryman in 1944: an M1 steel helmet with a camouflage net, an olive-drab M1943 field jacket, olive-drab
  wool trousers, brown leather combat boots with double-buckle cuffs, a canvas web cartridge belt with a canteen
  and first-aid pouch, holding an M1 Garand rifle.''',
  ['M1 helmet (round)', 'M1943 jacket', 'Buckle boots', 'M1 Garand'],
  ['Brodie helmet', 'M16 rifle', 'modern camouflage', 'Kevlar helmet'],
  1, ['unit7', 'wwii', 'military'], 'the rifle at port arms'),
C('japanese-american-man-1942', 'Japanese American man at removal (1942)', [7], '1942',
  '''Japanese American man in spring 1942 awaiting forced removal to an incarceration camp, dressed in his best: a dark
  wool suit with a white shirt and tie, a felt fedora, polished leather shoes, a paper family identification tag
  tied with string to his lapel button, holding a packed suitcase, composed and dignified expression.''',
  ['Many families dressed formally for removal', 'Family identification tag on button (as in Dorothea Lange photos)', 'Only what they could carry', 'Dignified, individual face'],
  ['caricature', 'wartime propaganda imagery', 'military uniform', 'barbed wire on the figure', 'tag with readable text'],
  1, ['unit7', 'wwii', 'asian-american', 'internment', 'civil-liberties'], 'the suitcase held in the right hand', 'high', 'Incarceration of Japanese Americans: dignified depiction; verify against Dorothea Lange and Densho photographs; use the term "incarceration" in captions.'),
C('japanese-american-woman-1942', 'Japanese American woman at removal (1942)', [7], '1942',
  '''Japanese American woman in spring 1942 awaiting forced removal, dressed carefully: a knee-length belted wool coat
  over a 1940s dress, a small hat, low-heeled shoes, a paper family identification tag tied to her coat button,
  holding a canvas duffel bag and a child's hand, steady dignified expression.''',
  ['1942 women\'s dress', 'Identification tag', 'Dignified, individual', 'Family context'],
  ['caricature', 'kimono as costume (most were American-born and dressed in Western clothes)', 'tag text'],
  1, ['unit7', 'wwii', 'asian-american', 'internment', 'women'], 'the duffel bag held in the left hand', 'high', 'Incarceration of Japanese Americans: verify against Densho and National Archives (WRA) photographs.'),
# ---------------- Unit 8 ----------------
C('suburban-father-1950s', 'Suburban father (1950s)', [8], 'c. 1953–1959',
  '''Suburban American father in the mid-1950s: a grey flannel single-breasted suit with narrow lapels, a white shirt and
  narrow dark tie, a felt fedora with a short brim, polished black oxford shoes, short side-parted hair, carrying a
  leather briefcase.''',
  ['"Man in the Grey Flannel Suit" look', 'Fedora still common in the 1950s', 'Briefcase commuter', 'Generic'],
  ['1970s wide lapels', 'smartphone', 'modern sneakers'],
  2, ['unit8', 'fifties', 'suburbs'], 'the briefcase in the right hand'),
C('suburban-mother-1950s', 'Suburban mother (1950s)', [8], 'c. 1953–1959',
  '''Suburban American woman in the mid-1950s: a shirtwaist dress with a fitted bodice, a full mid-calf skirt in sage green
  with a narrow belt, a white Peter Pan collar, low-heeled pumps, short curled hair, a light cardigan over the
  shoulders, holding a casserole dish with oven mitts.''',
  ['1950s shirtwaist silhouette', 'Mid-calf full skirt', 'Domestic ideal of the era', 'Generic'],
  ['pin-up styling', 'miniskirt', 'modern appliances'],
  2, ['unit8', 'fifties', 'suburbs', 'women'], 'the casserole held in both hands'),
C('civil-rights-marcher-man', 'Civil rights marcher, man (1963)', [8], 'c. 1960–1965',
  '''African American man marching for civil rights in 1963, dressed formally as many marchers did: a dark suit with
  narrow lapels, a white shirt and slim tie, a short-brimmed felt hat, polished shoes, determined calm expression,
  holding a blank rectangular protest placard on a wooden stick.''',
  ['Formal dress at 1963 March on Washington', 'Placard blank (text in code)', 'Dignified', 'Generic, not Dr. King or other named leader'],
  ['text on placard', 'resemblance to real leaders', 'caricature'],
  1, ['unit8', 'civil-rights', 'african-american'], 'the placard held up in both hands', 'care', 'Dignified depiction; generic person.'),
C('civil-rights-marcher-woman', 'Civil rights marcher, woman (1963)', [8], 'c. 1960–1965',
  '''African American woman marching for civil rights in 1963: a modest knee-length dress in slate blue, a light coat,
  a small pillbox hat, low-heeled pumps, a handbag on the forearm, neatly styled hair, resolute expression, holding a
  blank protest placard on a wooden stick.''',
  ['Early-1960s dress', 'Blank placard', 'Dignified', 'Generic'],
  ['text on placard', 'caricature', 'resemblance to Rosa Parks or other named figures'],
  1, ['unit8', 'civil-rights', 'african-american', 'women'], 'the placard held up in the right hand', 'care', 'Dignified depiction; generic person.'),
C('vietnam-soldier', 'Vietnam-era U.S. soldier (1968)', [8], 'c. 1966–1971',
  '''U.S. Army infantryman in Vietnam, 1968: olive-green ripstop jungle fatigues (tropical combat uniform) with slanted
  chest pockets, sleeves rolled, an M1 steel helmet with a leaf-pattern camouflage cover and an elastic band, black
  leather and green nylon jungle boots, web gear with canteens, holding an M16 rifle.''',
  ['Jungle fatigues with slanted pockets', 'M1 helmet with Mitchell camouflage cover', 'Jungle boots', 'M16 rifle'],
  ['Kevlar PASGT helmet (1980s)', 'desert camouflage', 'graffiti text on helmet'],
  1, ['unit8', 'vietnam', 'military', 'cold-war'], 'the rifle held at the ready, muzzle down'),
C('antiwar-protester-1968', 'Antiwar student protester (1968)', [8], 'c. 1967–1970',
  '''American college student at a 1968 antiwar demonstration: shoulder-length hair, a corduroy jacket over a striped
  knit shirt, flared denim jeans, desert boots, round wire-rim glasses, earnest expression, holding a blank hand-painted
  cardboard placard on a stick.''',
  ['Late-1960s campus dress', 'Blank placard', 'Earnest, not mocked', 'Generic'],
  ['text on placard', 'peace-sign overload clichés', 'drug paraphernalia', 'mocking hippie caricature'],
  2, ['unit8', 'vietnam', 'protest', 'counterculture'], 'the placard held up in both hands'),
C('farmworker-1965', 'Farmworker, grape strike (1965)', [8], 'c. 1965–1970',
  '''Mexican American or Filipino American farmworker in the California grape fields during the 1965 Delano strike: a
  long-sleeved cotton work shirt, faded denim trousers, worn leather work boots, a woven straw hat, a cotton bandana at
  the neck, holding a pair of grape-picking shears and a shallow wooden lug box.''',
  ['Delano grape strike began with Filipino AWOC workers, joined by NFWA', 'Field work clothing', 'Dignified', 'No readable union text'],
  ['stereotyped sombrero', 'text on clothing', 'caricature'],
  2, ['unit8', 'labor', 'latino', 'asian-american'], 'the lug box held at the left hip', 'care', 'Avoid ethnic stereotypes; generic worker.'),
# ---------------- Unit 9 ----------------
C('office-worker-1980s', 'Office worker (1980s)', [9], 'c. 1983–1989',
  '''Professional office worker in the mid-1980s: a navy blue skirt suit with broad padded shoulders, a white blouse with a
  soft bow at the collar, sheer hose, low navy pumps, voluminous permed hair, carrying a leather briefcase and a
  stack of manila file folders.''',
  ['Shoulder pads and bow blouse (power dressing)', '1980s hairstyle', 'Briefcase and folders', 'Generic'],
  ['smartphone', 'laptop', 'modern slim suit'],
  2, ['unit9', 'eighties', 'economy'], 'the briefcase in the right hand'),
C('person-2000s', 'Everyday person (2000s)', [9], 'c. 2005–2010',
  '''Young adult in the late 2000s: a grey zip-up hooded sweatshirt over a plain t-shirt, straight-leg denim jeans,
  canvas sneakers, a messenger bag across the body, white earbuds with a cord, holding an early touchscreen smartphone.''',
  ['Late-2000s casual dress', 'Corded earbuds', 'Early smartphone (2007+)', 'No brand logos'],
  ['brand logos', 'wireless earbuds (2016+)', 'face mask'],
  3, ['unit9', 'digital', 'contemporary'], 'the phone held in the right hand'),
]

write('characters.json', 'characters',
      'Generic era/role people (never real named individuals) as rigged image cut-outs that complement the SVG puppets in src/motion/characters.tsx. Each has idle/point/speak/walk pose variants.',
      items)
