import { Composition } from "remotion";
import { Demo } from "./components/Demo";
import { U2E5Act1 } from "./components/U2E5Act1";
import {
  SceneTalkingHead,
  SceneTalkingHeadFun,
  SceneMayaMoods,
  SceneHeimlerStyle,
  SceneDuel,
  SceneArgument,
  SceneShip,
  SceneShipBattle,
  SceneControlsShowcase,
  ScenePhysics,
} from "./components/ComponentShowcase";
import { U1E1Episode } from "./components/U1E1Episode";
import { U1E2Episode } from "./components/U1E2Episode";
import { U1E3Episode } from "./components/U1E3Episode";
import { U1E4Episode } from "./components/U1E4Episode";
import { U1E5Episode } from "./components/U1E5Episode";
import { U1E6Episode } from "./components/U1E6Episode";
import { U1E7Episode } from "./components/U1E7Episode";
import { U1E8Episode } from "./components/U1E8Episode";
import { U1E9Episode } from "./components/U1E9Episode";
import { U2E1Episode } from "./components/U2E1Episode";
import { U2E2Episode } from "./components/U2E2Episode";
import { U2E4Episode } from "./components/U2E4Episode";
import { U2E5Episode } from "./components/U2E5Episode";
import { U2E7Episode } from "./components/U2E7Episode";
import { U2E8Episode } from "./components/U2E8Episode";
import { U2E9Episode } from "./components/U2E9Episode";
import { U2E10Episode } from "./components/U2E10Episode";
import { U2E6Episode } from "./components/U2E6Episode";
import { U2E3Episode } from "./components/U2E3Episode";
import type { EpisodeData } from "./lib/load-episode-data";
import e3Timing from "./data/e3/timing_map.json";
// import { U3E6Scene } from "./u3e6/U3E6Scene";
// import { U3E6_COMPS } from "./u3e6/u3e6_shots";
// import { U3E6_Act1 } from "./u3e6/U3E6_Act1";
// import { U3E6_ACT1_DUR } from "./u3e6/u3e6_act1_data";

const FPS = 30;

/**
 * Derive composition duration from episode data supplied via inputProps.
 *
 * Generated pipeline data (out/data/) is never bundled into the JS — the
 * caller (tools/contact-sheet.ts, or Studio's props editor) supplies it as
 * props. Root must not resolve episode data at bundle time: that would run
 * inside the browser bundle for all 19 compositions at once, and webpack
 * cannot see runtime-generated files, so every episode would warn and the
 * selected one would render with empty data.
 *
 * With no props (Studio opened bare), fall back to a 1s placeholder; the
 * component's own data-loader fallback then applies at render time.
 */
const _e3t = e3Timing as unknown as { starts: number[]; durations: number[] };
const E3_FRAMES = Math.max(
  30,
  Math.ceil((_e3t.starts[_e3t.starts.length - 1] + _e3t.durations[_e3t.durations.length - 1]) * FPS)
);

function episodeMetadata({ props }: { props: { episodeData?: EpisodeData } }) {
  const d = props.episodeData;
  let durationInFrames = 30;
  if (d && d.starts.length > 0 && d.durations.length > 0) {
    const totalSec = d.starts[d.starts.length - 1] + d.durations[d.durations.length - 1];
    durationInFrames = Math.max(30, Math.ceil(totalSec * FPS));
  }
  return { durationInFrames };
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Demo"
        component={Demo}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E5Act1"
        component={U2E5Act1}
        durationInFrames={3900}
        fps={30}
        width={480}
        height={270}
      />
      <Composition
        id="SceneTalkingHead"
        component={SceneTalkingHead}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneTalkingHeadFun"
        component={SceneTalkingHeadFun}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneMayaMoods"
        component={SceneMayaMoods}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneHeimlerStyle"
        component={SceneHeimlerStyle}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneDuel"
        component={SceneDuel}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneArgument"
        component={SceneArgument}
        durationInFrames={180}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneShip"
        component={SceneShip}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneShipBattle"
        component={SceneShipBattle}
        durationInFrames={150}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="SceneControlsShowcase"
        component={SceneControlsShowcase}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="ScenePhysics"
        component={ScenePhysics}
        durationInFrames={300}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E1Episode"
        component={U1E1Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E2Episode"
        component={U1E2Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E3Episode"
        component={U1E3Episode}
        durationInFrames={E3_FRAMES}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E4Episode"
        component={U1E4Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E5Episode"
        component={U1E5Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E6Episode"
        component={U1E6Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E7Episode"
        component={U1E7Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E8Episode"
        component={U1E8Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E9Episode"
        component={U1E9Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E1Episode"
        component={U2E1Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E2Episode"
        component={U2E2Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E4Episode"
        component={U2E4Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E5Episode"
        component={U2E5Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E7Episode"
        component={U2E7Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E8Episode"
        component={U2E8Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E9Episode"
        component={U2E9Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E10Episode"
        component={U2E10Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E6Episode"
        component={U2E6Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E3Episode"
        component={U2E3Episode}
        calculateMetadata={episodeMetadata}
        durationInFrames={30}
        fps={30}
        width={1280}
        height={720}
      />
      {/* U3E6 disabled locally (files not synced) */}

    </>
  );
};
