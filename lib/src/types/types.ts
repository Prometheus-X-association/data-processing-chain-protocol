import { NodeProcessor } from '../core/NodeProcessor';

export type ProcessorPipeline = NodeProcessor[];

// Todo: review
export type PipelineData = unknown;

export interface CallbackPayload {
  targetId: string;
  data: unknown;
}
export type Callback = (_payload: CallbackPayload) => void;
export type ProcessorCallback = (_payload: CallbackPayload) => PipelineData;

export namespace NodeType {
  export type Location = 'local' | 'external';
  export const LOCAL: Location = 'local';
  export const EXTERNAL: Location = 'external';
}

export namespace DataType {
  export type Type = 'raw' | 'compressed';
  export const RAW: Type = 'raw';
  export const COMPRESSED: Type = 'compressed';
}

export namespace CombineStrategy {
  export type Type = 'merge' | 'union' | 'custom';
  export const MERGE: Type = 'merge';
  export const UNION: Type = 'union';
  export const CUSTOM: Type = 'custom';
}

export type CombineFonction = (_dataSets: PipelineData[]) => unknown[];

export interface ChainState {
  completed: string[];
  pending: string[];
  failed: string[];
}
export namespace NodeStatus {
  export type Type =
    | 'pending'
    | 'in-progress' // running
    | 'completed'
    | 'failed'
    | 'paused';
  export const PAUSED: Type = 'paused';
  export const PENDING: Type = 'pending';
  export const IN_PROGRESS: Type = 'in-progress';
  export const COMPLETED: Type = 'completed';
  export const FAILED: Type = 'failed';
}

export namespace NodeSignal {
  export type Type =
    | 'node_create'
    | 'node_delete'
    | 'node_pause'
    | 'node_delay'
    | 'node_run'
    | 'node_send_data';
  export const NODE_CREATE: Type = 'node_create';
  export const NODE_DELETE: Type = 'node_delete';
  export const NODE_PAUSE: Type = 'node_pause';
  export const NODE_DELAY: Type = 'node_delay';
  export const NODE_RUN: Type = 'node_run';
  export const NODE_SEND_DATA: Type = 'node_send_data';
}

export interface SupervisorPayload {
  signal: NodeSignal.Type;
  [key: string]: any;
}

export interface BrodcastMessage {
  signal: NodeSignal.Type;
  chain: {
    id: string;
    config: { services: string[] }[];
  };
}