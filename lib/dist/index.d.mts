declare class PipelineProcessor {
    static callbackService: ProcessorCallback;
    static preProcessorCallback: preProcessorCallback;
    private meta?;
    private targetId;
    constructor(config: ServiceConfig);
    static setCallbackService(callbackService: ProcessorCallback): void;
    static setPreCallbackService(preCallbackService: ProcessorCallback): void;
    digest(data: PipelineData, config?: NodeConfig | null): Promise<PipelineData>;
}

type ReportingSignalType = 'local-signal' | 'global-signal';
type ProcessorPipeline = PipelineProcessor[];
type PipelineData = unknown;
interface PipelineMeta {
    header?: unknown;
    resolver?: string;
    monitoringHost?: string;
    configuration: unknown;
}
interface CallbackPayload {
    chainId?: string;
    nextTargetId?: string;
    nextNodeResolver?: string;
    previousNodeResolver?: string;
    previousTargetId?: string;
    targetId: string;
    data?: PipelineData;
    meta?: PipelineMeta;
}
type NodeStatusCallback = (payload: any) => void;
type ServiceCallback = (payload: CallbackPayload) => void;
type SetupCallback = (message: BroadcastSetupMessage) => Promise<void>;
type PreCallback = (message: BroadcastPreMessage) => Promise<any>;
type ReportingCallback = (message: ReportingMessage) => Promise<void>;
type BroadcastReportingCallback = (message: BroadcastReportingMessage) => Promise<void>;
type ProcessorCallback = (payload: CallbackPayload) => Promise<any>;
type preProcessorCallback = (payload: CallbackPayload) => Promise<PipelineData>;
declare namespace NodeType {
    type Type = 'local' | 'remote';
    const LOCAL: Type;
    const REMOTE: Type;
}
declare namespace DataType {
    type Type = 'raw' | 'compressed';
    const RAW: Type;
    const COMPRESSED: Type;
}
type CombineFonction = (dataSets: PipelineData[]) => unknown[];
interface ChainState {
    completed: string[];
    pending: string[];
    failed: string[];
}
interface ResumePayload {
    data: unknown;
    params: unknown;
}
declare namespace ChainType {
    type Type = 512 | 256 | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1;
    const DEFAULT: Type;
    const PERSISTANT: Type;
    const AUTO_DELETE: Type;
}
declare namespace ChainStatus {
    type Type = 'chain_notified' | 'chain_deployed' | 'chain_setup_completed' | 'node_pending' | 'node_in_progress' | 'node_completed' | 'node_failed' | 'node_resumed' | 'node_suspended' | 'node_setup_completed' | 'child_chain_started' | 'child_chain_completed' | 'node_pending_deletion' | 'node_end_of_pipeline';
    const CHAIN_NOTIFIED: Type;
    const CHAIN_DEPLOYED: Type;
    const CHAIN_SETUP_COMPLETED: Type;
    const NODE_PENDING: Type;
    const NODE_IN_PROGRESS: Type;
    const NODE_COMPLETED: Type;
    const NODE_FAILED: Type;
    const NODE_SETUP_COMPLETED: Type;
    const CHILD_CHAIN_STARTED: Type;
    const CHILD_CHAIN_COMPLETED: Type;
    const NODE_PENDING_DELETION: Type;
    const NODE_END_OF_PIPELINE: Type;
    const NODE_SUSPENDED: Type;
    const NODE_RESUMED: Type;
}
declare namespace NodeSignal {
    type Type = 'node_setup' | 'node_create' | 'node_delete' | 'node_suspend' | 'node_run' | 'node_send_data' | 'node_error' | 'node_resume' | 'node_stop' | 'node_pre' | 'chain_prepare' | 'chain_start' | 'chain_start_pending_occurrence' | 'chain_deploy';
    const NODE_SETUP: 'node_setup';
    const NODE_CREATE: 'node_create';
    const NODE_DELETE: 'node_delete';
    const NODE_RUN: 'node_run';
    const NODE_SEND_DATA: 'node_send_data';
    const NODE_ERROR: 'node_error';
    const NODE_RESUME: 'node_resume';
    const NODE_STOP: 'node_stop';
    const NODE_SUSPEND: 'node_suspend';
    const NODE_PRE: 'node_pre';
    const CHAIN_PREPARE: 'chain_prepare';
    const CHAIN_START: 'chain_start';
    const CHAIN_START_PENDING_OCCURRENCE: 'chain_start_pending_occurrence';
    const CHAIN_DEPLOY: 'chain_deploy';
}
type SupervisorPayloadSetup = {
    signal: 'node_setup';
    config: NodeConfig;
};
type SupervisorPayloadCreate = {
    signal: 'node_create';
    params: NodeConfig;
};
type SupervisorPayloadDelete = {
    signal: 'node_delete';
    id: string;
};
type SupervisorPayloadRun = {
    signal: 'node_run';
    id: string;
    data: PipelineData;
};
type SupervisorPayloadSendData = {
    signal: 'node_send_data';
    id: string;
};
type SupervisorPayloadPrepareChain = {
    signal: 'chain_prepare';
    id: string;
};
type SupervisorPayloadStartChain = {
    signal: 'chain_start';
    id: string;
    data: PipelineData;
};
type SupervisorPayloadStartPendingChain = {
    signal: 'chain_start_pending_occurrence';
    id: string;
};
type SupervisorPayloadDeployChain = {
    signal: 'chain_deploy';
    config: ChainConfig;
    data: PipelineData;
};
type SupervisorPayloadPre = {
    signal: 'node_pre';
    config: ChainConfig;
    data?: PipelineData;
};
type SupervisorPayload = SupervisorPayloadSetup | SupervisorPayloadCreate | SupervisorPayloadDelete | SupervisorPayloadRun | SupervisorPayloadSendData | SupervisorPayloadPrepareChain | SupervisorPayloadStartChain | SupervisorPayloadStartPendingChain | SupervisorPayloadDeployChain | SupervisorPayloadPre;
interface ServiceConfig {
    targetId: string;
    meta?: PipelineMeta;
}
declare enum ChildMode {
    NORMAL = "normal",
    PARALLEL = "parallel",
    POST = "post",
    PRE = "pre"
}
type NodeConfig = {
    services: (string | ServiceConfig)[];
    chainId: string;
    index?: number;
    count?: number;
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
type ChainConfig = NodeConfig[];
interface BroadcastSetupMessage {
    signal: NodeSignal.Type;
    chain: {
        id: string;
        config: ChainConfig;
    };
}
interface BroadcastPreMessage {
    signal: NodeSignal.Type;
    chain: {
        config: ChainConfig;
        data?: PipelineData;
    };
}
interface ReportingPayload {
    chainId: string;
    nodeId: string;
    index: number;
    count: number;
}
interface Notification {
    status: ChainStatus.Type;
    signal?: NodeSignal.Type;
    broadcasted?: boolean;
    payload?: unknown;
}
interface ReportingMessage extends ReportingPayload {
    signal: Notification & Partial<NodeStatusMessage>;
}
interface BroadcastReportingMessage extends ReportingPayload {
    signal: Notification;
}
interface NodeStatusMessage extends ReportingPayload {
    signal: NodeSignal.Type;
    payload?: unknown;
}
interface ChainRelation {
    rootNodeId?: string;
    dataRef?: PipelineData;
    config: ChainConfig;
}

declare class Node {
    private id;
    private pipelines;
    private dependencies;
    private status;
    private error?;
    private progress;
    private dataType;
    private executionQueue;
    private output;
    private nextNodeInfo;
    private config;
    private subConfig;
    private subPreConfig;
    private subPreConfigId;
    private subPostConfig;
    private subParallelConfig;
    private reporting;
    private statusManager;
    constructor(dependencies?: string[]);
    private updateProgress;
    setConfig(config: NodeConfig): void;
    enqueueSignals(statusQueue: NodeSignal.Type[], resumePayload?: ResumePayload): Promise<void>;
    getExecutionQueue(): Promise<void>;
    getConfig(): NodeConfig | null;
    getId(): string;
    addPipeline(pipeline: ProcessorPipeline): void;
    private processPipeline;
    private getPipelineGenerator;
    notify(notification: ChainStatus.Type | Notification, type?: ReportingSignalType): void;
    private processChildChain;
    private processPreChain;
    execute(data: any): Promise<void>;
    private processBatch;
    sendData(): Promise<void>;
    private static terminate;
    private static moveToNextNode;
    getProgress(): number;
    canExecute(executedNodes: Set<string>): boolean;
    getDataType(): DataType.Type;
    getStatus(): ChainStatus.Type;
    getDependencies(): string[];
    updateStatus(status: ChainStatus.Type, error?: Error): void;
    getError(): Error | undefined;
    getProcessors(): ProcessorPipeline[];
    setNextNodeInfo(id: string, type: NodeType.Type, meta?: PipelineMeta): void;
    getNextNodeInfo(): {
        id: string;
        type: NodeType.Type;
        meta?: PipelineMeta;
    } | null;
}

declare class NodeSupervisor {
    private uid;
    private ctn;
    private static instance;
    private nodes;
    private chains;
    private childChains;
    private broadcastSetupCallback;
    private broadcastPreCallback;
    nodeStatusCallback: NodeStatusCallback;
    remoteServiceCallback: ServiceCallback;
    private constructor();
    static retrieveService(refresh?: boolean): NodeSupervisor;
    log(type: string): void;
    getChain(chainId: string): ChainRelation | undefined;
    setNodeStatusCallback(nodeStatusCallback: NodeStatusCallback): void;
    setRemoteServiceCallback(remoteServiceCallback: ServiceCallback): void;
    setBroadcastSetupCallback(broadcastSetupCallback: SetupCallback): void;
    setBroadcastPreCallback(broadcastDeployCallback: PreCallback): PreCallback;
    setBroadcastReportingCallback(broadcastReportingCallback: BroadcastReportingCallback): void;
    setMonitoringCallback(reportingCallback: ReportingCallback): void;
    setUid(uid: string): void;
    enqueueSignals(nodeId: string, status: NodeSignal.Type[], resumePayload?: ResumePayload): Promise<void>;
    handleRequest(payload: SupervisorPayload): Promise<void | string>;
    remoteReport(notification: Notification & Partial<NodeStatusMessage>, chainId: string): void;
    private localReport;
    private deployChain;
    private createNode;
    private setupNode;
    handleNotification(chainId: string, notification: Notification): void;
    private notify;
    addProcessors(nodeId: string, processors: PipelineProcessor[]): Promise<void>;
    private deleteNode;
    createChain(config: ChainConfig): string;
    private updateChain;
    private setRemoteMonitoringHost;
    prepareChainDistribution(chainId: string): Promise<void>;
    broadcastNodeSetupSignal(chainId: string, remoteConfigs: ChainConfig): Promise<void>;
    broadcastNodePreSignal(remoteConfigs: ChainConfig, data?: PipelineData): Promise<Object | undefined>;
    startPendingChain(chainId: string): Promise<void>;
    startChain(chainId: string, data?: PipelineData): Promise<void>;
    private runNode;
    runNodeByRelation(payload: CallbackPayload): Promise<void>;
    private sendNodeData;
    getNodes(): Map<string, Node>;
    getNodesByServiceAndChain(serviceUid: string, chainId: string): Node[];
}

declare namespace Ext$4 {
    class MonitoringSignalHandler {
        private static triggerPendingOccurrence;
        static handle(message: ReportingMessage): Promise<void>;
    }
}

declare namespace Ext$3 {
    type ReportSignalHandlerCallback = (message: ReportingMessage) => Promise<void>;
    type MonitoringResolverCallback = (chainId: string) => Promise<string | undefined>;
    interface MCPayload {
        message: ReportingMessage;
        reportSignalHandler: ReportSignalHandlerCallback;
    }
    interface BRCPayload {
        message: BroadcastReportingMessage;
        path: string;
        monitoringResolver: MonitoringResolverCallback;
    }
    const reportingCallback: (payload: MCPayload) => Promise<void>;
    interface DefaultReportingCallbackPayload {
        paths: {
            notify: string;
        };
        reportSignalHandler?: ReportSignalHandlerCallback;
        monitoringResolver?: MonitoringResolverCallback;
    }
    const defaultMonitoringResolver: (chainId: string) => Promise<string | undefined>;
    const setMonitoringCallbacks: (dcPayload: DefaultReportingCallbackPayload) => Promise<void>;
}

declare namespace Ext$2 {
    type HostResolverCallback = (targetId: string, meta?: PipelineMeta) => string | undefined;
    interface BSCPayload {
        message: BroadcastSetupMessage;
        hostResolver: HostResolverCallback;
        path: string;
    }
    interface BDCPayload {
        message: BroadcastPreMessage;
        hostResolver: HostResolverCallback;
        path: string;
    }
    const broadcastSetupCallback: (payload: BSCPayload) => Promise<void>;
    const broadcastPreCallback: (payload: BDCPayload) => Promise<Object | undefined>;
    interface RSCPayload {
        cbPayload: CallbackPayload;
        hostResolver: HostResolverCallback;
        path: string;
    }
    const remoteServiceCallback: (payload: RSCPayload) => Promise<void>;
    interface DefaultCallbackPayload {
        paths: {
            setup: string;
            run: string;
            pre: string;
        };
        hostResolver: HostResolverCallback;
    }
    const setResolverCallbacks: (dcPayload: DefaultCallbackPayload) => Promise<void>;
}

declare namespace Ext$1 {
    type NodeStatusHandlerCallback = (message: any) => Promise<string | undefined>;
    interface DefaultNodeStatusCallbackPayload {
        paths: {
            enqueue: string;
        };
        hostResolver?: NodeStatusHandlerCallback;
    }
    interface NSCPayload {
        message: NodeStatusMessage;
        hostResolver: NodeStatusHandlerCallback;
        path: string;
    }
    const defaultHostResolver: (message: any) => Promise<string | undefined>;
    const setNodeStatusResolverCallbacks: (dcPayload: DefaultNodeStatusCallbackPayload) => Promise<void>;
}

declare namespace Ext {
    type BRCPayload = Ext$3.BRCPayload;
    type MCPayload = Ext$3.MCPayload;
    type BSCPayload = Ext$2.BSCPayload;
    type BDCPayload = Ext$2.BDCPayload;
    type RSCPayload = Ext$2.RSCPayload;
    type NSCPayload = Ext$1.NSCPayload;
    const Monitoring: typeof Ext$4;
    const Reporting: typeof Ext$3;
    const Resolver: typeof Ext$2;
    const NodeStatus: typeof Ext$1;
}

export { type BroadcastPreMessage, type BroadcastSetupMessage, type CallbackPayload, type ChainConfig, type ChainRelation, type ChainState, ChainStatus, ChainType, type CombineFonction, DataType, Ext, type NodeConfig, NodeSignal, NodeSupervisor, NodeType, type PipelineData, type PipelineMeta, PipelineProcessor, type ProcessorCallback, type ProcessorPipeline, type ReportingMessage, type ServiceCallback, type ServiceConfig, type SetupCallback, type SupervisorPayload, type SupervisorPayloadCreate, type SupervisorPayloadDelete, type SupervisorPayloadDeployChain, type SupervisorPayloadPrepareChain, type SupervisorPayloadRun, type SupervisorPayloadSendData, type SupervisorPayloadSetup, type SupervisorPayloadStartChain, type SupervisorPayloadStartPendingChain };
