"""Build exam1-dbq.json and exam2-dbq.json."""
import json, os

OUTDIR = os.path.dirname(os.path.abspath(__file__)) + '/..'

def D(n, kind, date, text, sourcing_note, source_type="pd-quote"):
    return {"n": n, "kind": kind, "date": date, "text": text,
            "sourcing_note": sourcing_note, "source_type": source_type}

exam1_docs = [D(1, "text", "May 22, 1903",
    "\"Article III. The Government of Cuba consents that the United States may "
    "exercise the right to intervene for the preservation of Cuban independence, "
    "the maintenance of a government adequate for the protection of life property, "
    "and individual liberty, and for discharging the obligations with respect to "
    "Cuba imposed by the Treaty of Paris on the United States\u2026\" \u2014Platt "
    "Amendment (abridged)",
    "POV/purpose: A U.S. congressional amendment imposed on Cuba as a condition of American withdrawal; its purpose is to legalize future U.S. intervention. "
    "Argument relevance: Use to argue U.S. policy converted Cuban 'independence' into a protectorate\u2014sovereignty limited by American veto power.",
    ),
D(2, "text", "November 18, 1903",
    "\"The Republic of Panama grants to the United States in perpetuity, the use, "
    "occupation and control of a zone of land \u2026 for the construction \u2026 of "
    "said canal. \u2026 The Republic of Panama further grants to the United States "
    "in perpetuity \u2026 any other lands and waters outside the zone \u2026 "
    "necessary and convenient for the construction \u2026 and protection of the said "
    "Canal.\" \u2014Hay-Bunau-Varilla Treaty (abridged)",
    "POV/purpose: A treaty signed by the U.S. and a French agent days after Panama's U.S.-backed secession from Colombia; its purpose is to secure canal rights on American terms. "
    "Argument relevance: Use to argue U.S. policy manufactured a compliant client state to obtain the canal zone\u2014intervention by treaty rather than troops.",
    ),
D(3, "text", "December 6, 1904",
    "\"Chronic wrongdoing, or an impotence which results in a general loosening of "
    "the ties of civilized society, may \u2026 ultimately require intervention by "
    "some civilized nation, and in the Western Hemisphere the adherence of the "
    "United States to the Monroe Doctrine may lead the United States, \u2026 in "
    "flagrant cases of such wrongdoing or impotence, to exercise an international "
    "police power.\" \u2014Theodore Roosevelt, Annual Message to Congress (abridged)",
    "POV/purpose: Roosevelt announces his corollary to Congress as national policy; his purpose is to justify preemptive U.S. intervention in the Caribbean and Central America. "
    "Argument relevance: Use as the doctrinal centerpiece: the U.S. claimed a unilateral right to police the hemisphere, the ideological engine of the era's interventions.",
    ),
D(4, "non-text", "Produced for this item (replaces Harper's Weekly cartoon, 1907)",
    "An original illustration in the style of an early-1900s magazine cartoon: Uncle "
    "Sam sits at a banquet table piled with dishes labeled 'Cuba,' 'Puerto Rico,' "
    "'Panama,' and 'Nicaragua,' while a figure labeled 'U.S. investor' carves the "
    "roast and waiters labeled 'U.S. Marines' stand ready. The caption reads 'The "
    "Full Dinner Pail,' suggesting that American prosperity was fed by economic "
    "dominance over Latin America.",
    "POV/purpose: A generated-original cartoon in the idiom of 1900s political satire; its purpose is to show how contemporaries could view U.S. policy as self-serving feasting. "
    "Argument relevance: Use to argue American policy served U.S. business interests first\u2014pairs with Doc E (dollar diplomacy) and Doc F (anti-imperialist critique).",
    "original"),
D(5, "text", "December 3, 1912",
    "\"The diplomacy of the present administration has sought to respond to modern "
    "ideas of commercial intercourse. This policy has been characterized by "
    "substituting dollars for bullets. \u2026 It is an effort frankly directed to "
    "the increase of American trade \u2026\" \u2014William Howard Taft, Fourth "
    "Annual Message to Congress (abridged)",
    "POV/purpose: Taft defends his administration's record to Congress; his purpose is to present dollar diplomacy as peaceful, modern statecraft. "
    "Argument relevance: Use to argue U.S. policy tied Latin American economies to American banks and trade\u2014economic leverage as the instrument of control.",
    ),
D(6, "text", "n.d. (American Anti-Imperialist League, dollar-diplomacy era)",
    "\"It is proposed that in the Honduras and Nicaragua \u2026 the United States "
    "government should be authorized to secure the collection and disbursement of "
    "the revenue in the interest of American capitalists who contemplate making "
    "loans to those countries. This involves serious risk of complications which may "
    "lead to further interferences and ultimate control. \u2026 [We] recognize "
    "generally their independent right to govern (or misgovern) their own "
    "countries.\" \u2014Erving Winslow, \"Aggression in South America,\" Report of "
    "the Thirteen (abridged)",
    "POV/purpose: An anti-imperialist activist warns the American public; his purpose is to expose how 'protecting' American loans becomes a pretext for controlling Latin American governments. "
    "Argument relevance: Use as the critical counter-voice: even contemporaries argued dollar diplomacy eroded Latin American sovereignty and invited endless intervention.",
    ),
D(7, "text", "April 20, 1914",
    "\"A series of incidents have recently occurred which cannot but create the "
    "impression that the representatives of General Huerta were willing to go out "
    "of their way to show disregard for the dignity and rights of this government "
    "\u2026 I, therefore, come to ask your approval that I should use the armed "
    "forces of the United States \u2026 as may be necessary to obtain from General "
    "Huerta \u2026 the fullest recognition of the rights and dignity of the United "
    "States\u2026\" \u2014Woodrow Wilson, Address to Congress (abridged)",
    "POV/purpose: Wilson asks Congress to authorize force after the Tampico incident; his purpose is to justify occupying Veracruz and pressuring Huerta's regime. "
    "Argument relevance: Use to argue that even the 'moral diplomacy' president used military intervention in Mexico\u2014showing continuity of interventionism across administrations.",
    )]

