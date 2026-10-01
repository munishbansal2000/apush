"""Build ch03-leq.json, exam1-leq.json, exam2-leq.json — new-format single broad
prompts: the book's choose-1-of-3 sets become standalone prompts; strongest
marked role='main', others role='spare'. Guidance is original."""
import json, os

OUTDIR = os.path.dirname(os.path.abspath(__file__)) + '/..'

def L(iid, prompt, role, period, themes, reasoning, guidance, src):
    return {"id": iid, "type": "leq", "format": "remapped", "prompt": prompt,
            "role": role, "guidance": guidance, "difficulty": "hard",
            "period": period, "themes": themes, "skill": "Argumentation",
            "reasoning": reasoning, "source_type": "original",
            "inspired_by": src}

ch03 = [
L("5s24-ch03-leq-01",
  "Evaluate the extent to which British imperial policy stimulated a desire for independence in America during the eighteenth century.",
  "main", "U3", ["PCE", "WXT"], "Causation",
  "Thesis frame: argue the degree to which imperial reforms after 1763 (Sugar, Stamp, Townshend, Coercive Acts) converted colonial protest into a movement for independence. "
  "Evidence buckets: salutary-neglect baseline vs. post-1763 tightening; colonial responses (boycotts, committees, Continental Congresses); the shift from 'rights of Englishmen' to independence (Common Sense, Declaration).",
  "5steps-2024/ch03.xhtml"),
L("5s24-ch03-leq-02",
  "Evaluate the extent to which Manifest Destiny and the Mexican War affected sectional differences in the United States.",
  "spare", "U5", ["MIG", "PCE"], "Causation",
  "Thesis frame: argue how territorial expansion intensified the slavery-extension debate. "
  "Evidence buckets: Wilmot Proviso; the Compromise of 1850 and Kansas-Nebraska Act; the Republican Party's free-soil platform; how expansion turned a national project into a sectional crisis.",
  "5steps-2024/ch03.xhtml"),
L("5s24-ch03-leq-03",
  "Evaluate the extent to which the role of the United States as a world power changed between the Spanish-American War and the Cold War.",
  "spare", "U7/U8", ["WXT", "PCE"], "Continuity & Change",
  "Thesis frame: argue the extent of change from 1898 imperial power to Cold War superpower, noting continuities. "
  "Evidence buckets: 1898 acquisitions and the Roosevelt Corollary; WWI/WWII mobilization and Bretton Woods; containment and permanent global military presence; continuity of interventionism.",
  "5steps-2024/ch03.xhtml")]

exam1 = [
L("5s24-exam1-leq-01",
  "Evaluate the extent to which mobilization for total war during World War I and World War II influenced American political and social development in the twentieth century.",
  "main", "U7", ["PCE", "SOC", "WXT"], "Causation",
  "Thesis frame: argue how total-war mobilization expanded federal power and reshaped society, with effects lasting beyond each war. "
  "Evidence buckets: wartime agencies and the administrative state; the Great Migration and women's workforce entry; civil-liberties debates (Espionage Act, internment); postwar retrenchment vs. permanent change (GI Bill, Cold War state).",
  "5steps-2024/exam1.xhtml"),
L("5s24-exam1-leq-02",
  "Evaluate the extent to which differing economies shaped differing social structures in the English colonies in North America.",
  "spare", "U2", ["WXT", "SOC"], "Comparison",
  "Thesis frame: argue how New England, Middle, and Southern economies produced distinct social orders. "
  "Evidence buckets: Southern plantation slavery and planter hierarchy; New England town-based, mixed-farming society; Middle Colony diversity and commerce; indentured servitude vs. enslaved labor.",
  "5steps-2024/exam1.xhtml"),
L("5s24-exam1-leq-03",
  "Evaluate the extent to which late nineteenth century urbanization affected politics, immigration, and popular culture.",
  "spare", "U6", ["SOC", "PCE", "CUL"], "Causation",
  "Thesis frame: argue how rapid city growth reorganized American life. "
  "Evidence buckets: machine politics and municipal reform; new immigration and ethnic neighborhoods; mass culture (vaudeville, sports, department stores); Progressive responses to urban problems.",
  "5steps-2024/exam1.xhtml")]

exam2 = [
L("5s24-exam2-leq-01",
  "Evaluate the extent to which reform movements played an important role in shaping American society from 1820 to 1860.",
  "main", "U4", ["SOC", "CUL", "PCE"], "Causation",
  "Thesis frame: argue the reach and limits of antebellum reform. "
  "Evidence buckets: Second Great Awakening as engine; abolitionism, temperance, women's rights (Seneca Falls); utopian communities and public schools; the tension between reform's moral claims and its limited victories before the Civil War.",
  "5steps-2024/exam2.xhtml"),
L("5s24-exam2-leq-02",
  "Evaluate the extent to which differing ideas about the nature of government shaped the emergence of political parties in the 1780s and 1790s.",
  "spare", "U3", ["PCE", "NAT"], "Causation",
  "Thesis frame: argue how Hamiltonian and Jeffersonian visions of government produced the first party system. "
  "Evidence buckets: Hamilton's financial program vs. Jeffersonian strict construction; the Bank and assumption debates; foreign-policy splits (Britain vs. France); the election of 1800 as the parties' first transfer of power.",
  "5steps-2024/exam2.xhtml"),
L("5s24-exam2-leq-03",
  "Evaluate the extent of social and political changes in the lives of women during the period 1900 to 1930.",
  "spare", "U7", ["SOC", "PCE"], "Continuity & Change",
  "Thesis frame: argue the extent of change\u2014real gains alongside persistent limits. "
  "Evidence buckets: suffrage victory (Nineteenth Amendment) and Progressive-era activism; new employment and the 'New Woman'; wartime work and the Sheppard-Towner Act; continuities in legal inequality and domestic expectations.",
  "5steps-2024/exam2.xhtml")]

for name, items in [("ch03-leq", ch03), ("exam1-leq", exam1), ("exam2-leq", exam2)]:
    json.dump({"items": items}, open(OUTDIR + "/" + name + ".json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("wrote", name + ".json,", len(items), "items")
