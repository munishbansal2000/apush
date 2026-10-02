"""Showcase lesson v4: '13 Days: The Cuban Missile Crisis' (~2:40).

Beat-Heimler cut:
- declarative hook, enumeration architecture, "the point is" landings
- annotation overlay track on every scene (term/label/point/arrow/pop)
- multi-voice primary source (Kennedy's quote in a second voice)
- counterfactual + uncertainty admission (his structural weak spots)
- camera paths, spring easing, punch-ins throughout
"""
import sys, subprocess
sys.path.insert(0, ".")
import motion

AS = "assets/cuba"

SCRIPT = [
    ("hook",
     "October 1962. For thirteen days, the United States and the Soviet Union "
     "stood closer to nuclear war than at any moment before or since."),

    ("context",
     "Cuba sits just ninety miles off the Florida coast. When Fidel Castro took "
     "power in 1959 and aligned his new government with Moscow, those ninety miles "
     "became the most dangerous stretch of water on earth. The Soviets saw an "
     "opening: nuclear missiles, parked in America's backyard."),

    ("beat1a",
     "On October 14th, an American U-2 spy plane photographed Soviet missile sites "
     "under construction in western Cuba. Medium-range missiles. Nuclear warheads "
     "already on the way. From those concrete pads, a warhead could reach Washington "
     "in minutes."),

    ("beat1b",  # multi-voice: see BEAT1B_PARTS
     "A week later, Kennedy went before the cameras. It shall be the policy of this "
     "nation to regard any nuclear missile launched from Cuba as an attack by the "
     "Soviet Union on the United States. The point is this: the missiles were real, "
     "they were nearly operational, and the American public knew nothing. Kennedy "
     "had days to decide."),

    ("beat2",
     "Kennedy's advisers split down the middle. The generals wanted airstrikes: bomb "
     "the sites before the missiles went live. But bombing couldn't guarantee every "
     "missile, and any survivors could launch. So Kennedy chose something stranger: "
     "a quarantine. A naval blockade in everything but name. They didn't call it a "
     "blockade because under international law, a blockade is an act of war. "
     "The word was the strategy."),

    ("beat3a",
     "On October 22nd, Kennedy went on television and told the American people "
     "everything. Nuclear brinkmanship, playing out in public for the first time "
     "in history."),

    ("beat3b",
     "For six days, Soviet ships steamed toward the quarantine line. On October 24th, "
     "they stopped. Then they turned back. Behind the scenes, Kennedy and Khrushchev "
     "traded secret letters, and they cut a deal: the Soviets pull the missiles out, "
     "America pledges never to invade Cuba. And quietly, almost as an afterthought, "
     "America pulls its own nuclear missiles out of Turkey."),

    ("significance",
     "The missiles never launched. But here's what keeps historians up at night: we "
     "still argue about what actually ended it, the quarantine, or the secret Turkey "
     "pledge. And if those ships hadn't turned back on October 24th, the Navy had "
     "orders to fire. Nobody knows what happens next. Thirteen days that proved "
     "restraint could be a weapon."),

    ("close",
     "That's the Cuban Missile Crisis: thirteen days, one quarantine, zero missiles "
     "launched. Full breakdown with practice questions at the link below. "
     "See you in the next one."),
]

AUDIO = "audio/cuba"
TTS_BIN = "/opt/hatch/bin/tts"
VOICE = "avocado_v2:MAI_01"
VOICE_QUOTE = "avocado_v2:MAI_03"  # distinct voice for primary-source quotes

BEAT1B_PARTS = [
    ("narrator", "A week later, Kennedy went before the cameras."),
    ("kennedy", "It shall be the policy of this nation to regard any nuclear "
                "missile launched from Cuba as an attack by the Soviet Union "
                "on the United States."),
    ("narrator", "The point is this: the missiles were real, they were nearly "
                 "operational, and the American public knew nothing. Kennedy had "
                 "days to decide."),
]


def synth(text, out, voice=VOICE):
    subprocess.run(
        [TTS_BIN, "speak", "--voice", voice, "--speed", "92",
         "--output", out, "--text", text],
        check=True)


def tts_all():
    import os
    os.makedirs(AUDIO, exist_ok=True)
    paths = []
    for key, text in SCRIPT:
        p = f"{AUDIO}/{key}.mp3"
        if key == "beat1b":
            if not os.path.exists(p):
                print("tts: beat1b (multi-voice)", flush=True)
                parts = []
                for i, (who, pt) in enumerate(BEAT1B_PARTS):
                    pp = f"{AUDIO}/beat1b_p{i}.mp3"
                    synth(pt, pp, VOICE_QUOTE if who == "kennedy" else VOICE)
                    parts.append(pp)
                with open(f"{AUDIO}/beat1b_list.txt", "w") as f:
                    f.write("".join(
                        f"file '{os.path.abspath(pp)}'\n" for pp in parts))
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                     "-i", f"{AUDIO}/beat1b_list.txt", "-c:a", "libmp3lame",
                     "-b:a", "128k", p],
                    check=True)
        elif not os.path.exists(p):
            print("tts:", key, flush=True)
            synth(text, p)
        paths.append(p)
    return paths