exam2_docs = [D(1, "text", "1895 (decision on the Pullman Strike)",
    "\"That the original design [of the Sherman Antitrust Act] to suppress trusts "
    "and monopolies \u2026 is clear; but it is equally clear that further and more "
    "comprehensive purpose came to be entertained. \u2026 Combinations are condemned, "
    "not only when they take the form of trusts, but in whatever form found, if "
    "they be in restraint of trade.\" \u2014In re Debs (abridged)",
    "POV/purpose: The Court upholds jailing Eugene Debs for the Pullman boycott; its purpose is to affirm federal power against labor, reading the Sherman Act broadly. "
    "Argument relevance: Use to show the Court's asymmetry: the Sherman Act was wielded against unions before it was used against trusts\u2014inhibiting reform's allies while corporations went largely untouched.",
    ),
D(2, "text", "1895",
    "\"Congress did not attempt \u2026 to make criminal the acts of persons in the "
    "acquisition and control of property \u2026 The contracts and acts of the "
    "defendants related exclusively to the acquisition of the Philadelphia "
    "refineries and the business of sugar refining in Pennsylvania, and bore no "
    "direct relation to commerce between states or with foreign countries.\" "
    "\u2014U.S. v. E. C. Knight Co. (abridged)",
    "POV/purpose: The Court voids the breakup of the Sugar Trust; its purpose is to confine the commerce power by separating 'manufacture' from 'commerce.' "
    "Argument relevance: Use as the leading case for 'inhibited': the Court gutted the Sherman Act against the era's great trusts, defining monopoly out of federal reach.",
    ),
D(3, "text", "1898",
    "\"By the 14th Amendment \u2026 no state shall deprive any person of property "
    "without the due process of law \u2026 That corporations are persons within this "
    "amendment is now settled. [The Court] adjudged that the enforcement of the "
    "schedules of rates established by the [Nebraska law reducing railroad rates] "
    "\u2026 would deprive the railroad companies of the compensation they were "
    "legally entitled to receive.\" \u2014Smyth v. Ames (abridged)",
    "POV/purpose: The Court strikes down state railroad rate regulation; its purpose is to extend Fourteenth Amendment 'personhood' protections to corporations against state regulation. "
    "Argument relevance: Use to argue the Court shielded corporations from state-level Progressive regulation, forcing reformers toward the harder federal route.",
    ),
D(4, "text", "1905",
    "\"The act [state law limiting maximum hours of bakers] is not \u2026 a health "
    "law, but is an illegal interference with the rights of individuals, both "
    "employers and employees, to make contracts regarding labor upon such terms as "
    "they may think best.\" \u2014Lochner v. New York (abridged)",
    "POV/purpose: The Court voids a state maximum-hours law; its purpose is to entrench 'liberty of contract' as a constitutional barrier to labor regulation. "
    "Argument relevance: Use as the signature 'inhibited' case: Lochner-era doctrine blocked Progressive labor laws for a generation.",
    ),
D(5, "text", "1908",
    "\"The two sexes differ in structure of body, \u2026 in the amount of physical "
    "strength in the capacity for long-continued labor \u2026 This difference "
    "justifies a difference in legislation. \u2026 without questioning in any "
    "respect the decision in Lochner v. New York, we are of the opinion that [the "
    "Oregon law limiting women's working hours] \u2026 is [not] in conflict with the "
    "Federal Constitution\u2026\" \u2014Muller v. Oregon (abridged)",
    "POV/purpose: The Court upholds Oregon's women's-hours law on paternalist grounds; its purpose is to carve a narrow exception to Lochner without disturbing it. "
    "Argument relevance: Use to argue the Court 'advanced' regulation only selectively\u2014protective legislation survived when framed around women's difference, not workers' rights generally.",
    ),
D(6, "text", "1911",
    "\"The public policy has been to prohibit \u2026 contracts or acts entered into "
    "with the intent to wrong the public and which unreasonably restrict competitive "
    "conditions \u2026 The combination of the defendants in this case is an "
    "unreasonable and undue restraint of trade in petroleum \u2026 moving in "
    "interstate commerce, and falls within the prohibitions of the [Sherman Antitrust "
    "Act].\" \u2014Standard Oil Co. v. United States (abridged)",
    "POV/purpose: The Court orders Standard Oil dissolved; its purpose is to show the Sherman Act could reach the great trusts\u2014but only 'unreasonable' restraints. "
    "Argument relevance: Use to argue the Court 'advanced' regulation after 1900\u2014yet the 'rule of reason' it invented also narrowed the Act, a double-edged precedent.",
    ),
D(7, "text", "1917",
    "\"Viewed as an act establishing an eight-hour day as the standard of service "
    "by employees, the statute is clearly within the power of Congress under the "
    "commerce clause. Viewed as an act fixing wages, the statute merely illustrates "
    "the character of regulation essential, and hence permissible, for the "
    "protection of the public right.\" \u2014Wilson v. New (abridged)",
    "POV/purpose: The Court upholds the Adamson Act's eight-hour railroad day; its purpose is to affirm broad federal regulatory power over interstate carriers. "
    "Argument relevance: Use as the culminating 'advanced' case: by 1917 the Court sustained federal labor regulation under the commerce clause, marking how far doctrine had moved since E. C. Knight.",
    )]

