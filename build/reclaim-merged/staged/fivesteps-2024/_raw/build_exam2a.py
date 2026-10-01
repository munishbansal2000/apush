"""Build exam2-mcq.json — rewrite-never-copy of exam2 Section I Part A (55 items)."""
import json, os

OUT = os.path.dirname(os.path.abspath(__file__)) + '/..'
items = []

def I(n, key, stim, stem, opts, expl, stype, period, themes, skill, reasoning, diff):
    items.append({
        "id": f"5s24-exam2-mcq-{n:02d}", "type": "mcq", "key": key,
        "stem": stem, "stimulus": stim,
        "options": [{"letter": L, "text": t} for L, t in opts],
        "explanation": expl, "source_type": stype, "period": period,
        "themes": themes, "skill": skill, "reasoning": reasoning,
        "difficulty": diff, "inspired_by": "5steps-2024/exam2.xhtml", "format": "new",
    })

COOLIDGE = ("Questions 1\u20134 refer to the following quotation.\n\n"
    "In a 1924 address, President Calvin Coolidge argued that people have a right "
    "to enjoy the rewards of their own industry, warning that heavy taxation on "
    "property or income amounts to destroying that right. "
    "\u2014Paraphrase of Calvin Coolidge, \"Economy in the Interest of All,\" "
    "June 30, 1924 (abridged)")

I(1,"B",COOLIDGE,
  "Which of the following political ideas best reflects Coolidge's perspective in the passage?",
  [("A","Progressive taxation is a fair way to redistribute wealth."),
   ("B","Government should remain limited in size and scope."),
   ("C","A larger, more active government best secures social justice."),
   ("D","Government properly decides how citizens may use their property.")],
  "Coolidge treats taxation as a threat to a basic right of ownership. That view fits limited government: low taxes and low spending. It is the opposite of using taxes to redistribute wealth or expand government.",
  "paraphrase","U7",["PCE"],"Claims & Evidence in Sources","Contextualization","medium")

I(2,"C",COOLIDGE,
  "Which of the following later presidents would most likely have shared Coolidge's sentiments?",
  [("A","Franklin D. Roosevelt"),("B","Lyndon B. Johnson"),
   ("C","Ronald Reagan"),("D","Barack Obama")],
  "Reagan, like Coolidge, argued for limited government and lower taxes, and he openly admired Coolidge. Roosevelt, Johnson, and Obama all expanded the federal government's role.",
  "paraphrase","U9",["PCE"],"Making Connections","Comparison","medium")

I(3,"A",COOLIDGE,
  "The ideas expressed in the passage were most directly shaped by which of the following?",
  [("A","The broad economic prosperity of the 1920s"),
   ("B","Widespread economic hardship in the 1920s"),
   ("C","The rapid growth of the welfare state in the 1920s"),
   ("D","Highly publicized antitrust prosecutions"),
  ],
  "Coolidge spoke in 1924, when the country was prospering, and he credited that prosperity to keeping government out of the way of business. There was no welfare state yet, and no mass hardship in the mid-1920s.",
  "paraphrase","U7",["WXT"],"Contextualization","Causation","medium")

I(4,"D",COOLIDGE,
  "In the passage, Coolidge is most directly reacting against which of the following?",
  [("A","The economic policies of his predecessor, Warren G. Harding"),
   ("B","The strength of radical politics after the Russian Revolution"),
   ("C","Populist agitation in the West"),
   ("D","The Progressive Era expansion of government's role")],
  "Coolidge's attack on taxation targets the legacy of the Progressives, who had greatly expanded federal regulation and introduced the income tax. Harding largely shared Coolidge's outlook; the Populists were a 1890s movement.",
  "paraphrase","U7",["PCE"],"Claims & Evidence in Sources","Contextualization","hard")

DEBRY = ("Questions 5\u20138 refer to the following image.\n\n"
    "[An engraving by Theodor de Bry, 'The Natives of Florida Worship the Column "
    "Erected by the Commander on His First Voyage,' Grand Voyages, 1591: a stone "
    "column stands on a Florida shore while a crowd of Timucua Native Americans "
    "kneel before it in worship, as French soldiers and officers look on.]")

I(5,"A",DEBRY,
  "Which of the following most directly reflects de Bry's perspective in the image?",
  [("A","The natives of Florida are primitive and superstitious."),
   ("B","The natives of Florida are deeply Christian."),
   ("C","Europeans are unjustly exploiting the natives."),
   ("D","Conflict between natives and Europeans is inevitable.")],
  "De Bry shows the Timucua worshipping a French monument, framing them as simple people awed by European symbols. The image flatters European power rather than criticizing it or predicting war.",
  "original","U2",["WXT","GEO"],"Sourcing & Situation","Contextualization","medium")

I(6,"D",DEBRY,
  "De Bry's engraving is best understood as an expression of which of the following?",
  [("A","European fear of native peoples"),
   ("B","European religious fervor"),
   ("C","European doubts about the value of exploration"),
   ("D","European curiosity about the wider world")],
  "De Bry produced dozens of engravings of New World peoples for a European audience hungry for news of the Americas. The image feeds curiosity about distant lands and peoples, not fear of them or doubt about exploration.",
  "original","U2",["WXT","GEO"],"Claims & Evidence in Sources","Contextualization","medium")

I(7,"C",DEBRY,
  "The column erected by the French commander in the image most directly signified which of the following?",
  [("A","European plans to convert the Native Americans to Christianity"),
   ("B","European hopes for trade in new products"),
   ("C","European claims to political control over new territory"),
   ("D","European interest in sharing Native American culture")],
  "Ribault's column was a marker of possession: a public claim that France owned the land. European powers used such monuments to announce sovereignty, the legal basis for colonization.",
  "original","U2",["WXT","PCE"],"Developments & Processes","Causation","medium")

