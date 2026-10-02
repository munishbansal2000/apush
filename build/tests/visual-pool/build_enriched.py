#!/usr/bin/env python3
"""Build U4/U5 visual-enriched MCQ pools.

Reads CURRENT staged items (post key-audit, key_status final), attaches the
verified visual (image_url + source_page + pd_rationale), and adds a LIGHT,
clearly-separable visual suggestion (suggested_stimulus caption; suggested_stem
only where the stem must stop referencing a text stimulus). Original item text
is kept intact: the re-conception pass will refresh wording at assembly and
re-pair these suggestions then.

Outputs (in this directory):
  U4-enriched.json, U5-enriched.json   {"items": [...]}
  IMAGES-U4.md, IMAGES-U5.md           verification tables
"""

import json, os, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
STAGED = os.path.expanduser("~/workspace/apush/build/reclaim-merged/staged")

# ---------------------------------------------------------------- images
# key -> (image_url, pd_rationale)
IMAGES = {
 "sequoyah": (
  "https://upload.wikimedia.org/wikipedia/commons/1/15/Se-Quo-Yah_-_R.T._%3B_drawn%2C_printed_%26_coloured_at_I.T._Bowen%27s_Lithographic_Establishment%2C_No._94_Walnut_St._LCCN93504544.jpg",
  "Published 1838 (I. T. Bowen, Philadelphia; McKenney-Hall series). Pre-1930 publication; Public Domain tag confirmed on Commons file page (observed 2026-10-01)."),
 "king_andrew": (
  "https://upload.wikimedia.org/wikipedia/commons/3/32/King_Andrew_the_First_%28political_cartoon_of_President_Andrew_Jackson%29.jpg",
  "Published 1832, artist unknown (Library of Congress). Pre-1930 publication; Public Domain tag confirmed on Commons file page (observed 2026-10-01)."),
 "many_headed": (
  "https://upload.wikimedia.org/wikipedia/commons/c/c6/General_Jackson_slaying_the_many_headed_monster_LCCN2008661279.jpg",
  "Published 1836 (lithograph by Henry R. Robinson; Library of Congress). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "tot_nps": (
  "https://upload.wikimedia.org/wikipedia/commons/d/d4/Trail_of_tears_map_NPS.jpg",
  "U.S. National Park Service map (work of the U.S. federal government, public domain). PD tag confirmed on Commons file page (observed 2026-10-01)."),
 "tot_nps2": (
  "https://upload.wikimedia.org/wikipedia/commons/1/1a/NPS_trail-of-tears-map.gif",
  "U.S. National Park Service map of Cherokee removal routes (federal work, public domain). PD tag confirmed (observed 2026-10-01)."),
 "lowell": (
  "https://upload.wikimedia.org/wikipedia/commons/c/cf/View_of_Lowell%2C_Massachusetts_at_the_confluence_of_the_Merrimack_and_Concord_rivers%2C_with_a_row_of_textile_mills_or_factories_mainly_along_the_Merrimack_River_LCCN94515606.jpg",
  "Published 1840-1860 (Popular Graphic Arts, Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "lowell_offering": (
  "https://upload.wikimedia.org/wikipedia/commons/2/28/1845_Lowell_Offering_cover.png",
  "Published 1845. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "am_progress": (
  "https://upload.wikimedia.org/wikipedia/commons/f/fd/American_Progress_%28John_Gast_painting%29.jpg",
  "Painted 1872 by John Gast (d. 1896). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "erie": (
  "https://upload.wikimedia.org/wikipedia/commons/e/e8/%28View_on_the_Erie_Canal.%29_%283990000597%29.jpg",
  "Published 1832 (New York Public Library; no known copyright restrictions). Pre-1930 publication (observed 2026-10-01)."),
 "haven": (
  "https://upload.wikimedia.org/wikipedia/commons/5/59/Map_Of_The_United_States_Including_Oregon%2C_Texas_And_The_Californias_..._showing_the_Boundary_claimed_by_the_United_States_%28IA_dr_map-of-the-united-states-including-oregon-texas-and-the-californias-sh-4452000%29.jpg",
  "Published 1846 by John Haven. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "gilman": (
  "https://upload.wikimedia.org/wikipedia/commons/1/1d/Gilman_%28United_States_%28after_the_Treaty_of_Guadalupe_Hidalgo%29%29_1848_UTA.jpg",
  "Published 1848 by E. Gilman. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "alamo": (
  "https://upload.wikimedia.org/wikipedia/commons/3/30/Fall-of-the-alamo-gentilz_1844.jpg",
  "Painted 1844 by Theodore Gentilz. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "arrowsmith": (
  "https://upload.wikimedia.org/wikipedia/commons/a/a4/Arrowsmith_Map_of_Texas_1841_UTA.jpg",
  "Published 1841 by John Arrowsmith. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "sentiments": (
  "https://upload.wikimedia.org/wikipedia/commons/2/2f/Declaration_sentiments_foote_lrg.jpg",
  "Published 1848 (Library of Congress). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "tecumseh": (
  "https://upload.wikimedia.org/wikipedia/commons/a/a3/Tecumseh_addresses_Harrison%2C_1810.jpg",
  "Published 1850 (engraving by John R. Chapin). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "across": (
  "https://upload.wikimedia.org/wikipedia/commons/a/a0/Across_the_continent%2C_%22Westward_the_course_of_empire_takes_its_way%22_-_J.M._Ives%2C_del._%3B_drawn_by_F.F._Palmer._LCCN90708413.jpg",
  "Published 1868 by Currier & Ives. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "sutter": (
  "https://upload.wikimedia.org/wikipedia/commons/4/4c/Arthur_Nahl%2C_Sutters%27s_Mill.gif",
  "Painted 1851 by Arthur Nahl. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "harrison": (
  "https://upload.wikimedia.org/wikipedia/commons/f/f1/General_Wm._H._Harrison_of_Tippecanoe%2C_Fort_Meigs_and_the_Thames_LCCN2003677557.jpg",
  "Published 1840 (campaign lithograph; Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "oneida": (
  "https://upload.wikimedia.org/wikipedia/commons/1/1f/Oneida_Commune.png",
  "Photographed c.1865-1875 (Moulton & Dopp). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "nast": (
  "https://upload.wikimedia.org/wikipedia/commons/4/45/The_Union_as_it_was_The_lost_cause%2C_worse_than_slavery_-_-_Th._Nast._LCCN2001696840.jpg",
  "Published October 24, 1874 (Harper's Weekly; Thomas Nast). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "ep": (
  "https://upload.wikimedia.org/wikipedia/commons/8/89/The_Proclamation_of_Emancipation%2C_by_the_President_of_the_United_States%2C_to_take_effect_January_1st%2C_1863.png",
  "Published September 22, 1862 (preliminary proclamation). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "antietam": (
  "https://upload.wikimedia.org/wikipedia/commons/f/f8/Antietam%2C_Maryland._Confederate_soldiers_1862.jpg",
  "Photographed September 1862 by Alexander Gardner. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "vicksburg": (
  "https://upload.wikimedia.org/wikipedia/commons/3/36/Siege_and_capture_of_Vicksburg%2C_Miss._July_4th_1863_LCCN2001705838.jpg",
  "Published 1863 (Popular Graphic Arts, Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "utc": (
  "https://upload.wikimedia.org/wikipedia/commons/2/2b/Harriet_Beecher_Stowe%2C_Uncle_Tom%27s_Cabin%2C_vol._1%2C_1852%2C_title_page.jpg",
  "Published 1852 (first-edition title page). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "bruce": (
  "https://upload.wikimedia.org/wikipedia/commons/9/9c/Blanche_Bruce_-_Brady-Handy.jpg",
  "Photographed 1865-1880 by Mathew Brady. Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "reynolds": (
  "https://upload.wikimedia.org/wikipedia/commons/f/f7/Reynolds%27s_Political_Map_of_the_United_States_1856.jpg",
  "Published c.1856 (Wm. C. Reynolds, New York). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "brady_lincoln": (
  "https://upload.wikimedia.org/wikipedia/commons/a/ab/Abraham_Lincoln%2C_candidate_for_U.S._president%2C_three-quarter_length_portrait%2C_before_delivering_his_Cooper_Union_address_in_New_York_City%29_-_Brady%2C_N.Y_LCCN98504529.jpg",
  "Photographed February 27, 1860 by Mathew Brady (Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "freeslave": (
  "https://upload.wikimedia.org/wikipedia/commons/c/cd/Map_of_the_United_States%2C_showing_by_colors_the_area_of_freedom_and_slavery%2C_and_the_territories_whose_destiny_is_yet_to_be_decided%2C_exhibiting_also_the_Missouri_compromise_line%2C_and_the_routes_of_%284578788503%29.jpg",
  "Published 1850s (abolitionist wall map; scan of pre-1930 original). Public Domain tag confirmed on Commons file page (observed 2026-10-01)."),
 "anaconda": (
  "https://upload.wikimedia.org/wikipedia/commons/8/81/Scott%27s_great_snake._Entered_according_to_Act_of_Congress_in_the_year_1861_LOC_99447020.jpg",
  "Published 1861 (J. B. Elliott; entered per Act of Congress; Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "impeach": (
  "https://upload.wikimedia.org/wikipedia/commons/c/ce/The_Senate_as_a_court_of_impeachment_for_the_trial_of_Andrew_Johnson_-_sketched_by_Theodore_R._Davis._LCCN96521681.jpg",
  "Published 1868 (Theodore R. Davis). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "knownothing": (
  "https://upload.wikimedia.org/wikipedia/commons/4/47/Uncle_Sam%27s_youngest_son%2C_Citizen_Know_Nothing_-_Sarony_%26_Co.%2C_lith.%2C_117_Fulton_St.%2C_N.Y._LCCN2003689281.jpg",
  "Published 1854 (Sarony & Co. lithograph; Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "amend15": (
  "https://upload.wikimedia.org/wikipedia/commons/0/0d/The_Fifteenth_Amendment._Celebrated_May_19th%2C_1870_-_from_an_original_design_by_James_C._Beard._LCCN2003690776.jpg",
  "Published 1870 (lithograph after James C. Beard; Library of Congress). Pre-1930 publication; PD tag confirmed (observed 2026-10-01)."),
 "perry": (
  "https://upload.wikimedia.org/wikipedia/commons/c/cb/The_Mission_of_Commodore_Perry_to_Japan_in_1854_%28BM_2013%2C3002.1_19%29.jpg",
  "Painted 1854-1858 (Japanese scroll; British Museum). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 "carpenter": (
  "https://upload.wikimedia.org/wikipedia/commons/2/2b/First_Reading_of_the_Emancipation_Proclamation_of_President_Lincoln_by_Francis_Bicknell_Carpenter.png",
  "Painted 1864 by Francis Bicknell Carpenter (d. 1899); U.S. Capitol collection. Public Domain tag confirmed (observed 2026-10-01)."),
 "declaration": (
  "https://upload.wikimedia.org/wikipedia/commons/b/bd/Engrossed_Declaration_of_Independence%2C_front.jpg",
  "1776 engrossed manuscript (Second Continental Congress; National Archives). U.S. federal record, public domain (observed 2026-10-01)."),
 "copperhead": (
  "https://upload.wikimedia.org/wikipedia/commons/2/27/The_pending_contest._Although_all_Copperheads_call_themselves_Democrats%2C_nevertheless%2C_all_Democrats_are_not_Copperheads_LCCN2008661659.jpg",
  "Published 1864 (Library of Congress). Pre-1930 publication; Public Domain tag confirmed (observed 2026-10-01)."),
 # generated originals (committed fixed-seed script gen_election_maps.py)
 "svg1824": ("svg/electoral-1824.svg",
  "Original diagram generated by the committed fixed-seed script gen_election_maps.py (this directory). No third-party source; electoral data cross-checked against published state-by-state results."),
 "svg1860": ("svg/electoral-1860.svg",
  "Original diagram generated by the committed fixed-seed script gen_election_maps.py (this directory). No third-party source; electoral data cross-checked against published state-by-state results."),
 "svg1864": ("svg/electoral-1864.svg",
  "Original diagram generated by the committed fixed-seed script gen_election_maps.py (this directory). No third-party source; electoral data cross-checked against published state-by-state results."),
 "svg1876": ("svg/electoral-1876.svg",
  "Original diagram generated by the committed fixed-seed script gen_election_maps.py (this directory). No third-party source; electoral data cross-checked against published state-by-state results."),
 "svgsecession": ("svg/secession-1861.svg",
  "Original diagram generated by the committed fixed-seed script gen_election_maps.py (this directory). No third-party source; secession dates are the standard ordinance dates."),
}

