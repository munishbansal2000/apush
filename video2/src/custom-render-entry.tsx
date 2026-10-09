import React from 'react';
import {Composition, registerRoot} from 'remotion';
import {LexingtonConcordMap} from './components/custom/LexingtonConcordMap';
import {BunkerHillMap} from './components/custom/BunkerHillMap';
import {SaratogaMap} from './components/custom/SaratogaMap';
import {YorktownMap} from './components/custom/YorktownMap';
import {TrentonPrincetonMap} from './components/custom/TrentonPrincetonMap';
import {PontiacFortsMap} from './components/custom/PontiacFortsMap';
import {ProclamationLineMap} from './components/custom/ProclamationLineMap';
import {BostonHarborClosed} from './components/custom/BostonHarborClosed';
import {StampActTax} from './components/custom/StampActTax';
import {BoycottPressure} from './components/custom/BoycottPressure';
import {HamiltonFinanceFlow} from './components/custom/HamiltonFinanceFlow';
import {ArticlesWeakness} from './components/custom/ArticlesWeakness';
import {ConstitutionFixes} from './components/custom/ConstitutionFixes';
import {Election1800} from './components/custom/Election1800';
import {TeaPartyHarbor} from './components/custom/TeaPartyHarbor';

const D = 120; // 4 seconds at 30fps

const Root: React.FC = () => (
  <>
    <Composition id="LexingtonConcordMap" component={LexingtonConcordMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="BunkerHillMap" component={BunkerHillMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="SaratogaMap" component={SaratogaMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="YorktownMap" component={YorktownMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="TrentonPrincetonMap" component={TrentonPrincetonMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="PontiacFortsMap" component={PontiacFortsMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="ProclamationLineMap" component={ProclamationLineMap} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="BostonHarborClosed" component={BostonHarborClosed} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="StampActTax" component={StampActTax} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="BoycottPressure" component={BoycottPressure} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="HamiltonFinanceFlow" component={HamiltonFinanceFlow} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="ArticlesWeakness" component={ArticlesWeakness} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="ConstitutionFixes" component={ConstitutionFixes} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="Election1800" component={Election1800} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
    <Composition id="TeaPartyHarbor" component={TeaPartyHarbor} durationInFrames={D} fps={30} width={1280} height={720} defaultProps={{}} />
  </>
);

registerRoot(Root);
