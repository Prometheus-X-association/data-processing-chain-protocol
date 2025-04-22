import { NodeSupervisor } from './core/NodeSupervisor';
import { PipelineProcessor } from './core/PipelineProcessor';

import * as MonitoringModule from './extensions/DefaultMonitoringSignalHandler';
import * as ReportingModule from './extensions/DefaultReportingCallbacks';
import * as ResolverModule from './extensions/DefaultResolverCallbacks';
import * as NodeStatusModule from './extensions/DefaultNodeStatusBroadcaster';

export { NodeSupervisor };
export { PipelineProcessor };

export {
  ServiceCallback,
  NodeSignal,
  ChainStatus,
  PipelineData,
  PipelineMeta,
  SupervisorPayload,
  CallbackPayload,
  BroadcastSetupMessage,
  BroadcastPreMessage,
  ReportingMessage,
  ChainConfig,
  ChainRelation,
  NodeConfig,
  NodeType,
  ProcessorCallback,
  CombineFonction,
  SupervisorPayloadSetup,
  SupervisorPayloadCreate,
  SupervisorPayloadDelete,
  SupervisorPayloadRun,
  SupervisorPayloadSendData,
  SupervisorPayloadPrepareChain,
  SupervisorPayloadStartChain,
  SupervisorPayloadStartPendingChain,
  SupervisorPayloadDeployChain,
  ChainState,
  DataType,
  ChainType,
  ProcessorPipeline,
  SetupCallback,
  ServiceConfig,
} from './types/types';

export namespace Ext {
  export type BRCPayload = ReportingModule.Ext.BRCPayload;
  export type MCPayload = ReportingModule.Ext.MCPayload;
  export type BSCPayload = ResolverModule.Ext.BSCPayload;
  export type BDCPayload = ResolverModule.Ext.BDCPayload;
  export type RSCPayload = ResolverModule.Ext.RSCPayload;
  export type NSCPayload = NodeStatusModule.Ext.NSCPayload;
  export const Monitoring: typeof MonitoringModule.Ext = MonitoringModule.Ext;
  export const Reporting: typeof ReportingModule.Ext = ReportingModule.Ext;
  export const Resolver: typeof ResolverModule.Ext = ResolverModule.Ext;
  export const NodeStatus: typeof NodeStatusModule.Ext = NodeStatusModule.Ext;
}
