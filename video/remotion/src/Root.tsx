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
import { EPISODE_FRAMES } from "./data/durations";
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
        durationInFrames={EPISODE_FRAMES.E1}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E2Episode"
        component={U1E2Episode}
        durationInFrames={EPISODE_FRAMES.E2}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E3Episode"
        component={U1E3Episode}
        durationInFrames={EPISODE_FRAMES.E3}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E4Episode"
        component={U1E4Episode}
        durationInFrames={EPISODE_FRAMES.E4}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E5Episode"
        component={U1E5Episode}
        durationInFrames={EPISODE_FRAMES.E5}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E6Episode"
        component={U1E6Episode}
        durationInFrames={EPISODE_FRAMES.E6}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E7Episode"
        component={U1E7Episode}
        durationInFrames={EPISODE_FRAMES.E7}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E8Episode"
        component={U1E8Episode}
        durationInFrames={EPISODE_FRAMES.E8}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U1E9Episode"
        component={U1E9Episode}
        durationInFrames={EPISODE_FRAMES.E9}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="U2E1Episode"
        component={U2E1Episode}
        durationInFrames={EPISODE_FRAMES.U2E1}
        fps={30}
        width={1280}
        height={720}
      />
      {/* U3E6 disabled locally (files not synced) */}

    </>
  );
};