exam1 = {"id": "5s24-exam1-dbq", "type": "dbq", "format": "remapped",
    "prompt": "Analyze the effects of American foreign policy in Latin America during the period 1899\u20131917.",
    "documents": exam1_docs,
    "difficulty": "hard", "period": "U7", "themes": ["WXT", "PCE"],
    "skill": "Argumentation", "reasoning": "Causation",
    "inspired_by": "5steps-2024/exam1.xhtml",
    "source_type": "mixed (pd-quote: docs 1\u20133, 5\u20137; original: doc 4)"}

exam2 = {"id": "5s24-exam2-dbq", "type": "dbq", "format": "remapped",
    "prompt": "To what extent did the Supreme Court advance or inhibit Progressive regulation of corporations in the period 1885\u20131920?",
    "documents": exam2_docs,
    "difficulty": "hard", "period": "U7", "themes": ["PCE", "WXT"],
    "skill": "Argumentation", "reasoning": "Causation",
    "inspired_by": "5steps-2024/exam2.xhtml",
    "source_type": "mixed (pd-quote: docs 1\u20137)"}

json.dump({"items": [exam1]}, open(OUTDIR + "/exam1-dbq.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
json.dump({"items": [exam2]}, open(OUTDIR + "/exam2-dbq.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("wrote exam1-dbq.json, exam2-dbq.json")