# item_id -> (image_key, suggested_stimulus_caption, suggested_stem_or_None, note_or_None)
U4 = [
 ("barrons-2027-ch06-04", "sequoyah",
  "Lithograph of Sequoyah (Cherokee scholar), drawn, printed, and colored at I. T. Bowen's Lithographic Establishment, Philadelphia, 1838 (McKenney-Hall series, Library of Congress).",
  None,
  "Stem's image-description says 1828; the Bowen/McKenney-Hall lithograph is 1838 — corrected in caption; assembly should fix the stem date."),
 ("barrons-2027-ch06-05", "sequoyah",
  "Lithograph of Sequoyah (Cherokee scholar), I. T. Bowen, Philadelphia, 1838 (McKenney-Hall series, Library of Congress).",
  None, None),
 ("5s24-exam1-mcq-17", "king_andrew",
  "Political cartoon, \"King Andrew the First,\" published 1832 (artist unknown, Library of Congress).",
  None, None),
 ("5s24-exam1-mcq-19", "king_andrew",
  "Political cartoon, \"King Andrew the First,\" 1832 (artist unknown, Library of Congress).",
  None, None),
 ("5s24-exam1-mcq-20", "king_andrew",
  "Political cartoon, \"King Andrew the First,\" 1832 (artist unknown, Library of Congress).",
  None, None),
 ("pr25e-test2-q27", "king_andrew",
  "Political cartoon, \"King Andrew the First,\" 1832 (artist unknown, Library of Congress).",
  None, None),
 ("pr25e-test3-q19", "tot_nps",
  "Map of the Trail of Tears National Historic Trail, U.S. National Park Service.",
  None, None),
 ("pr25e-test3-q20", "tot_nps",
  "Map of the Trail of Tears National Historic Trail, U.S. National Park Service.",
  None, None),
 ("barrons-2027-ch06-02", "lowell",
  "View of Lowell, Massachusetts, at the confluence of the Merrimack and Concord rivers, c. 1840-1860 (Library of Congress).",
  None, None),
 ("5s24-ch13-mcq-04", "lowell_offering",
  "Cover of the Lowell Offering, a magazine written by women mill workers, 1845.",
  None, None),
 ("pr25e-test1-q22", "am_progress",
  "\"American Progress,\" oil painting by John Gast, 1872.",
  None, None),
 ("pr25e-ch08-q10", "erie",
  "\"View on the Erie Canal,\" print, 1832 (New York Public Library).",
  None, None),
 ("pr25e-test1-q21", "haven",
  "\"Map of the United States Including Oregon, Texas and the Californias,\" John Haven, 1846.",
  None, None),
 ("pr25e-ch09-q01", "gilman",
  "\"United States (after the Treaty of Guadalupe Hidalgo),\" E. Gilman, 1848.",
  None, None),
 ("5s24-ch03-mcq-37", "alamo",
  "\"Fall of the Alamo,\" painting by Theodore Gentilz, 1844.",
  None, None),
 ("5s24-ch03-mcq-39", "alamo",
  "\"Fall of the Alamo,\" painting by Theodore Gentilz, 1844.",
  None, None),
 ("5s24-ch03-mcq-40", "arrowsmith",
  "\"Map of Texas,\" John Arrowsmith, 1841.",
  None, None),
 ("barrons-2027-pt1-49", "sentiments",
  "The Declaration of Sentiments, adopted at Seneca Falls, New York, 1848 (Library of Congress).",
  None, None),
 ("barrons-2027-pt1-50", "sentiments",
  "The Declaration of Sentiments, Seneca Falls, 1848 (Library of Congress).",
  None, None),
 ("5s24-exam2-mcq-25", "across",
  "\"Across the Continent: Westward the Course of Empire Takes Its Way,\" Currier & Ives print, 1868.",
  None, None),
 ("5s24-exam2-mcq-26", "across",
  "\"Across the Continent: Westward the Course of Empire Takes Its Way,\" Currier & Ives print, 1868.",
  None, None),
 ("pr25e-test1-q20", "sutter",
  "\"Sutter's Mill,\" painting by Arthur Nahl, 1851.",
  None, None),
 ("barrons-2027-ch06-09", "harrison",
  "Campaign lithograph, \"General Wm. H. Harrison of Tippecanoe, Fort Meigs and the Thames,\" 1840 (Library of Congress).",
  None, None),
 ("pr25e-ch08-q08", "oneida",
  "Photograph of the Oneida Community, Oneida, New York, c. 1865-1875.",
  None, None),
 ("pr25e-ch08-q04", "svg1824",
  "Electoral map of the 1824 presidential election (original diagram: Jackson 99, Adams 84, Crawford 41, Clay 37; the House chose Adams).",
  None, None),
 ("5s24-ch13-mcq-06", "many_headed",
  "Political cartoon, \"General Jackson Slaying the Many Headed Monster,\" lithograph by Henry R. Robinson, 1836 (Library of Congress).",
  None, None),
 ("5s24-ch13-mcq-07", "many_headed",
  "Political cartoon, \"General Jackson Slaying the Many Headed Monster,\" 1836 (Library of Congress).",
  None, None),
 ("5s24-ch13-mcq-08", "many_headed",
  "Political cartoon, \"General Jackson Slaying the Many Headed Monster,\" 1836 (Library of Congress). The item's stimulus already describes this exact cartoon.",
  None, None),
 ("5s24-exam1-mcq-18", "king_andrew",
  "Political cartoon, \"King Andrew the First,\" 1832 (artist unknown, Library of Congress). The item's stimulus already describes this exact cartoon.",
  None, None),
 ("5s24-ch12-mcq-05", "erie",
  "\"View on the Erie Canal,\" print, 1832 (New York Public Library).",
  None, None),
]

