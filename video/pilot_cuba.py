"""Showcase lesson: '13 Days: The Cuban Missile Crisis' (~5 min).

Built to the engagement playbook spec:
- declarative hook (never open with a question)
- hook -> context -> 3 enumerated beats -> significance landing -> ritual close
- primary-source voice (Kennedy's Oct 22 address, US govt work = PD)
- 'what historians still argue about' beat (differentiation)
- every beat ends with its consequence
"""
import sys, subprocess
sys.path.insert(0, ".")
import motion

AS = "assets/cuba"

SCRIPT = [
    # (scene_builder_key, narration_text)
    ("hook",
     "For thirteen days in October 1962, the United States and the Soviet Union "
     "stood closer to nuclear war than at any moment before or since. This is the "
     "story of how the world almost ended, and the deal that saved it."),

    ("context",
     "Here is where we are. It is 1962, and the Cold War has been running for fifteen "
     "years. Both sides hold enough nuclear weapons to destroy each other many times over. "
     "In 1959, Fidel Castro took power in Cuba, just ninety miles off Florida. In 1961, "
     "Kennedy backed the failed Bay of Pigs invasion. Castro, fearing another invasion, "
     "turned to the Soviet leader, Nikita Khrushchev. And Khrushchev had a plan: put Soviet "
     "nuclear missiles in Cuba, secretly, and change the balance of power overnight."),

    ("beat1a",
     "First, the discovery. On October 14, an American U-2 spy plane photographed Cuba "
     "from seventy thousand feet. Analysts saw it immediately: launch pads, missile trailers, "
     "Soviet medium-range missiles that could reach Washington in minutes. Kennedy was shown "
     "the photos on October 16."),

    ("beat1b",  # multi-voice: see BEAT1B_PARTS (narrator -> Kennedy -> narrator)
     "A week later he told the nation. Kennedy, in his own voice: It shall be the policy "
     "of this nation to regard any nuclear missile launched from Cuba as an attack by the "
     "Soviet Union on the United States. The point is this: the missiles were real, they were "
     "nearly operational, and the public knew nothing. Kennedy had days to decide."),

    ("beat2",
     "Second, the choice. Kennedy's generals wanted an airstrike: bomb the sites before the "
     "missiles were ready. His civilian advisers warned that no airstrike would get every "
     "missile, and the survivors would fire back. It meant war. So Kennedy chose a third path: "
     "a naval quarantine. Note the word. A blockade was an act of war under international law. "
     "A quarantine sounded like a doctor's order. Remember this distinction, because the word "
     "was the strategy. The point is, Kennedy picked the one option that left both sides "
     "room to back down."),

    ("beat3a",
     "Third, the thirteen days. On October 22, Kennedy went on television and told "
     "the world. Soviet ships steamed toward the quarantine line, and stopped. "
     "For six days the world held its breath."),

    ("beat3b",
     "Then October 27, the worst day: an American U-2 was shot down over Cuba, and "
     "a Soviet submarine commander nearly launched a nuclear torpedo. One officer, "
     "Vasili Arkhipov, refused to agree, and the launch needed his vote. The next day "
     "Khrushchev agreed to remove the missiles. The secret half of the deal: America "
     "quietly pulled its own missiles out of Turkey."),

    ("significance",
     "The point is this. The Cuban Missile Crisis is the closest the Cold War ever came to "
     "turning hot, and it taught both sides that brinkmanship, pushing a crisis to the edge "
     "to make the other side blink, could end the world by accident. Afterward, Washington and "
     "Moscow installed a direct hotline. Now, what historians still argue about: was Kennedy's "
     "handling a masterstroke of crisis management, or did the world survive on luck, one Soviet "
     "officer's refusal? The evidence supports both readings. That is worth sitting with."),

    ("close",
     "So when the exam asks about Cold War turning points, this is the one: containment pushed "
     "to its absolute limit. Drill the dates and the deal in the U8 set linked below. And next, "
     "the Vietnam War, where containment broke down for real. Let us keep going."),
]

AUDIO = "audio/cuba"
TTS_BIN = "/opt/hatch/bin/tts"
VOICE = "avocado_v2:MAI_01"
VOICE_QUOTE = "avocado_v2:MAI_03"  # distinct voice for primary-source quotes

