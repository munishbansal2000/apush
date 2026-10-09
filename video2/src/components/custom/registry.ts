/** Custom explainer components by name (see catalog.ts for what each shows). */
import type React from 'react';
import type {CustomName} from './catalog';
import type {CustomProps, Phase} from './kit';
import {ArticlesWeakness, DEFAULT_PHASES as ArticlesPhases} from './ArticlesWeakness';
import {BostonHarborClosed, DEFAULT_PHASES as HarborPhases} from './BostonHarborClosed';
import {BoycottPressure, DEFAULT_PHASES as BoycottPhases} from './BoycottPressure';
import {BunkerHillMap, DEFAULT_PHASES as BunkerPhases} from './BunkerHillMap';
import {ConstitutionFixes, DEFAULT_PHASES as ConstitutionPhases} from './ConstitutionFixes';
import {Election1800, DEFAULT_PHASES as ElectionPhases} from './Election1800';
import {HamiltonFinanceFlow, DEFAULT_PHASES as HamiltonPhases} from './HamiltonFinanceFlow';
import {LexingtonConcordMap, DEFAULT_PHASES as LexingtonPhases} from './LexingtonConcordMap';
import {PontiacFortsMap, DEFAULT_PHASES as PontiacPhases} from './PontiacFortsMap';
import {ProclamationLineMap, DEFAULT_PHASES as ProclamationPhases} from './ProclamationLineMap';
import {SaratogaMap, DEFAULT_PHASES as SaratogaPhases} from './SaratogaMap';
import {StampActTax, DEFAULT_PHASES as StampPhases} from './StampActTax';
import {TeaPartyHarbor, DEFAULT_PHASES as TeaPhases} from './TeaPartyHarbor';
import {TrentonPrincetonMap, DEFAULT_PHASES as TrentonPhases} from './TrentonPrincetonMap';
import {YorktownMap, DEFAULT_PHASES as YorktownPhases} from './YorktownMap';

export const CUSTOM_COMPONENTS: Record<CustomName, {component: React.FC<CustomProps>; phases: Phase[]}> = {
  ArticlesWeakness: {component: ArticlesWeakness, phases: ArticlesPhases},
  BostonHarborClosed: {component: BostonHarborClosed, phases: HarborPhases},
  BoycottPressure: {component: BoycottPressure, phases: BoycottPhases},
  BunkerHillMap: {component: BunkerHillMap, phases: BunkerPhases},
  ConstitutionFixes: {component: ConstitutionFixes, phases: ConstitutionPhases},
  Election1800: {component: Election1800, phases: ElectionPhases},
  HamiltonFinanceFlow: {component: HamiltonFinanceFlow, phases: HamiltonPhases},
  LexingtonConcordMap: {component: LexingtonConcordMap, phases: LexingtonPhases},
  PontiacFortsMap: {component: PontiacFortsMap, phases: PontiacPhases},
  ProclamationLineMap: {component: ProclamationLineMap, phases: ProclamationPhases},
  SaratogaMap: {component: SaratogaMap, phases: SaratogaPhases},
  StampActTax: {component: StampActTax, phases: StampPhases},
  TeaPartyHarbor: {component: TeaPartyHarbor, phases: TeaPhases},
  TrentonPrincetonMap: {component: TrentonPrincetonMap, phases: TrentonPhases},
  YorktownMap: {component: YorktownMap, phases: YorktownPhases},
};