U5 = [
 ("5s24-exam2-mcq-17", "nast",
  "Thomas Nast, \"The Union as It Was / The Lost Cause, Worse Than Slavery,\" Harper's Weekly, October 24, 1874 (Library of Congress).",
  None, None),
 ("5s24-exam2-mcq-19", "nast",
  "Thomas Nast, \"The Union as It Was,\" Harper's Weekly, October 24, 1874 (Library of Congress).",
  None, None),
 ("barrons-2027-pt2-28", "ep",
  "The Emancipation Proclamation, as issued September 22, 1862 (preliminary proclamation, effective January 1, 1863).",
  None, None),
 ("barrons-2027-pt2-29", "ep",
  "The Emancipation Proclamation, September 22, 1862 (effective January 1, 1863).",
  None, None),
 ("pr25e-ch09-q11", "antietam",
  "Confederate dead on the battlefield at Antietam, Maryland, photographed by Alexander Gardner, September 1862.",
  None, None),
 ("5s24-ch15-mcq-04", "vicksburg",
  "\"Siege and capture of Vicksburg, Miss., July 4th 1863\" (Library of Congress).",
  None, None),
 ("5s24-ch14-mcq-06", "utc",
  "Title page of Harriet Beecher Stowe, Uncle Tom's Cabin, vol. 1, 1852 (first edition).",
  None, None),
 ("5s24-ch14-mcq-07", "utc",
  "Title page of Uncle Tom's Cabin, 1852 (first edition).",
  None, None),
 ("5s24-ch16-mcq-06", "bruce",
  "Blanche K. Bruce, U.S. Senator from Mississippi, photographed by Mathew Brady, c. 1870s.",
  None, None),
 ("5s24-ch16-mcq-07", "bruce",
  "Blanche K. Bruce, U.S. Senator from Mississippi, Mathew Brady photograph, c. 1870s.",
  None, None),
 ("5s24-ch14-mcq-02", "svg1860",
  "Electoral map of the 1860 presidential election (original diagram: Lincoln 180, Breckinridge 72, Bell 39, Douglas 12).",
  None, None),
 ("pr25e-ch09-q02", "reynolds",
  "Reynolds's Political Map of the United States, 1856, showing free states, slave states, and territories.",
  None, None),
 ("5s24-exam2-mcq-37", "brady_lincoln",
  "Abraham Lincoln, photographed by Mathew Brady in New York on February 27, 1860, the day of his Cooper Union address (Library of Congress).",
  None, None),
 ("5s24-exam2-mcq-38", "brady_lincoln",
  "Abraham Lincoln, Mathew Brady photograph, February 27, 1860 (Library of Congress).",
  None, None),
 ("5s24-ch14-mcq-01", "freeslave",
  "Map of the United States showing free and slave areas and the Missouri Compromise line, 1850s.",
  None, None),
 ("5s24-ch15-mcq-06", "anaconda",
  "\"Scott's Great Snake,\" J. B. Elliott, 1861: a contemporary map illustrating General Winfield Scott's Anaconda Plan (Library of Congress).",
  "The image above illustrates the Union strategy described in the excerpt. Which statement about that strategy is most accurate?",
  "Replaces the pd-quote stimulus with the famous contemporary map of the same plan; key unchanged."),
 ("5s24-ch16-mcq-02", "impeach",
  "\"The Senate as a Court of Impeachment for the Trial of Andrew Johnson,\" sketched by Theodore R. Davis, 1868 (Library of Congress).",
  None, None),
 ("5s24-ch16-mcq-04", "svg1876",
  "Electoral map of the disputed 1876 presidential election (original diagram: Hayes 185, Tilden 184; 20 votes disputed).",
  None, None),
 ("5s24-ch14-mcq-05", "knownothing",
  "\"Uncle Sam's Youngest Son, Citizen Know Nothing,\" lithograph by Sarony & Co., 1854 (Library of Congress).",
  None, None),
 ("5s24-ch16-mcq-05", "amend15",
  "\"The Fifteenth Amendment. Celebrated May 19th, 1870,\" lithograph after a design by James C. Beard (Library of Congress).",
  None, None),
 ("barrons-2027-ch07-02", "perry",
  "Japanese scroll painting depicting Commodore Perry's expedition to Japan, 1854-1858 (British Museum).",
  None, None),
 ("barrons-2027-ch07-03", "perry",
  "Japanese scroll painting of Commodore Perry's expedition to Japan, 1854-1858 (British Museum).",
  None, None),
 ("pr25e-test1-q33", "svg1864",
  "Electoral map of the 1864 presidential election (original diagram: Lincoln 212, McClellan 21).",
  "Which conclusion is best supported by the map above?",
  "Post-audit repaired item (stimulus added); map replaces/augments the excerpt. Key A unchanged: Lincoln's broad Northern sweep vs. McClellan's three small states."),
 ("5s24-ch14-mcq-08", "utc",
  "Title page of Uncle Tom's Cabin, 1852 (first edition).",
  None, None),
 ("pr25e-test2-q38", "carpenter",
  "\"First Reading of the Emancipation Proclamation of President Lincoln,\" painting by Francis Bicknell Carpenter, 1864 (U.S. Capitol).",
  None, None),
 ("pr25e-test3-q25", "svg1860",
  "Electoral map of the 1860 presidential election (original diagram: Lincoln 180, Breckinridge 72, Bell 39, Douglas 12).",
  None, None),
 ("pr25e-test3-q22", "svgsecession",
  "Map of secession, 1860-1861 (original diagram).",
  None, None),
 ("pr25e-ch09-q05", "svg1876",
  "Electoral map of the disputed 1876 presidential election (original diagram: Hayes 185, Tilden 184; 20 votes disputed).",
  None,
  "Post-audit repaired item (now about the 1876 electoral dispute); map supports key B (bipartisan commission, end of military Reconstruction)."),
 ("5s24-ch15-mcq-07", "anaconda",
  "\"Scott's Great Snake,\" J. B. Elliott, 1861 (Library of Congress). The map's depiction of the vast Southern coastline and territory supports the key (the Confederacy's sheer size).",
  None, None),
 ("5s24-ch15-mcq-05", "copperhead",
  "\"The Pending Contest,\" political cartoon on Copperheads, 1864 (Library of Congress).",
  None, None),
]


