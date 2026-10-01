"""exam2-mcq builder chunk 4: items 46-55 + assemble + hygiene."""
import json
from build_exam2a import I, items, OUT
from build_exam2c import PENN
from build_exam2c import BEVERIDGE

I(46,"C",PENN,
  "William Penn was a member of which of the following persecuted religious groups?",
  [("A","Roman Catholics"),("B","Puritans"),("C","Quakers"),("D","Anglicans")],
  "Penn was a Quaker, and Pennsylvania was founded as a refuge for Quakers and other dissenters persecuted in England. Catholics founded Maryland; Puritans founded New England.",
  "original","U2",["SOC","PCE"],"Developments & Processes","Contextualization","easy")

I(47,"A",PENN,
  "Because of Penn's Charter of Privileges, Pennsylvania became known for which of the following?",
  [("A","Exceptional religious diversity"),
   ("B","Strict religious uniformity"),
   ("C","Witch trials and popular superstition"),
   ("D","Hostility toward all religious practice")],
  "The Charter's guarantee of religious toleration drew Quakers, Germans, Scots-Irish, and others, making Pennsylvania the most religiously diverse colony. Witch trials belong to Massachusetts; Penn welcomed faith, not suppressed it.",
  "original","U2",["SOC","PCE"],"Developments & Processes","Causation","medium")

I(48,"D",PENN,
  "Penn's Charter of Privileges is best seen as a forerunner of which of the following?",
  [("A","The Declaration of Independence"),
   ("B","The Fourteen Points"),
   ("C","The Gettysburg Address"),
   ("D","The First Amendment to the Constitution")],
  "By barring an established church and protecting conscience, the Charter anticipated the First Amendment's religion clauses. The Declaration announced independence; the Fourteen Points and Gettysburg Address address different subjects.",
  "original","U2",["PCE","NAT"],"Making Connections","Continuity & Change","hard")

ADAMS = ("Questions 49\u201352 refer to the following quotation.\n\n"
    "\"The man who mounted the steps of the Capitol, March 4, 1801 \u2026 Jefferson "
    "was very tall, six feet two-and-a-half inches in height; sandy-complexioned; "
    "shy in manner, seeming cold; awkward in attitude \u2026 this loose, shackling "
    "person \u2026 belonged to the controlling influences of American history.\" "
    "\u2014Henry Adams, History of the United States During the Administration of "
    "Thomas Jefferson, 1889 (abridged)")

I(49,"A",ADAMS,
  "As the great-grandson of President John Adams, the historian Henry Adams might have been expected to be which of the following?",
  [("A","Critical of the policies of Thomas Jefferson"),
   ("B","Supportive of the policies of Thomas Jefferson"),
   ("C","Critical of the Constitutional Convention"),
   ("D","More interested in the French and Indian War")],
  "John Adams was a Federalist and Jefferson his great rival; a family historian might be expected to side against Jefferson. The passage, however, treats Jefferson with grudging fascination rather than hostility.",
  "pd-quote","U4",["PCE"],"Sourcing & Situation","Contextualization","medium")

I(50,"B",ADAMS,
  "Thomas Jefferson's victory in the election of 1800 was significant because it",
  [("A","made him the first southerner to become president."),
   ("B","was the first transfer of the presidency between parties."),
   ("C","committed him to war with Great Britain."),
   ("D","launched the rapid industrialization of the United States.")],
  "The election of 1800 moved power from the Federalists to the Democratic-Republicans, the first peaceful party transfer in American history. Washington was also a southerner; Jefferson sought to avoid war and distrusted industry.",
  "pd-quote","U4",["PCE"],"Developments & Processes","Causation","medium")

I(51,"D",ADAMS,
  "Although Jefferson believed that government should be small and limited, once in office he",
  [("A","created a spoils system that bloated the bureaucracy."),
   ("B","laid the foundations of the welfare state."),
   ("C","launched an ambitious program of public works."),
   ("D","vigorously exercised federal power in foreign affairs.")],
  "Jefferson fought the Barbary pirates, enforced the Embargo Act, and bought Louisiana, all vigorous uses of federal power abroad. The spoils system came with Jackson; the welfare state with the New Deal.",
  "pd-quote","U4",["PCE","WXT"],"Claims & Evidence in Sources","Causation","hard")