# beat1b is multi-voice: narrator -> Kennedy (quote) -> narrator
BEAT1B_PARTS = [
    ("narrator", "A week later he told the nation:"),
    ("kennedy", "It shall be the policy of this nation to regard any nuclear "
                "missile launched from Cuba as an attack by the Soviet Union "
                "on the United States."),
    ("narrator", "The point is this: the missiles were real, they were nearly "
                 "operational, and the public knew nothing. Kennedy had days to decide."),
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
            # multi-voice assembly
            if not os.path.exists(p):
                print("tts: beat1b (multi-voice)", flush=True)
                parts = []
                for i, (who, pt) in enumerate(BEAT1B_PARTS):
                    pp = f"{AUDIO}/beat1b_p{i}.mp3"
                    synth(pt, pp, VOICE_QUOTE if who == "kennedy" else VOICE)
                    parts.append(pp)
                with open(f"{AUDIO}/beat1b_list.txt", "w") as f:
                    f.write("".join(f"file '{pp}'\n" for pp in parts))
                subprocess.run(
                    ["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0",
                     "-i", f"{AUDIO}/beat1b_list.txt", "-c", "copy", p],
                    check=True)
        elif not os.path.exists(p):
            print("tts:", key, flush=True)
            synth(text, p)
        paths.append(p)
    return paths


def main():
    audios = tts_all()
    assert len(audios) == 9, f"expected 9 narration clips, got {len(audios)}"
    scenes = []
    # 1. hook — kinetic title over the quarantine fleet
    scenes.append(motion.kinetic_text("13 DAYS", motion.dur(audios[0]),
                                     sub="October 1962",
                                     bg_img=f"{AS}/quarantine.jpg"))
    # 2. context — the map
    scenes.append(motion.cuba_map_scene(motion.dur(audios[1]),
                                        caption="Ninety miles off Florida"))
    # 3. beat 1a — punch into the U-2 photo, right onto the missile convoy
    scenes.append(motion.zoom_to(
        f"{AS}/missile_site.gif", motion.dur(audios[2]),
        cx=0.55, cy=0.45, end_zoom=2.4,
        caption="U-2 photograph, October 14, 1962",
        highlight_box=(0.3, 0.3, 0.7, 0.6)))
    # 4. beat 1b — Kennedy's words type themselves out
    scenes.append(motion.typewriter_scene(
        "\u201cIt shall be the policy of this nation to regard any nuclear "
        "missile launched from Cuba as an attack by the Soviet Union on "
        "the United States.\u201d",
        motion.dur(audios[3]),
        bg_img=f"{AS}/kennedy_address.jpg",
        sub="Kennedy, address to the nation, October 22, 1962"))
    # 5. beat 2 — the choice, over the missile photos
    scenes.append(motion.bullet_slide(
        "Kennedy's Choice",
        ["Airstrike: bomb the sites, risk the survivors firing back",
         "Quarantine: stop Soviet ships, leave room to negotiate"],
        motion.dur(audios[4]),
        bg_img=f"{AS}/cuban_missiles.jpg"))
    # 6. beat 3a — the address (punch in)
    scenes.append(motion.punch_in(motion.caption_scene(
        f"{AS}/kennedy_address.jpg",
        "Kennedy addresses the nation, October 22, 1962",
        motion.dur(audios[5]),
        zoom=0.25, pan_x=0.5, pan_y=0.3)))
    # 7. beat 3b — the timeline, over the quarantine fleet
    scenes.append(motion.timeline_scene(
        [("Oct 14", "U-2 finds missiles"),
         ("Oct 16", "Kennedy briefed"),
         ("Oct 22", "Address, quarantine"),
         ("Oct 24", "Soviet ships turn back"),
         ("Oct 27", "U-2 shot down"),
         ("Oct 28", "Deal: missiles out")],
        motion.dur(audios[6]), title="The 13 Days",
        bg_img=f"{AS}/quarantine.jpg", darken=165))
    # 8. significance — the debate, over the missile site
    scenes.append(motion.bullet_slide(
        "What historians still argue about",
        ["Masterstroke of crisis management?",
         "Or survival on luck: one officer's refusal?"],
        motion.dur(audios[7]),
        bg_img=f"{AS}/missile_site.gif"))
    # 9. close — over the missiles
    scenes.append(motion.title_card("Containment, pushed to its limit.",
                                    motion.dur(audios[8]),
                                    sub="APUSH \u00b7 Period 8 \u00b7 Cold War",
                                    bg_img=f"{AS}/cuban_missiles.jpg"))
    motion.assemble(scenes, audios,
                    "/home/hatch/workspace/your_files/cuba-showcase.mp4")
    print("done")


if __name__ == "__main__":
    main()