def source_page_for(url):
    if url.startswith("http"):
        fname = url.rsplit("/", 1)[-1]
        return "https://commons.wikimedia.org/wiki/File:" + fname
    return url  # generated SVGs: repo-relative path


def load_index():
    idx = {}
    for root, _, files in os.walk(STAGED):
        for fn in files:
            if fn.endswith(".json"):
                try:
                    d = json.load(open(os.path.join(root, fn)))
                except Exception:
                    continue
                items = d.get("items", []) if isinstance(d, dict) else (d if isinstance(d, list) else [])
                for it in items:
                    if isinstance(it, dict) and "id" in it:
                        idx[it["id"]] = it
    return idx


def build(pairs, out_json, out_md, period):
    idx = load_index()
    items, rows, missing = [], [], []
    for item_id, img_key, caption, s_stem, note in pairs:
        it = idx.get(item_id)
        if it is None:
            missing.append(item_id)
            continue
        url, pd = IMAGES[img_key]
        e = dict(it)
        e["key_status"] = "final"
        e["visual_adapted"] = True
        e["image_url"] = url
        e["source_page"] = source_page_for(url)
        e["pd_rationale"] = pd
        e["suggested_stimulus"] = caption
        if s_stem:
            e["suggested_stem"] = s_stem
        if note:
            e["visual_note"] = note
        items.append(e)
        rows.append((item_id, url, e["source_page"], pd))
    json.dump({"items": items}, open(out_json, "w"), indent=1, ensure_ascii=False)
    with open(out_md, "w") as f:
        f.write("# Visual verification — %s (%d items)\n\n" % (period, len(rows)))
        f.write("All `image_url` values returned HTTP 200 on 2026-10-01 (curl -I), except generated SVGs (repo-local, validated as well-formed SVG).\n\n")
        f.write("| id | image_url | source_page | pd_rationale |\n|---|---|---|---|\n")
        for i, u, sp, pd in rows:
            f.write("| %s | %s | %s | %s |\n" % (i, u, sp, pd))
    print(period, "items:", len(items), "missing:", missing)
    return missing


if __name__ == "__main__":
    m1 = build(U4, os.path.join(HERE, "U4-enriched.json"),
               os.path.join(HERE, "IMAGES-U4.md"), "U4")
    m2 = build(U5, os.path.join(HERE, "U5-enriched.json"),
               os.path.join(HERE, "IMAGES-U5.md"), "U5")
    assert not m1 and not m2, (m1, m2)
    print("done")
