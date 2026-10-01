"""Build ch03-saq.json, exam1-saq.json, exam2-saq.json — remapped to new SAQ format
(Q1 secondary-text, Q2 primary-text, Q3 non-text). Rewrite-never-copy."""
import json, os

OUTDIR = os.path.dirname(os.path.abspath(__file__)) + '/..'

def S(iid, stim, stype, ssource, parts, exemplar, period, themes, skill, reasoning,
      diff, src):
    return {"id": iid, "type": "saq", "stimulus_type": stype,
            "source_type": ssource, "format": "remapped",
            "stimulus": stim, "parts": parts, "exemplar": exemplar,
            "difficulty": diff, "period": period, "themes": themes,
            "skill": skill, "reasoning": reasoning, "inspired_by": src}

ch03 = [S(
    "5s24-ch03-saq-01",
    "\"The sixteen years of Jefferson and Madison's rule furnished international "
    "tests of popular intelligence upon which Americans could depend. \u2026 Yet "
    "the Americans developed, in the course of twenty years, a surprising degree "
    "of skill in naval affairs. \u2026 Not only were American vessels better in "
    "model, faster in sailing \u2026 but they were also better equipped.\" "
    "\u2014Henry Adams, History of the United States During the Administrations "
    "of Thomas Jefferson and James Madison, 1889\u20131891 (abridged)",
    "secondary", "pd-quote",
    ["A. Briefly describe Adams's perspective on the American navy during the War of 1812 era.",
     "B. Briefly explain ONE historical event or development that supports Adams's perspective.",
     "C. Briefly explain ONE historical event or development that challenges Adams's perspective."],
    "A. Adams argues that despite starting with fewer ships, resources, and experience than Britain, France, or Spain, the United States developed surprising naval skill, building faster, better-handled, and better-equipped vessels.\n\n"
    "B. The USS Constitution's victories over HMS Guerriere and HMS Java in 1812 support Adams: single American frigates repeatedly defeated comparable British warships.\n\n"
    "C. The British naval blockade of the American coast devastated U.S. trade and bottled up the tiny American fleet, showing the limits of American naval power against Britain's overwhelming numbers.",
    "U4", ["WXT", "PCE"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/ch03.xhtml"),
S(
    "5s24-ch03-saq-02",
    "\"British cruisers have been in the continued practice of violating the "
    "American flag on the great highway of nations, and of seizing and carrying "
    "off persons sailing under it\u2026\" "
    "\u2014James Madison, war message to Congress, June 1, 1812 (abridged)",
    "primary", "pd-quote",
    ["A. Briefly explain the grievance Madison describes in the passage.",
     "B. Briefly explain ONE reason some Americans opposed declaring war in 1812.",
     "C. Briefly explain ONE immediate consequence of the declaration of war."],
    "A. Madison describes impressment: the British navy stopping American ships and seizing sailors, a violation of American sovereignty and neutral rights.\n\n"
    "B. New England Federalists opposed the war because their region depended on trade with Britain and feared economic ruin from a British blockade.\n\n"
    "C. The United States immediately launched invasions of Canada, beginning with the failed 1812 campaign from Detroit.",
    "U4", ["WXT", "PCE"], "Sourcing & Situation", "Causation", "medium",
    "5steps-2024/ch03.xhtml"),
S(
    "5s24-ch03-saq-03",
    "The following map shows the major battles of the War of 1812 in North America: "
    "British attacks marked at Washington (burned, August 1814), Baltimore (Fort "
    "McHenry, September 1814), and New Orleans (January 1815); American victories "
    "marked at Lake Erie (September 1813) and the Thames (October 1813); and arrows "
    "showing the failed American invasions of Canada launched from Detroit, Niagara, "
    "and Montreal.",
    "non-text", "original",
    ["A. Identify and briefly explain ONE pattern shown by the locations of the battles on the map.",
     "B. Briefly explain ONE way the outcome of the war affected American nationalism.",
     "C. Briefly explain ONE limitation of the map for understanding the causes of the war."],
    "A. British attacks cluster on the Atlantic coast and the Gulf, reflecting Britain's naval power and ability to strike American cities from the sea, while American offensives point northward at Canada, the target the United States hoped to conquer.\n\n"
    "B. American victories at Baltimore and New Orleans fueled postwar nationalism: Francis Scott Key wrote 'The Star-Spangled Banner,' and the 'Era of Good Feelings' celebrated the republic's survival against Britain.\n\n"
    "C. The map shows where fighting occurred but not why the war began; it reveals nothing about impressment, British trade restrictions, or congressional War Hawks' motives.",
    "U4", ["WXT", "NAT"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/ch03.xhtml")]

exam1 = [S(
    "5s24-exam1-saq-01",
    "\"Each side had advantages. But neither section understood the other. If the "
    "South had known that secession must result in war and that the foe would be "
    "a united North, it is doubtful if she would have proceeded to the last "
    "extremity. \u2026 But now the North confronted five and a half million "
    "earnest and brave people, supported by three and a half million servants, who "
    "grew the food and took care of the women and children at home while the men "
    "fought in the field.\" "
    "\u2014James Ford Rhodes, History of the Civil War, 1917 (abridged)",
    "secondary", "pd-quote",
    ["A. Briefly explain Rhodes's perspective on Northern and Southern attitudes at the start of the war.",
     "B. Briefly explain ONE historical event or development that supports Rhodes's argument.",
     "C. Briefly explain ONE historical event or development that illustrates an unwillingness on one side to compromise before the war."],
    "A. Rhodes argues that both sides misread each other: the South did not expect the North to unite and fight for the Union, and the North did not expect the South to unite behind secession.\n\n"
    "B. The First Battle of Bull Run (1861) supports Rhodes: Northerners expected a quick, easy victory, but the Confederate stand showed the South was united and determined to fight.\n\n"
    "C. The failure of the Crittenden Compromise in early 1861 shows unwillingness to compromise: Republicans rejected any deal extending slavery's protection, and seceding states refused to return.",
    "U5", ["PCE", "NAT"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/exam1.xhtml"),
S(
    "5s24-exam1-saq-02",
    "In a 1963 book, Betty Friedan described a 'strange stirring, a sense of "
    "dissatisfaction' among suburban housewives who wondered, 'Is this all?' In "
    "response, conservative activist Phyllis Schlafly argued that the women's "
    "movement harmed family life and increased divorce, insisting that motherhood "
    "required subordinating self-fulfillment and career ambitions to children's "
    "well-being. \u2014Paraphrase of Betty Friedan, The Feminine Mystique, 1963, "
    "and Phyllis Schlafly, writings on the women's movement, 1970s (abridged)",
    "primary", "paraphrase",
    ["A. Briefly explain ONE political or social position supported by Betty Friedan.",
     "B. Briefly explain ONE political or social position supported by Phyllis Schlafly.",
     "C. Briefly explain ONE way one of these perspectives influenced American politics."],
    "A. Friedan supported full equality for women: access to careers and education, an end to sex discrimination, and passage of the Equal Rights Amendment.\n\n"
    "B. Schlafly opposed the Equal Rights Amendment and defended traditional gender roles, arguing that women's fulfillment came through marriage and motherhood.\n\n"
    "C. Schlafly's STOP ERA campaign mobilized conservative women and helped defeat the Equal Rights Amendment, reshaping the Republican Party's platform on gender issues.",
    "U8", ["SOC", "PCE"], "Sourcing & Situation", "Comparison", "medium",
    "5steps-2024/exam1.xhtml"),
S(
    "5s24-exam1-saq-03",
    "The following bar graph compares Union and Confederate military deaths during "
    "the Civil War, 1861\u20131865: approximately 360,000 Union dead and 260,000 "
    "Confederate dead, with disease listed as the largest single cause of death in "
    "both armies, ahead of battle wounds.",
    "non-text", "original",
    ["A. Identify and briefly explain ONE conclusion supported by the data in the graph.",
     "B. Briefly explain ONE way the scale of wartime death affected American society after 1865.",
     "C. Briefly explain ONE limitation of the graph for evaluating Rhodes's argument about Northern and Southern attitudes."],
    "A. The war was extraordinarily lethal: over 600,000 soldiers died, and disease killed more men than combat, reflecting primitive medicine and unsanitary camps.\n\n"
    "B. The enormous death toll produced national cemeteries, Memorial Day observances, and a generation of widows and orphans, while the South's heavier proportional losses fed Lost Cause memorial culture.\n\n"
    "C. Casualty totals reveal the war's cost but not what soldiers or civilians believed; they cannot show whether the North and South misunderstood each other, which is Rhodes's actual claim.",
    "U5", ["WXT", "SOC"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/exam1.xhtml")]

exam2 = [S(
    "5s24-exam2-saq-01",
    "\"The settler and pioneer have at bottom had justice on their side; this great "
    "continent could not have been kept as nothing but a game preserve for squalid "
    "savages. Moreover, to the most oppressed Indian nations the whites often acted "
    "as a protection, or, at least, they deferred instead of hastening their fate.\" "
    "\u2014Theodore Roosevelt, The Winning of the West, 1889 (abridged)",
    "secondary", "pd-quote",
    ["A. Briefly describe Roosevelt's assessment of westward expansion.",
     "B. Briefly explain ONE historical development that supporters of Roosevelt's view would cite.",
     "C. Briefly explain the perspective of someone who opposed Roosevelt's assessment."],
    "A. Roosevelt defends westward expansion as just and inevitable: settlers brought civilization to a continent that could not remain wilderness, and he claims Native peoples benefited from white 'protection.'\n\n"
    "B. Supporters would cite the Homestead Act and the transcontinental railroad as developments that opened the West to productive settlement and national economic growth.\n\n"
    "C. Critics such as Helen Hunt Jackson argued the opposite: expansion was a record of broken treaties, forced removals, and the destruction of Native nations, not a civilizing mission.",
    "U6", ["MIG", "GEO", "SOC"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/exam2.xhtml"),
S(
    "5s24-exam2-saq-02",
    "\"Behold, then, the unlettered man of the West, the nursling of the wilds, the "
    "farmer of the Hermitage \u2026 raised by the people to the highest pinnacle "
    "of honor \u2026 he came as one free from the bonds of hereditary or established "
    "custom; he came with no superior but conscience, nor oracle but his native "
    "judgment \u2026 he valued right more than usage.\" "
    "\u2014George Bancroft, Eulogy on Andrew Jackson, 1845 (abridged)",
    "primary", "pd-quote",
    ["A. Briefly describe Bancroft's assessment of Andrew Jackson.",
     "B. Briefly explain ONE historical event or development that supports Bancroft's assessment.",
     "C. Briefly explain the perspective of someone opposed to Bancroft's assessment of Jackson."],
    "A. Bancroft portrays Jackson as the embodiment of the democratic West: a natural, uncorrupted man of the people who valued principle over established custom and Eastern corruption.\n\n"
    "B. Jackson's veto of the Bank of the United States supports Bancroft's view: Jackson presented it as a stand for ordinary people against a privileged Eastern financial elite.\n\n"
    "C. Whig opponents saw Jackson as a dangerous demagogue: they called him 'King Andrew,' condemned his use of the veto and patronage, and denounced the forced removal of Native peoples as tyrannical.",
    "U4", ["PCE", "NAT"], "Sourcing & Situation", "Causation", "medium",
    "5steps-2024/exam2.xhtml"),
S(
    "5s24-exam2-saq-03",
    "The following map shows the routes of forced Native American removals between "
    "1830 and 1842: the Cherokee 'Trail of Tears' running from Georgia, Tennessee, "
    "Alabama, and North Carolina to present-day Oklahoma; the removal routes of the "
    "Choctaw, Creek, Chickasaw, and Seminole; and shaded areas marking lands opened "
    "to white settlement after each removal.",
    "non-text", "original",
    ["A. Identify and briefly explain ONE pattern shown on the map.",
     "B. Briefly explain ONE way the removals shown on the map affected Native American peoples.",
     "C. Briefly explain ONE way the information on the map relates to the debate over Jackson's legacy."],
    "A. Every route runs westward from the Southeast to Oklahoma, showing a systematic federal policy of expelling the 'Five Civilized Tribes' from their homelands rather than isolated incidents.\n\n"
    "B. The removals killed thousands through exposure, disease, and starvation, destroyed established Native towns and farms, and shattered communities' ties to ancestral lands.\n\n"
    "C. Critics of Jackson cite the Trail of Tears as evidence that his 'democracy' served white settlers at the expense of Native peoples, directly challenging Bancroft's heroic portrait; defenders argue removal reflected broad national policy, not Jackson alone.",
    "U4", ["MIG", "PCE"], "Claims & Evidence in Sources", "Causation", "medium",
    "5steps-2024/exam2.xhtml")]

for name, items in [("ch03-saq", ch03), ("exam1-saq", exam1), ("exam2-saq", exam2)]:
    json.dump({"items": items}, open(OUTDIR + "/" + name + ".json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("wrote", name + ".json,", len(items), "items")
