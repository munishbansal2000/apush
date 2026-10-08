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
import { EPISODE_FRAMES } from "./data/durations";
import { loadEpisodeData } from "./lib/load-episode-data";
// import { U3E6Scene } from "./u3e6/U3E6Scene";
// import { U3E6_COMPS } from "./u3e6/u3e6_shots";
// import { U3E6_Act1 } from "./u3e6/U3E6_Act1";
// import { U3E6_ACT1_DUR } from "./u3e6/u3e6_act1_data";

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
        defaultProps={{ episodeData: loadEpisodeData('e1') }}
        durationInFrames={EPISODE_FRAMES.E1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E2Episode"
        component={U1E2Episode}
        defaultProps={{ episodeData: loadEpisodeData('e2') }}
        durationInFrames={EPISODE_FRAMES.E2}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E3Episode"
        component={U1E3Episode}
        defaultProps={{ episodeData: loadEpisodeData('e3') }}
        durationInFrames={EPISODE_FRAMES.E3}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E4Episode"
        component={U1E4Episode}
        defaultProps={{ episodeData: loadEpisodeData('e4') }}
        durationInFrames={EPISODE_FRAMES.E4}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E5Episode"
        component={U1E5Episode}
        defaultProps={{ episodeData: loadEpisodeData('e5') }}
        durationInFrames={EPISODE_FRAMES.E5}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E6Episode"
        component={U1E6Episode}
        defaultProps={{ episodeData: loadEpisodeData('e6') }}
        durationInFrames={EPISODE_FRAMES.E6}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E7Episode"
        component={U1E7Episode}
        defaultProps={{ episodeData: loadEpisodeData('e7') }}
        durationInFrames={EPISODE_FRAMES.E7}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E8Episode"
        component={U1E8Episode}
        defaultProps={{ episodeData: loadEpisodeData('e8') }}
        durationInFrames={EPISODE_FRAMES.E8}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E9Episode"
        component={U1E9Episode}
        defaultProps={{ episodeData: loadEpisodeData('e9') }}
        durationInFrames={EPISODE_FRAMES.E9}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E1Episode"
        component={U2E1Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e1') }}
        durationInFrames={EPISODE_FRAMES.U2E1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E2Episode"
        component={U2E2Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e2') }}
        durationInFrames={EPISODE_FRAMES.U2E2}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E4Episode"
        component={U2E4Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e4') }}
        durationInFrames={EPISODE_FRAMES.U2E4}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E5Episode"
        component={U2E5Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e5') }}
        durationInFrames={EPISODE_FRAMES.U2E5}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E7Episode"
        component={U2E7Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e7') }}
        durationInFrames={EPISODE_FRAMES.U2E7}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E8Episode"
        component={U2E8Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e8') }}
        durationInFrames={EPISODE_FRAMES.U2E8}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E9Episode"
        component={U2E9Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e9') }}
        durationInFrames={EPISODE_FRAMES.U2E9}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E10Episode"
        component={U2E10Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e10') }}
        durationInFrames={EPISODE_FRAMES.U2E10}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E6Episode"
        component={U2E6Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e6') }}
        durationInFrames={EPISODE_FRAMES.U2E6}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E3Episode"
        component={U2E3Episode}
        defaultProps={{ episodeData: loadEpisodeData('u2e3') }}
        durationInFrames={EPISODE_FRAMES.U2E3}
        fps={30}
        width={1280}
        height={720}
      />
      {/* U3E6 disabled locally (files not synced) */}

    </>
  );
};