def main():
    audios = tts_all()
    assert len(audios) == 9, f"expected 9 narration clips, got {len(audios)}"
    A = motion.annotate
    scenes = []

    # 1. hook
    scenes.append(A(
        motion.kinetic_text("13 DAYS FROM NUCLEAR WAR", motion.dur(audios[0]),
                            sub="October 1962", bg_img=f"{AS}/havana_street.jpg"),
        [(0.3, 3.0, "label", dict(text="October 1962", x=0.5, y=0.24))]))

    # 2. context — the map
    scenes.append(A(
        motion.cuba_map_scene(motion.dur(audios[1])),
        [(5.0, 4.0, "term", dict(term="FIDEL CASTRO",
                                 gloss="took power 1959, aligned Cuba with Moscow")),
         (9.5, 3.0, "arrow", dict(text="Havana", x=0.62, y=0.30, lx=0.62, ly=0.18)),
         (13.5, 4.0, "point", dict(text="the most dangerous 90 miles on earth"))]))

    # 3. beat 1a — punch into the U-2 photo
    scenes.append(A(
        motion.zoom_to(f"{AS}/missile_site.gif", motion.dur(audios[2]),
                       cx=0.55, cy=0.45, end_zoom=2.4,
                       caption="U-2 photograph, October 14, 1962",
                       highlight_box=(0.3, 0.3, 0.7, 0.6)),
        [(2.0, 4.0, "term", dict(term="U-2 SPY PLANE",
                                 gloss="high-altitude reconnaissance, 70,000 feet")),
         (8.0, 3.0, "arrow", dict(text="missile convoy", x=0.55, y=0.45,
                                   lx=0.55, ly=0.25)),
         (11.0, 3.5, "point", dict(text="Washington in minutes"))]))

    # 4. beat 1b — Kennedy's words, typed live, second voice
    scenes.append(A(
        motion.typewriter_scene(
            "\u201cIt shall be the policy of this nation to regard any nuclear "
            "missile launched from Cuba as an attack by the Soviet Union on "
            "the United States.\u201d",
            motion.dur(audios[3]),
            bg_img=f"{AS}/kennedy_address.jpg",
            sub="Kennedy, address to the nation, October 22, 1962"),
        [(18.0, 4.0, "term", dict(term="BRINKMANSHIP",
                                  gloss="pushing to the edge without going over"))]))

    # 5. beat 2 — the choice
    scenes.append(A(
        motion.bullet_slide(
            "Kennedy's Choice",
            ["Airstrike: bomb the sites, risk the survivors firing back",
             "Quarantine: stop Soviet ships, leave room to negotiate"],
            motion.dur(audios[4]),
            bg_img=f"{AS}/cuban_missiles.jpg"),
        [(1.5, 4.0, "term", dict(term="EXCOMM",
                                 gloss="Kennedy's secret crisis committee")),
         (19.0, 2.5, "pop", dict(text="DON'T SAY BLOCKADE")),
         (23.0, 3.5, "point", dict(text="The word was the strategy."))]))

    # 6. beat 3a — the address
    scenes.append(A(
        motion.punch_in(motion.caption_scene(
            f"{AS}/kennedy_address.jpg",
            "Kennedy addresses the nation, October 22, 1962",
            motion.dur(audios[5]), zoom=0.25, pan_x=0.5, pan_y=0.3)),
        [(0.8, 4.0, "label", dict(text="October 22, 1962 — televised address",
                                   x=0.5, y=0.24)),
         (6.0, 3.5, "point", dict(text="brinkmanship, live on TV"))]))

    # 7. beat 3b — the timeline
    scenes.append(A(
        motion.timeline_scene(
            [("Oct 14", "U-2 finds missiles"),
             ("Oct 22", "Address, quarantine"),
             ("Oct 24", "Ships turn back"),
             ("Oct 28", "Deal: missiles out")],
            motion.dur(audios[6]), title="The 13 Days",
            bg_img=f"{AS}/quarantine.jpg", darken=165),
        [(1.5, 4.0, "term", dict(term="QUARANTINE LINE",
                                 gloss="500-mile naval perimeter")),
         (6.0, 4.0, "label", dict(text="Oct 24 — Soviet ships turn back",
                                   x=0.5, y=0.24)),
         (15.5, 4.0, "point", dict(text="the deal: missiles out, no invasion")),
         (20.0, 2.5, "pop", dict(text="SECRET TURKEY DEAL"))]))

    # 8. significance — the landing (narration carries it clean)
    scenes.append(
        motion.kinetic_text("THE MISSILES NEVER LAUNCHED", motion.dur(audios[7]),
                            bg_img=f"{AS}/havana_street.jpg", darken=130))

    # 9. close
    scenes.append(
        motion.title_card("13 days. One quarantine. Zero missiles launched.",
                          motion.dur(audios[8]),
                          sub="Full breakdown + practice questions at the link below",
                          bg_img=f"{AS}/cuban_missiles.jpg", darken=140))

    motion.assemble(scenes, audios,
                    "/home/hatch/workspace/your_files/cuba-showcase.mp4")
    print("done")


if __name__ == "__main__":
    main()
