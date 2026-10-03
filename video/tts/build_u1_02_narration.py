"""Build video/tts/vid-u1-02.narration.json — canonical TTS script, both engines."""
import json
import xml.etree.ElementTree as ET

V = "en-US-ChristopherNeural"  # HOST voice; swap as needed

def ssml(body):
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" '
        'xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="en-US">'
        f'<voice name="{V}">{body}</voice></speak>'
    )

def styled(style, body, degree=None):
    d = f' styledegree="{degree}"' if degree else ''
    return f'<mstts:express-as style="{style}"{d}>{body}</mstts:express-as>'

E = "\u2014"  # em dash

segs = [
 {
  "key": "s01", "target_s": 10,
  "direction": "awed; title slam at 0:01",
  "text": f"In 1491, North America held not one civilization {E} but three completely different ways of being human.",
  "ssml": ssml(styled("excited",
    'In 1491, North America held not one civilization <break time="500ms"/> but three completely different ways of being human.')),
 },
 {
  "key": "s02", "target_s": 30,
  "direction": "hook; kinetic slam MAIZE = DENSITY = COMPLEXITY at 0:30",
  "text": "This is Florida, drawn from a French expedition's report. Row after row of planted maize. And here's what most textbooks bury: maize wasn't just food. Where maize grew reliably, people stayed in one place. Where they stayed, populations exploded. And where populations exploded, strangers had to figure out how to live together "
    f"{E} rulers, priests, armies, cities. This planting row is the seed of everything in this video.",
  "ssml": ssml(
    "This is Florida, drawn from a French expedition's report. Row after row of planted maize. "
    "And here's what most textbooks bury: <emphasis level=\"strong\">maize wasn't just food.</emphasis> <break time=\"600ms\"/> "
    "Where maize grew reliably, people stayed in one place. Where they stayed, populations exploded. "
    "And where populations exploded, strangers had to figure out how to live together <break time=\"300ms\"/> "
    "<prosody rate=\"+20%\">rulers, priests, armies, cities.</prosody> <break time=\"500ms\"/> "
    "This planting row is the seed of everything in this video."),
 },
 {
  "key": "s03", "target_s": 40,
  "direction": "map fills 3 regions; counter 3; WHY DID THEY DIVERGE? at 1:10",
  "text": f"Geography dealt three different hands. In the river valleys of the East: deep soil, long summers {E} maize on a massive scale. On the Great Plains: oceans of grass and millions of bison {E} but no reliable farming, so people kept moving. In the arid Southwest: maize only where desert rivers ran, so people clustered tight around water. Same continent. Mostly the same crop. Three totally different societies. The question this video answers: why?",
  "ssml": ssml(
    "Geography dealt three different hands. <break time=\"500ms\"/> "
    "In the river valleys of the East: deep soil, long summers <break time=\"300ms\"/> maize on a massive scale. "
    "On the Great Plains: oceans of grass and millions of bison <break time=\"300ms\"/> but no reliable farming, so people kept moving. "
    "In the arid Southwest: maize only where desert rivers ran, so people clustered tight around water. <break time=\"500ms\"/> "
    "Same continent. Mostly the same crop. Three totally different societies. "
    "<prosody rate=\"-15%\">The question this video answers: why?</prosody>"),
 },
 {
  "key": "s04", "target_s": 10,
  "direction": "transition; lower third WAY 1 \u2014 THE EAST",
  "text": f"First {E} the East. Where the rivers ran, cities rose.",
  "ssml": ssml("First <break time=\"400ms\"/> the East. Where the rivers ran, cities rose."),
 },
 {
  "key": "s05", "target_s": 70,
  "direction": "awed then solemn; counter 0->20,000 at 1:50; NO WHEELS... at 2:10; refrain 1",
  "text": f"This is Cahokia, outside modern St. Louis. Around the year 1200, twenty thousand people lived here {E} as large as London. At its center, Monks Mound: a hundred feet of packed earth, built basketful by basketful {E} with no wheels, no draft animals, no metal tools. A temple on top. A stockaded city with guard towers below. This wasn't a village. It was a chiefdom {E} one paramount chief who could command thousands of laborers. And it all rested on maize. The Mississippi floodplain grew corn in such surplus that not everyone had to farm {E} which meant artisans, priests, soldiers, rulers. Surplus is the mother of hierarchy. But here's what students miss: Cahokia was already declining before any European arrived. Drought, deforestation, maybe revolt {E} by 1400 it stood largely empty. Complexity is fragile.",
  "ssml": ssml(
    styled("excited",
    "This is Cahokia, outside modern St. Louis. Around the year 1200, <emphasis level=\"strong\">twenty thousand people</emphasis> lived here <break time=\"300ms\"/> as large as London. "
    "At its center, Monks Mound: a hundred feet of packed earth, built basketful by basketful <break time=\"300ms\"/> "
    "<prosody rate=\"-15%\">with no wheels, no draft animals, no metal tools.</prosody> "
    "A temple on top. A stockaded city with guard towers below. <break time=\"500ms\"/> "
    "This wasn't a village. It was a chiefdom <break time=\"300ms\"/> one paramount chief who could command thousands of laborers. "
    "And it all rested on maize. The Mississippi floodplain grew corn in such surplus that not everyone had to farm <break time=\"300ms\"/> which meant artisans, priests, soldiers, rulers. "
    "Surplus is the mother of hierarchy.")
    + " <break time=\"800ms\"/> <prosody rate=\"-10%\" pitch=\"-5%\">"
    + "But here's what students miss: Cahokia was already declining before any European arrived. "
    "Drought, deforestation, maybe revolt <break time=\"300ms\"/> by 1400 it stood largely empty. "
    "<prosody rate=\"-15%\">Complexity is fragile.</prosody></prosody>"),
 },
 {
  "key": "s06", "target_s": 10,
  "direction": "transition; lower third WAY 2 \u2014 THE PLAINS",
  "text": f"Second {E} the Plains. No maize. No cities. A totally different answer.",
  "ssml": ssml("Second <break time=\"400ms\"/> the Plains. No maize. No cities. A totally different answer."),
 },
 {
  "key": "s07", "target_s": 65,
  "direction": "urgent horse turn; SPEED WAS THEIR SURPLUS at 3:30; refrain 2",
  "text": f"The Great Plains are a sea of grass {E} and the open Plains were brutally hard to live on. Little wood, little stone, and the bison {E} millions of them {E} too fast to catch on foot. So Plains peoples lived as small, mobile bands: following the herds, living in tipis they could pack in an hour, organizing around the hunt instead of the harvest. Then the Spanish brought the horse {E} and everything changed. A hunter on horseback could take bison at will. The Plains began to support the Lakota, the Comanche {E} mounted powers built on mobility itself. Notice the contrast: the Mississippians built power by staying put and stacking surplus grain. The Plains built power by moving. Speed was their surplus.",
  "ssml": ssml(
    "The Great Plains are a sea of grass <break time=\"300ms\"/> and the open Plains were brutally hard to live on. "
    "Little wood, little stone, and the bison <break time=\"300ms\"/> <emphasis level=\"strong\">millions</emphasis> of them <break time=\"300ms\"/> too fast to catch on foot. "
    "So Plains peoples lived as small, mobile bands: following the herds, living in tipis they could pack in an hour, organizing around the hunt instead of the harvest. <break time=\"500ms\"/> "
    + styled("excited", "Then the Spanish brought the horse <break time=\"300ms\"/> and everything changed.")
    + " A hunter on horseback could take bison at will. The Lakota, the Comanche <break time=\"300ms\"/> mounted powers built on mobility itself. <break time=\"600ms\"/> "
    "Notice the contrast: the Mississippians built power by staying put and stacking surplus grain. The Plains built power by moving. "
    "Speed was their surplus."),
 },
 {
  "key": "s08", "target_s": 10,
  "direction": "transition; lower third WAY 3 \u2014 THE SOUTHWEST",
  "text": f"Third {E} the Southwest. Maize, but only where the water ran.",
  "ssml": ssml("Third <break time=\"400ms\"/> the Southwest. Maize, but only where the water ran."),
 },
 {
  "key": "s09", "target_s": 45,
  "direction": "THE DESERT CAPPED EVERYTHING at 4:30; refrain 3 (environment sets the menu)",
  "text": f"Taos Pueblo, New Mexico {E} people have lived in these adobe terraces for a thousand years. The Southwest is desert, so maize farming worked only along rivers and where the summer rains fell. Pueblo peoples clustered tight: multi-story apartment towns around a shared plaza, with irrigation, granaries, ceremony. Dense like the East, but small {E} the desert capped how large any town could grow. And when the great drought came around 1300, whole towns were abandoned {E} the migrations that emptied Mesa Verde. The lesson of all three ways: the environment sets the menu {E} and every society orders from it.",
  "ssml": ssml(
    "Taos Pueblo, New Mexico <break time=\"300ms\"/> people have lived in these adobe terraces for a thousand years. "
    "The Southwest is desert, so maize farming worked only along rivers and where the summer rains fell. "
    "Pueblo peoples clustered tight: multi-story apartment towns around a shared plaza, with irrigation, granaries, ceremony. "
    "Dense like the East, but small <break time=\"300ms\"/> <prosody rate=\"-15%\">the desert capped how large any town could grow.</prosody> "
    "And when the great drought came around 1300, whole towns were abandoned <break time=\"300ms\"/> the migrations that emptied Mesa Verde. <break time=\"500ms\"/> "
    "The lesson of all three ways: the environment sets the menu <break time=\"300ms\"/> and every society orders from it."),
 },
 {
  "key": "s10", "target_s": 40,
  "direction": "solemn; Atlantic map route arrows; counter 90%",
  "text": f"Now freeze this picture. Because a fourth way of life is about to crash into all three. Europeans arrive with steel, gunpowder, horses {E} and deadliest of all, diseases no Native immune system had ever met. Within a century, in some regions up to ninety percent of the Native population is gone. The three ways of life you just learned don't vanish {E} but they are bent, broken, and remade under conquest, trade, and epidemic. That's the next video.",
  "ssml": ssml("<prosody rate=\"-10%\" pitch=\"-5%\">"
    "Now freeze this picture. <break time=\"800ms\"/> "
    "Because a fourth way of life is about to crash into all three. "
    "Europeans arrive with steel, gunpowder, horses <break time=\"300ms\"/> and deadliest of all, diseases no Native immune system had ever met. "
    "Within a century, in some regions <emphasis level=\"strong\">up to ninety percent</emphasis> of the Native population is gone. "
    "The three ways of life you just learned don't vanish <break time=\"300ms\"/> but they are bent, broken, and remade under conquest, trade, and epidemic. <break time=\"500ms\"/> "
    "That's the next video.</prosody>"),
 },
 {
  "key": "s11", "target_s": 10,
  "direction": "quiet; AI clip 5, no text",
  "text": "Three lands. Three answers. One collision coming.",
  "ssml": ssml(styled("whispering", "Three lands. Three answers. <break time=\"500ms\"/> One collision coming.")),
 },
 {
  "key": "s12", "target_s": 20,
  "direction": "fast recap; three cards slam; end card NEXT: COLLISION",
  "text": "East: maize, cities, chiefs. Plains: bison, mobility, the horse. Southwest: desert rivers, pueblos, tight towns. Geography wrote the first draft of American history. Next: Europe arrives.",
  "ssml": ssml(
    "<prosody rate=\"+20%\">East: maize, cities, chiefs. Plains: bison, mobility, the horse. Southwest: desert rivers, pueblos, tight towns.</prosody> "
    "<break time=\"500ms\"/> <prosody rate=\"-15%\">Geography wrote the first draft of American history.</prosody> <break time=\"500ms\"/> "
    "Next: Europe arrives."),
 },
]

for s in segs:
    s["voice"] = "host"
    s["edge_voice"] = V

out = {
    "video": "vid-u1-02",
    "title": "Three Ways to Live in America",
    "engine_notes": (
        "Fish: use 'text' (clean, no tags); performance comes from the reference audio energy + 'direction' notes. "
        "The Fish renderer does not parse direction tags yet. "
        "Edge: use 'ssml' per segment; edge-tts auto-detects SSML when input starts with <speak. "
        "Outputs: video/audio/vid-u1-02/<key>.mp3 (s01..s12)."
    ),
    "segments": segs,
}
with open("video/tts/vid-u1-02.narration.json", "w", encoding="utf-8") as f:
    json.dump(out, f, indent=1, ensure_ascii=False)

for s in segs:
    ET.fromstring(s["ssml"])  # validates XML
print("segments:", len(segs),
      "| total words:", sum(len(s["text"].split()) for s in segs),
      "| all 12 SSML blocks valid XML")