I(52,"C",ADAMS,
  "According to Henry Adams, the city of Washington in 1801 was",
  [("A","the hub of American economic power."),
   ("B","rapidly becoming the 'Paris' of North America."),
   ("C","still an underdeveloped cultural backwater."),
   ("D","still under the control of the British.")],
  "Adams describes a 'village simplicity,' where politicians without access to Jefferson's hospitality 'lived like bears.' The capital had no economy, no high culture, and was certainly not British-controlled.",
  "pd-quote","U4",["PCE"],"Claims & Evidence in Sources","Contextualization","medium")

ROOSEVELT = ("Questions 53\u201355 refer to the following quotation.\n\n"
    "In a March 14, 1940 address to the American Civil Liberties Union, Eleanor "
    "Roosevelt said that traveling the country had made her conscious of the "
    "importance of civil liberties, warned that democracy is endangered whenever "
    "the light of liberty grows dim, and argued that while wartime nations lose "
    "freedoms of press, speech, and assembly, Americans at peace had a grave "
    "responsibility to guard them. "
    "\u2014Paraphrase of Eleanor Roosevelt, address to the ACLU, Chicago, March 14, 1940 (abridged)")

I(53,"A",ROOSEVELT,
  "In her speech, Eleanor Roosevelt alluded to an earlier threat to civil liberties created by which of the following?",
  [("A","World War I"),("B","The New Deal"),("C","The Cold War"),("D","The Great Depression")],
  "Roosevelt's warning recalls World War I, when the Espionage and Sedition Acts criminalized dissent. The New Deal and the Depression did not produce comparable speech prosecutions, and the Cold War came later.",
  "paraphrase","U7",["PCE"],"Contextualization","Causation","medium")

I(54,"B",ROOSEVELT,
  "Which of the following best exemplifies the threat to civil liberties that concerned Roosevelt?",
  [("A","The Social Security Act"),
   ("B","Executive Order 9066 authorizing Japanese internment"),
   ("C","The Servicemen's Readjustment Act of 1944 (the GI Bill)"),
   ("D","The baby boom")],
  "Two years after her speech, Executive Order 9066 authorized the wartime internment of Japanese Americans, exactly the kind of liberty lost in wartime she had warned about. Social Security, the GI Bill, and the baby boom expanded opportunity rather than restricting liberty.",
  "paraphrase","U7",["PCE","SOC"],"Developments & Processes","Causation","medium")

I(55,"C",ROOSEVELT,
  "Roosevelt's concerns are most directly comparable to those of the people who debated which of the following?",
  [("A","The Gulf of Tonkin Resolution of 1964"),
   ("B","The Voting Rights Act of 1965"),
   ("C","The USA Patriot Act of 2001"),
   ("D","The Affordable Care Act of 2010")],
  "The Patriot Act debate, like Roosevelt's speech, weighed national security against civil liberties after a national crisis. The Tonkin Resolution concerned war powers, the Voting Rights Act expanded the franchise, and the ACA concerned health care.",
  "paraphrase","U9",["PCE"],"Making Connections","Comparison","hard")

if __name__ == "__main__":
    assert len(items) == 55, f"got {len(items)}"
    # key balance
    from collections import Counter
    kb = Counter(i["key"] for i in items)
    print("key balance:", dict(kb))
    # length-tell: key strictly longest by >10 chars
    tells = []
    for i in items:
        lens = {o["letter"]: len(o["text"]) for o in i["options"]}
        kl = lens[i["key"]]
        others = [v for k, v in lens.items() if k != i["key"]]
        if kl > max(others) + 10:
            tells.append((i["id"], kl - max(others)))
    print("length tells:", tells)
    json.dump({"items": items},
              open(OUT + "/exam2-mcq.json", "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print("wrote exam2-mcq.json,", len(items), "items")
