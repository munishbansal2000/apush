"""Build ch03-dbq.json — Federalist administrations, unity + federal authority."""
import json, os

OUTDIR = os.path.dirname(os.path.abspath(__file__)) + '/..'

def D(n, kind, date, text, sourcing_note, source_type="pd-quote"):
    return {"n": n, "kind": kind, "date": date, "text": text,
            "sourcing_note": sourcing_note, "source_type": source_type}

docs = [D(1, "text", "April 30, 1789",
    "\"I behold the surest pledges that \u2026 no local prejudices or attachments, "
    "no separate views or party animosities, will misdirect the comprehensive and "
    "equal eye which ought to watch over [Congress] \u2026 that the foundation of "
    "our national policy will be laid in the pure and immutable principles of "
    "private morality, and the preeminence of free government be exemplified by all "
    "the attributes which can win the affections of its citizens and command the "
    "respect of the world.\" \u2014George Washington, First Inaugural Address (abridged)",
    "POV/purpose: Washington speaks as the unifying, above-party first president addressing Congress and the nation; his purpose is to legitimize the new federal government and bind diverse states to it. "
    "Argument relevance: Use to argue Federalists promoted unity and federal authority\u2014or, with Docs F/G, to show how far practice fell short of this ideal.",
    ),
D(2, "text", "December 16, 1790",
    "\"The General Assembly of the Commonwealth of Virginia \u2026 represent [that] "
    "\u2026 in an agricultural country like this \u2026 to perpetuate a large monied "
    "interest, is a measure which \u2026 must \u2026 produce \u2026 the prostration "
    "of agriculture at the feet of commerce, or a change in the present form of "
    "federal government, fatal to the existence of American liberty.\" \u2014Virginia "
    "Resolutions on the Assumption of State Debts (abridged)",
    "POV/purpose: Virginia's legislature, led by opponents of Hamilton's financial program, protests to Congress; its purpose is to block assumption of state debts as unconstitutional and sectional. "
    "Argument relevance: Use to argue Federalist policies divided the nation along sectional lines and expanded federal power in ways critics called dangerous to liberty.",
    ),
D(3, "text", "February 15, 1791",
    "\"I consider the foundation of the Constitution as laid on this ground\u2014that "
    "all powers not delegated to the United States, by the Constitution, nor "
    "prohibited by it to the states, are reserved to the states, or to the people. "
    "To take a single step beyond the boundaries thus specially drawn around the "
    "powers of Congress, is to take possession of a boundless field of power.\" "
    "\u2014Thomas Jefferson, Opinion on the Constitutionality of the Bank (abridged)",
    "POV/purpose: Jefferson writes privately to Washington as secretary of state, urging a veto; his purpose is to stop Hamilton's bank and defend strict construction. "
    "Argument relevance: Use to argue Federalist actions advanced federal authority beyond constitutional limits\u2014or that even the administration's own cabinet saw its authority as overreach.",
    ),
D(4, "text", "February 23, 1791",
    "\"The powers contained in a constitution of government, especially those which "
    "concern the general administration of the affairs of a country, its finances, "
    "trade, defense, etc., ought to be construed liberally in advancement of the "
    "public good.\" \u2014Alexander Hamilton, Opinion on the Constitutionality of "
    "the Bank (abridged)",
    "POV/purpose: Hamilton writes to Washington to justify the bank; his purpose is to establish the doctrine of implied powers and win presidential approval. "
    "Argument relevance: Use to argue Federalists deliberately expanded federal authority\u2014the clearest statement of the loose-construction doctrine that built national power.",
    ),
D(5, "text", "August 7, 1794",
    "\"Whereas combinations to defeat the execution of the laws laying duties upon "
    "spirits distilled within the United States \u2026 have \u2026 existed in some of "
    "the western parts of Pennsylvania; \u2026 it is in my judgement necessary \u2026 "
    "to take measures for calling forth the militia in order to suppress the "
    "combinations aforesaid, and to cause the laws to be duly executed.\" "
    "\u2014George Washington, Proclamation on the Whiskey Rebellion (abridged)",
    "POV/purpose: Washington issues a presidential proclamation to the nation; his purpose is to justify using federal military force against domestic resistance and to demonstrate that federal law will be enforced. "
    "Argument relevance: Use to argue Federalists decisively advanced federal authority\u2014the first use of national military power to enforce a federal tax\u2014though it also bred western resentment.",
    ),
D(6, "text", "July 14, 1798",
    "\"That if any person shall write, print, utter, or publish, any false, "
    "scandalous, and malicious writing \u2026 against the government of the United "
    "States \u2026 with the intent to defame the said government, \u2026 then such "
    "person \u2026 shall be punished by a fine not exceeding two thousand dollars, "
    "and by imprisonment not exceeding two years.\" \u2014The Sedition Act (abridged)",
    "POV/purpose: A Federalist Congress legislates during the Quasi-War crisis; its purpose is to silence Republican opposition press and critics of Adams. "
    "Argument relevance: Use to argue Federalist rule undermined national unity and abused federal authority\u2014the strongest evidence that 'advancing authority' came at liberty's expense.",
    ),
D(7, "text", "November 16, 1798",
    "\"Resolved, that the several States \u2026 are not united on the principle of "
    "unlimited submission to their general government; \u2026 [the Sedition Act], "
    "which does abridge the freedom of the press, is not law but is altogether void.\" "
    "\u2014Kentucky Resolutions (abridged)",
    "POV/purpose: Kentucky's legislature, secretly drafted by Jefferson, answers the Alien and Sedition Acts; its purpose is to assert states' right to judge federal overreach and rally Republican resistance. "
    "Argument relevance: Use to argue Federalist policies fractured national unity, provoking the nullification doctrine that would haunt the republic for decades.",
    )]

dbq = {"id": "5s24-ch03-dbq", "type": "dbq", "format": "remapped",
    "prompt": "To what extent did the Federalist administrations of George Washington and John Adams promote national unity and advance the authority of the federal government in the period 1789\u20131801?",
    "documents": docs,
    "difficulty": "hard", "period": "U3", "themes": ["PCE", "NAT"],
    "skill": "Argumentation", "reasoning": "Causation",
    "inspired_by": "5steps-2024/ch03.xhtml",
    "source_type": "mixed (pd-quote: docs 1\u20137)"}

json.dump({"items": [dbq]}, open(OUTDIR + "/ch03-dbq.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)
print("wrote ch03-dbq.json")
