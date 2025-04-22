/* eslint-disable no-unused-vars */
import { Logger } from '../utils/Logger';
import { PipelineProcessor } from '../core/PipelineProcessor';

export type ReportingSignalType = 'local-signal' | 'global-signal';
export type ProcessorPipeline = PipelineProcessor[];
export type PipelineData = unknown;
export interface PipelineMeta {
  header?: unknown;
  resolver?: string;
  monitoringHost?: string;
  configuration: unknown;
}
export interface CallbackPayload {
  chainId?: string;
  nextTargetId?: string;
  nextNodeResolver?: string;
  previousNodeResolver?: string;
  previousTargetId?: string;
  targetId: string;
  data?: PipelineData;
  meta?: PipelineMeta;
}
export type NodeStatusCallback = (payload: any) => void;
export type ServiceCallback = (payload: CallbackPayload) => void;
export type SetupCallback = (message: BroadcastSetupMessage) => Promise<void>;
export type PreCallback = (message: BroadcastPreMessage) => Promise<any>;
export type ReportingCallback = (message: ReportingMessage) => Promise<void>;
export type BroadcastReportingCallback = (
  message: BroadcastReportingMessage,
) => Promise<void>;

export namespace DefaultCallback {
  // todo: should be remote_service_callback
  export const SERVICE_CALLBACK: ServiceCallback = (
    payload: CallbackPayload,
  ) => {
    Logger.warn('REMOTE_SERVICE_CALLBACK not set');
  };
  // todo: should be broadcast_setup_callback
  export const SETUP_CALLBACK: SetupCallback = async (
    message: BroadcastSetupMessage,
  ) => {
    Logger.warn('SETUP_CALLBACK not set');
  };
  export const PRE_CALLBACK: PreCallback = async (
    message: BroadcastPreMessage,
  ) => {
    Logger.warn('PRE_CALLBACK not set');
  };
  export const REPORTING_CALLBACK: ReportingCallback = async (
    message: ReportingMessage,
  ) => {
    Logger.warn('REPORTING_CALLBACK not set');
  };
  export const BROADCAST_REPORTING_CALLBACK: ReportingCallback = async (
    message: BroadcastReportingMessage,
  ) => {
    Logger.warn('BROADCAST_REPORTING_CALLBACK not set');
  };
  export const NODE_STATUS_CALLBACK: NodeStatusCallback = async (
    message: NodeStatusMessage,
  ) => {
    Logger.warn('NODE_STATUS_CALLBACK not set');
  };
}

export type ProcessorCallback = (
  payload: CallbackPayload,
) => Promise<any>;

export type preProcessorCallback = (
  payload: CallbackPayload,
) => Promise<PipelineData>;

export namespace NodeType {
  export type Type = 'local' | 'remote';
  export const LOCAL: Type = 'local';
  export const REMOTE: Type = 'remote';
}

export namespace DataType {
  export type Type = 'raw' | 'compressed';
  export const RAW: Type = 'raw';
  export const COMPRESSED: Type = 'compressed';
}

export type CombineFonction = (dataSets: PipelineData[]) => unknown[];

export interface ChainState {
  completed: string[];
  pending: string[];
  failed: string[];
}

export interface ResumePayload {
  data: unknown;
  params: unknown;
}

export namespace ChainType {
  export type Type = 512 | 256 | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1;
  export const DEFAULT: Type = 1;
  export const PERSISTANT: Type = 2;
  export const AUTO_DELETE: Type = 4;
}

export namespace ChainStatus {
  export type Type =
    | 'chain_notified'
    | 'chain_deployed'
    | 'chain_setup_completed'
    | 'node_pending'
    | 'node_in_progress' // running
    | 'node_completed'
    | 'node_failed'
    // | 'node_paused'
    | 'node_resumed'
    | 'node_suspended'
    | 'node_setup_completed'
    | 'child_chain_started'
    | 'child_chain_completed'
    | 'node_pending_deletion'
    | 'node_end_of_pipeline';
  // export const NODE_PAUSED: Type = 'node_paused';
  export const CHAIN_NOTIFIED: Type = 'chain_notified';
  export const CHAIN_DEPLOYED: Type = 'chain_deployed';
  export const CHAIN_SETUP_COMPLETED: Type = 'chain_setup_completed';
  export const NODE_PENDING: Type = 'node_pending';
  export const NODE_IN_PROGRESS: Type = 'node_in_progress';
  export const NODE_COMPLETED: Type = 'node_completed';
  export const NODE_FAILED: Type = 'node_failed';
  export const NODE_SETUP_COMPLETED: Type = 'node_setup_completed';
  export const CHILD_CHAIN_STARTED: Type = 'child_chain_started';
  export const CHILD_CHAIN_COMPLETED: Type = 'child_chain_completed';
  export const NODE_PENDING_DELETION: Type = 'node_pending_deletion';
  export const NODE_END_OF_PIPELINE: Type = 'node_end_of_pipeline';
  export const NODE_SUSPENDED: Type = 'node_suspended';
  export const NODE_RESUMED: Type = 'node_resumed';
}

