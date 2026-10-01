# FLAGS — factual contradictions found in the Princeton Review source
Date: 2026-10-01. All three verified before filing.

## 1. "Black Friday" for the 1987 stock-market crash (CONFIRMED ERROR)
- **Location**: `ch13-mcq.json`, Q4 explanation: "Although there was a brief drop in the stock market in 1987 (known as Black Friday)…"
- **Problem**: the October 19, 1987 crash is universally known as **Black Monday**, not Black Friday. (Black Friday in finance more often refers to the September 24, 1869 gold-panic crash.)
- **Recommended fix**: change the explanation to "known as Black Monday." The item's key is unaffected.

## 2. Aristotle misattributed to Sepulveda (CONFIRMED ERROR)
- **Location**: Practice Test 1, MCQ Questions 1–4 stimulus — Source 1 reads "Those whose condition is such that their function is the use of their bodies and nothing better can be expected of them, those, I say, are slaves of nature…" attributed to **"Juan de Sepulveda, Politics, 1522."**
- **Problem**: this is a paraphrase of **Aristotle's *Politics*, Book I** (c. 350 BCE). Sepulveda wrote no work titled *Politics* in 1522 — his 1522 publication was *Parva Naturalia*, and his natural-slavery argument appeared in *Democrates Secundus* (1544), which itself drew on Aristotle. Verified against the *Politics* text (Book I, "slaves by nature") and Sepulveda's bibliography.
- **Recommended fix**: re-attribute the stimulus to Aristotle, *Politics*. The questions built on it are unaffected in substance, but any student-facing attribution must be corrected.

## 3. "Unaffected" typo in a test-3 LEQ prompt (TYPO)
- **Location**: Practice Test 3, LEQ trio — "Evaluate the extent to which industrialization **unaffected** rural and urban workers from 1865 to 1900."
- **Problem**: "unaffected" makes the prompt nonsensical; context and the parallel structure of the other prompts show it should read "**affected**."
- **Handling**: the remapped item (`leq-test3-main`) uses "affected"; the original wording is preserved in the item's `original_prompt` field with a note.