I(8,"B",DEBRY,
  "Rivalries among European powers soon led the French settlement in Florida to be destroyed by which of the following?",
  [("A","The Timucua natives"),("B","The Spanish"),("C","The English"),("D","The Dutch")],
  "Spain, which claimed Florida, attacked the French Huguenot colony at Fort Caroline in 1565 and massacred its inhabitants. Neither the English nor the Dutch operated in Florida at that time.",
  "original","U2",["WXT"],"Developments & Processes","Causation","medium")

RIIS = ("Questions 9\u201312 refer to the following quotation.\n\n"
    "\"Here is the case of a woman employed in the manufacturing department of a "
    "Broadway house. \u2026 She averages three dollars a week. \u2026 lunch she "
    "cannot afford. One meal a day is her allowance. \u2026 Almost any door might "
    "seem to offer a welcome escape from such slavery as this.\" "
    "\u2014Jacob Riis, How the Other Half Lives, 1890 (abridged)")

I(9,"B",RIIS,
  "Which of the following would most likely have supported the perspective Riis expresses in the passage?",
  [("A","A supporter of Social Darwinism"),("B","A Progressive reformer"),
   ("C","A factory owner"),("D","An opponent of immigration")],
  "Riis exposes the misery of poor working women to demand reform, exactly the goal of Progressive reformers. Social Darwinists would have called such poverty natural, and business owners had little interest in publicizing it.",
  "pd-quote","U7",["WOR","SOC"],"Sourcing & Situation","Contextualization","medium")

I(10,"D",RIIS,
  "The situation of the young women in the passage is most directly comparable to that of which of the following?",
  [("A","American revolutionaries in the 1770s"),
   ("B","Enslaved people in the antebellum South"),
   ("C","Populist farmers in the 1890s"),
   ("D","Detroit autoworkers in the 1930s")],
  "Both groups were low-paid workers fighting for better wages and conditions: the young women in Riis's account and the 1930s autoworkers who staged sit-down strikes. The other choices involve revolutions, slavery, or farmers, not industrial wage labor.",
  "pd-quote","U7",["WOR","SOC"],"Making Connections","Comparison","hard")

I(11,"A",RIIS,
  "Concerns like those Riis expresses most directly led to which of the following?",
  [("A","Protective labor laws for women"),
   ("B","Restrictions on immigration"),
   ("C","Women's suffrage"),
   ("D","Antitrust legislation")],
  "Muckraking exposes of women's working conditions fueled the Progressive drive for protective labor laws, such as limits on women's working hours. Immigration restriction and suffrage had different causes; antitrust targeted monopolies.",
  "pd-quote","U7",["WOR","PCE"],"Developments & Processes","Causation","medium")

I(12,"C",RIIS,
  "Riis's investigative work on the lives of the poor is most directly associated with which of the following?",
  [("A","Yellow journalism"),("B","Abolitionism"),
   ("C","The muckrakers"),("D","Socialism")],
  "Riis was a classic muckraker: a journalist who exposed urban poverty and corruption to spur reform. Yellow journalism sensationalized for sales, abolitionism was an earlier movement, and Riis was not a socialist.",
  "pd-quote","U7",["WOR","SOC"],"Claims & Evidence in Sources","Contextualization","easy")

ZENGER = ("Questions 13\u201316 refer to the following quotation.\n\n"
    "\"It is \u2026 a right, which all free men claim, that they are entitled to "
    "complain when they are hurt. \u2026 It is not the cause of one poor printer, "
    "nor of New York alone \u2026 It is the cause of liberty.\" "
    "\u2014Andrew Hamilton, defense of printer John Peter Zenger, August 4, 1735 (abridged)")

I(13,"D",ZENGER,
  "The Zenger trial is best described as which of the following?",
  [("A","A colonial dispute over British taxation policy"),
   ("B","An early attack on the institution of slavery"),
   ("C","A landmark case concerning voting rights"),
   ("D","A landmark case concerning freedom of expression")],
  "Zenger was tried for seditious libel after printing criticisms of New York's royal governor. Hamilton's acquittal victory established that truthful criticism of officials should not be punished, a milestone for press freedom.",
  "pd-quote","U2",["PCE"],"Developments & Processes","Causation","medium")

I(14,"A",ZENGER,
  "Hamilton's argument in the passage assumes which of the following?",
  [("A","Free men enjoy rights broader than those held in other countries."),
   ("B","People in other countries enjoy more rights than Americans."),
   ("C","Natural rights are merely ideas without real force."),
   ("D","Rights are grants bestowed by the government.")],
  "Hamilton appeals to the natural rights of free men and the liberties of British subjects, arguing the jury should defend them. He treats rights as inherent, not as gifts of government, and appeals to an American sense of liberty.",
  "pd-quote","U2",["PCE","NAT"],"Claims & Evidence in Sources","Contextualization","hard")

I(15,"B",ZENGER,
  "The Zenger case is best compared to which of the following?",
  [("A","Lincoln's suspension of habeas corpus during the Civil War"),
   ("B","The 1971 attempt to block the Pentagon Papers"),
   ("C","The 1886 trial of the Haymarket Square bombers"),
   ("D","The Supreme Court's Brown v. Board of Education decision")],
  "Both Zenger and the Pentagon Papers cases pitted the government's power to punish publication against the press's freedom to criticize officials. Habeas corpus, Haymarket, and Brown involve different rights and issues.",
  "pd-quote","U2",["PCE"],"Making Connections","Comparison","hard")