// handler signal
export namespace NodeSignal {
  export type Type =
    // node signals
    | 'node_setup'
    | 'node_create'
    | 'node_delete'
    // | 'node_pause'
    | 'node_suspend'
    // | 'node_delay'
    | 'node_run'
    | 'node_send_data'
    | 'node_error'
    | 'node_resume'
    | 'node_stop'
    | 'node_pre'
    // chain signals
    | 'chain_prepare'
    | 'chain_start'
    | 'chain_start_pending_occurrence'
    | 'chain_deploy';
  // node signals
  export const NODE_SETUP: 'node_setup' = 'node_setup';
  export const NODE_CREATE: 'node_create' = 'node_create';
  export const NODE_DELETE: 'node_delete' = 'node_delete';
  // export const NODE_PAUSE: 'node_pause' = 'node_pause';
  // export const NODE_DELAY: 'node_delay' = 'node_delay';
  export const NODE_RUN: 'node_run' = 'node_run';
  export const NODE_SEND_DATA: 'node_send_data' = 'node_send_data';
  export const NODE_ERROR: 'node_error' = 'node_error';
  export const NODE_RESUME: 'node_resume' = 'node_resume';
  export const NODE_STOP: 'node_stop' = 'node_stop';
  export const NODE_SUSPEND: 'node_suspend' = 'node_suspend';
  export const NODE_PRE: 'node_pre' = 'node_pre';
  // chain signals
  export const CHAIN_PREPARE: 'chain_prepare' = 'chain_prepare';
  export const CHAIN_START: 'chain_start' = 'chain_start';
  export const CHAIN_START_PENDING_OCCURRENCE: 'chain_start_pending_occurrence' =
    'chain_start_pending_occurrence';
  export const CHAIN_DEPLOY: 'chain_deploy' = 'chain_deploy';
}

export type SupervisorPayloadSetup = {
  signal: 'node_setup';
  config: NodeConfig;
};

export type SupervisorPayloadCreate = {
  signal: 'node_create';
  params: NodeConfig;
};

export type SupervisorPayloadDelete = {
  signal: 'node_delete';
  id: string;
};

export type SupervisorPayloadRun = {
  signal: 'node_run';
  id: string;
  data: PipelineData;
};

export type SupervisorPayloadSendData = {
  signal: 'node_send_data';
  id: string;
};

export type SupervisorPayloadPrepareChain = {
  signal: 'chain_prepare';
  id: string;
};

export type SupervisorPayloadStartChain = {
  signal: 'chain_start';
  id: string;
  data: PipelineData;
};

export type SupervisorPayloadStartPendingChain = {
  signal: 'chain_start_pending_occurrence';
  id: string;
};

export type SupervisorPayloadDeployChain = {
  signal: 'chain_deploy';
  config: ChainConfig;
  data: PipelineData;
};

export type SupervisorPayloadPre = {
  signal: 'node_pre';
  config: ChainConfig;
  data?: PipelineData;
};

export type SupervisorPayload =
  | SupervisorPayloadSetup
  | SupervisorPayloadCreate
  | SupervisorPayloadDelete
  | SupervisorPayloadRun
  | SupervisorPayloadSendData
  | SupervisorPayloadPrepareChain
  | SupervisorPayloadStartChain
  | SupervisorPayloadStartPendingChain
  | SupervisorPayloadDeployChain
  | SupervisorPayloadPre;

export interface ServiceConfig {
  targetId: string;
  meta?: PipelineMeta;
}

export enum ChildMode {
  NORMAL = 'normal',
  PARALLEL = 'parallel',
  POST = 'post',
  PRE = 'pre',
}

export type NodeConfig = {
  services: (string | ServiceConfig)[];
  chainId: string;
  index?: number; // automatically set
  count?: number; // automatically set
  location?: NodeType.Type;
  nextTargetId?: string;
  nextNodeResolver?: string;
  previousNodeResolver?: string;
  nextMeta?: PipelineMeta;
  chainType?: ChainType.Type;
  monitoringHost?: string;
  childMode?: ChildMode;
  chainConfig?: ChainConfig;
  pre?: any[];
  post?: ChainConfig[];
  rootConfig?: NodeConfig;
  signalQueue?: NodeSignal.Type[];
};

export type ChainConfig = NodeConfig[];
export interface BroadcastSetupMessage {
  signal: NodeSignal.Type;
  chain: {
    id: string;
    config: ChainConfig;
  };
}
export interface BroadcastPreMessage {
  signal: NodeSignal.Type;
  chain: {
    config: ChainConfig;
    data?: PipelineData;
  };
}

export interface ReportingPayload {
  chainId: string;
  nodeId: string;
  index: number;
  count: number;
}

export interface Notification {
  status: ChainStatus.Type;
  signal?: NodeSignal.Type;
  broadcasted?: boolean;
  payload?: unknown;
}

export interface ReportingMessage extends ReportingPayload {
  signal: Notification & Partial<NodeStatusMessage>;
}

export interface BroadcastReportingMessage extends ReportingPayload {
  signal: Notification;
}

export interface NodeStatusMessage extends ReportingPayload {
  signal: NodeSignal.Type;
  payload?: unknown;
}

export interface ChainRelation {
  rootNodeId?: string;
  dataRef?: PipelineData;
  config: ChainConfig;
}
