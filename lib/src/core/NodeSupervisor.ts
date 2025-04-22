import { Node } from './Node';
import {
  BroadcastPreMessage,
  BroadcastReportingCallback,
  BroadcastSetupMessage,
  CallbackPayload,
  ChainConfig,
  ChainRelation,
  ChainStatus,
  ChildMode,
  DefaultCallback,
  NodeConfig,
  NodeSignal,
  NodeStatusCallback,
  NodeStatusMessage,
  NodeType,
  Notification,
  PipelineData,
  PreCallback,
  ReportingCallback,
  ReportingSignalType,
  ResumePayload,
  ServiceCallback,
  ServiceConfig,
  SetupCallback,
  SupervisorPayload,
} from '../types/types';
import { Logger } from '../utils/Logger';
import { PipelineProcessor } from './PipelineProcessor';
import { randomUUID } from 'node:crypto';
import { MonitoringAgent } from '../agents/MonitoringAgent';

// import { NodeSupervisorLogger } from './NodeSupervisorLogger';

/**
 * Manages the lifecycle and distribution of nodes within a processing chain
 */
export class NodeSupervisor {
  private uid: string;
  private ctn: string;
  private static instance: NodeSupervisor;
  // private nsLogger: NodeSupervisorLogger;
  private nodes: Map<string, Node>; // local nodes
  private chains: Map<string, ChainRelation>; // local chains
  private childChains: Map<string, string[]>; // map children to parents
  private broadcastSetupCallback: SetupCallback;
  private broadcastPreCallback: PreCallback;
  nodeStatusCallback: NodeStatusCallback;
  remoteServiceCallback: ServiceCallback;

  /**
   * Creates a new NodeSupervisor instance
   * @private
   */
  private constructor() {
    this.uid = '@supervisor:default';
    this.ctn = '@container:default';
    // this.nsLogger = new NodeSupervisorLogger();
    this.nodes = new Map();
    this.chains = new Map();
    this.childChains = new Map();
    this.remoteServiceCallback = DefaultCallback.SERVICE_CALLBACK;
    this.broadcastSetupCallback = DefaultCallback.SETUP_CALLBACK;
    this.broadcastPreCallback = DefaultCallback.PRE_CALLBACK;
    this.nodeStatusCallback = DefaultCallback.NODE_STATUS_CALLBACK;
  }

  /**
   * Retrieves or creates a NodeSupervisor instance (Singleton pattern)
   * @param {boolean} refresh - Whether to force create a new instance
   * @returns {NodeSupervisor} The NodeSupervisor instance
   */
  static retrieveService(refresh: boolean = false): NodeSupervisor {
    if (!NodeSupervisor.instance || refresh) {
      const instance = new NodeSupervisor();
      NodeSupervisor.instance = instance;
    }
    return NodeSupervisor.instance;
  }

  /**
   * Logs information based on the specified type.
   * @param {string} type - The type of log to generate ('chains' or 'monitoring-workflow`).
   */
  log(type: string) {
    switch (type) {
      case 'chains':
        // this.nsLogger.logChains(this.chains);
        break;
      case 'monitoring-workflow': {
        const monitoring = MonitoringAgent.retrieveService();
        const workflow = monitoring.getWorkflow();
        // this.nsLogger.logWorkflow(workflow);
        break;
      }
      default: {
        break;
      }
    }
  }

  /**
   * Retrieves the chain relation for the given chain ID.
   * @param {string} chainId - The identifier of the chain.
   * @returns {ChainRelation | undefined} The chain relation or undefined if not found.
   */
  getChain(chainId: string): ChainRelation | undefined {
    return this.chains.get(chainId);
  }

  /**
   * Sets the callback function for node status updates.
   * @param {NodeStatusCallback} nodeStatusCallback - The callback to handle node status changes.
   */
  setNodeStatusCallback(nodeStatusCallback: NodeStatusCallback): void {
    this.nodeStatusCallback = nodeStatusCallback;
  }

  /**
   * Sets the remote service callback function
   * @param {ServiceCallback} remoteServiceCallback - The callback to handle remote service calls
   */
  setRemoteServiceCallback(remoteServiceCallback: ServiceCallback): void {
    this.remoteServiceCallback = remoteServiceCallback;
  }

  /**
   * Sets the broadcast setup callback function
   * @param {SetupCallback} broadcastSetupCallback - The callback to handle broadcast setup signals
   */
  setBroadcastSetupCallback(broadcastSetupCallback: SetupCallback): void {
    this.broadcastSetupCallback = broadcastSetupCallback;
  }

  /**
   * Sets the broadcast setup callback function
   * @param broadcastDeployCallback
   */
  setBroadcastPreCallback(broadcastDeployCallback: PreCallback): PreCallback {
    this.broadcastPreCallback = broadcastDeployCallback;
    return this.broadcastPreCallback;
  }

  /**
   * Sets the broadcast reporting callback function
   * @param {BroadcastReportingCallback} broadcastReportingCallback - The callback to handle broadcast reporting signals
   */
  setBroadcastReportingCallback(
    broadcastReportingCallback: BroadcastReportingCallback,
  ): void {
    const monitoring = MonitoringAgent.retrieveService();
    monitoring.setBroadcastReportingCallback(broadcastReportingCallback);
  }

  /**
   * Sets the monitoring reporting callback function
   * @param {ReportingCallback} reportingCallback - The callback to handle monitoring reports
   */
  setMonitoringCallback(reportingCallback: ReportingCallback): void {
    const monitoring = MonitoringAgent.retrieveService();
    monitoring.setReportingCallback(reportingCallback);
  }

  /**
   * Sets the unique identifier for this supervisor instance
   * @param {string} uid - The unique identifier
   */
  setUid(uid: string) {
    this.ctn = `@container:${uid}`;
    this.uid = `@supervisor:${uid}`;
  }

  /**
   * Enqueues signals for a specific node to process.
   * @param {string} nodeId - The identifier of the node.
   * @param {NodeSignal.Type[]} status - The signals to enqueue.
   * @param resumePayload
   * @returns {Promise<void>} A promise that resolves when the signals are enqueued.
   */
  async enqueueSignals(
    nodeId: string,
    status: NodeSignal.Type[],
    resumePayload?: ResumePayload,
  ): Promise<void> {
    return this.nodes.get(nodeId)?.enqueueSignals(status, resumePayload);
  }

  /**
   * Handles supervisor requests (node setup, creation, deletion, etc.)
   * @param {SupervisorPayload} payload - The request payload
   * @returns {Promise<void|string>} Promise resolving to a string if applicable
   */
  async handleRequest(payload: SupervisorPayload): Promise<void | string> {
    switch (payload.signal) {
      case NodeSignal.NODE_SETUP:
        Logger.event(`handle NODE_SETUP`);
        return await this.setupNode(payload.config);
      case NodeSignal.NODE_CREATE:
        Logger.event(`handle NODE_CREATE`);
        return await this.createNode(payload.params);
      case NodeSignal.NODE_DELETE:
        Logger.event(`handle NODE_DELETE`);
        return await this.deleteNode(payload.id);
      case NodeSignal.NODE_RUN:
        Logger.event(`handle NODE_RUN`);
        return await this.runNode(payload.id, payload.data);
      case NodeSignal.NODE_SEND_DATA:
        Logger.event(`handle NODE_SEND_DATA`);
        return await this.sendNodeData(payload.id);
      case NodeSignal.CHAIN_PREPARE:
        Logger.event(`handle CHAIN_PREPARE`);
        return await this.prepareChainDistribution(payload.id);
      case NodeSignal.CHAIN_START:
        Logger.event(`handle CHAIN_START`);
        return await this.startChain(payload.id, payload.data);
      case NodeSignal.CHAIN_START_PENDING_OCCURRENCE:
        Logger.event(`handle CHAIN_START_PENDING_OCCURRENCE`);
        return await this.startPendingChain(payload.id);
      case NodeSignal.CHAIN_DEPLOY: {
        Logger.event(`handle CHAIN_DEPLOY`);
        return await this.deployChain(payload.config, payload.data);
      }
      default:
        Logger.warn(
          `${this.ctn}: Unknown signal received: ${JSON.stringify(payload, null, 2)}`,
        );
    }
  }

  /**
   * Reports a notification remotely for a specific chain.
   * @param {Notification & Partial<NodeStatusMessage>} notification - The notification to report.
   * @param {string} chainId - The identifier of the chain.
   */
  remoteReport(
    notification: Notification & Partial<NodeStatusMessage>,
    chainId: string,
  ) {
    const monitoring = MonitoringAgent.retrieveService();
    const reporting = monitoring.genReportingAgent({
      chainId,
      nodeId: 'supervisor-remote',
      index: 1,
      count: -1,
    });
    reporting.notify(notification, 'global-signal');
  }

  /**
   * Reports a local status update for a specific chain.
   * @param {ChainStatus.Type} status - The status to report.
   * @param {string} chainId - The identifier of the chain.
   */
  private localReport(status: ChainStatus.Type, chainId: string) {
    const monitoring = MonitoringAgent.retrieveService();
    const reporting = monitoring.genReportingAgent({
      chainId,
      nodeId: 'supervisor',
      index: -1,
      count: -1,
    });
    reporting.notify({ status }, 'local-signal');
  }

  /**
   * Deploys a new processing chain
   * @param {ChainConfig} config - Configuration for the new chain
   * @param {PipelineData} data - Initial data to start the chain
   * @returns {Promise<string>} The new chain identifier
   */
  private async deployChain(
    config: ChainConfig,
    data: PipelineData,
    parentChainId?: string,
  ): Promise<string> {
    try {
      if (!config) {
        throw new Error(`${this.ctn}: Chain configuration is required`);
      }
      Logger.info(`${this.ctn}: Starting a new chain deployment...`);
      const chainId = this.createChain(config);
      await this.prepareChainDistribution(chainId);
      const chain = this.chains.get(chainId);
      if (chain) {
        chain.dataRef = data;
      }
      Logger.info(
        `${this.ctn}: Deployment for chain ${chainId} has successfully started...`,
      );
      if (parentChainId) {
        const children = this.childChains.get(parentChainId) || [];
        children.push(chainId);
        this.childChains.set(parentChainId, children);
      }
      this.localReport(ChainStatus.CHAIN_DEPLOYED, chainId);
      return chainId;
    } catch (error) {
      Logger.error(`${this.ctn}{deployChain}: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Creates a new node with the given configuration
   * @param {NodeConfig} config - The node configuration
   * @returns {Promise<string>} The new node identifier
   */
  private async createNode(config: NodeConfig): Promise<string> {
    const node = new Node();
    const nodeId = node.getId();
    node.setConfig(config);
    this.nodes.set(nodeId, node);
    Logger.info(
      `${this.ctn}: Node ${nodeId} created with config: ${JSON.stringify(config, null, 2)}`,
    );
    return nodeId;
  }

  /**
   * Sets up a new node with the given configuration
   * @param {NodeConfig} config - The node configuration
   * @param {boolean} initiator - Whether the node is the chain initiator
   * @returns {Promise<string>} The new node identifier
   */
  private async setupNode(
    config: NodeConfig,
    initiator: boolean = false,
  ): Promise<string> {
    this.updateChain([config]);
    const nodeId = await this.createNode(config);
    const node = this.nodes.get(nodeId);

    if (!node) {
      Logger.warn(`${this.ctn}: Attempted to setup undefined node`);
      return nodeId;
    }

    Logger.header(`Setup node ${node?.getId()}...`);
    await this.setRemoteMonitoringHost(config);

    const processors = config.services.map(
      (service) =>
        new PipelineProcessor(
          typeof service === 'string' ? { targetId: service } : service,
        ),
    );
    await this.addProcessors(nodeId, processors);
    Logger.info(
      `${this.ctn}: Node ${nodeId} setup completed with ${processors.length} processors`,
    );

    if (config.nextTargetId !== undefined) {
      node.setNextNodeInfo(
        config.nextTargetId,
        NodeType.REMOTE,
        config.nextMeta,
      );
    } else if (!initiator) {
      Logger.warn(
        `${this.ctn}: Cannot set next node info: nextTargetId is undefined`,
      );
    }
    //
    this.notify(nodeId, ChainStatus.NODE_SETUP_COMPLETED, 'global-signal');
    return nodeId;
  }

  /**
   * Handles externals notifications about a chain status change
   * @param {string} chainId - The chain identifier
   * @param {Notification} notification - The new chain status notification
   */
  handleNotification(chainId: string, notification: Notification): void {
    try {
      const chain = this.chains.get(chainId);
      if (!chain) {
        Logger.warn(`${this.ctn}: Chain with ID ${chainId} not found.`);
        return;
      }
      const rootNodeId = chain.rootNodeId;
      if (!rootNodeId) {
        Logger.warn(`${this.ctn}: Root node ID missing for chain ${chainId}.`);
        return;
      }
      const node = this.nodes.get(rootNodeId);
      if (!node) {
        Logger.warn(`${this.ctn}: Node with ID ${rootNodeId} not found.`);
        return;
      }
      Logger.info(
        `${this.ctn}:\n\t\tSending notification to node ${rootNodeId}` +
          `\n\t\twith status ${JSON.stringify(notification)}.`,
      );
      node.notify(notification, 'global-signal');
    } catch (error) {
      Logger.error(
        `${this.ctn}: Failed to handle notification for chain ${chainId}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Notifies a node about a chain status change
   * @param {string} nodeId - The node identifier to notify
   * @param {ChainStatus.Type} status - The new chain status to notify
   * @param {ReportingSignalType} type - The type of reporting signal
   */
  private notify(
    nodeId: string,
    status: ChainStatus.Type,
    type: ReportingSignalType = 'local-signal',
  ): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.notify(status, type);
    } else {
      Logger.warn(`${this.ctn}: Can't notify non-existing node ${nodeId}`);
    }
  }

  /**
   * Adds processors to a node
   * @param {string} nodeId - The node identifier
   * @param {PipelineProcessor[]} processors - Array of processors to add
   */
  async addProcessors(
    nodeId: string,
    processors: PipelineProcessor[],
  ): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.addPipeline(processors);
      Logger.info(`${this.ctn}: Processors added to Node ${nodeId}.`);
    } else {
      Logger.warn(`${this.ctn}: Node ${nodeId} not found.`);
    }
  }

  /**
   * Deletes a node
   * @param {string} nodeId - The node identifier to delete
   */
  private async deleteNode(nodeId: string): Promise<void> {
    if (this.nodes.has(nodeId)) {
      this.nodes.delete(nodeId);
      Logger.info(`${this.ctn}: Node ${nodeId} deleted.`);
    } else {
      Logger.warn(`${this.ctn}: Node ${nodeId} not found.`);
    }
  }

  /**
   * Creates a new chain with the given configuration
   * @param {ChainConfig} config - The chain configuration
   * @returns {string} The new chain identifier
   */
  createChain(config: ChainConfig): string {
    try {
      if (!config || !Array.isArray(config)) {
        throw new Error('Invalid chain configuration: config must be an array');
      }
      const timestamp = Date.now();
      const chainId = `${this.uid}-${timestamp}-${randomUUID().slice(0, 8)}`;
      const relation: ChainRelation = {
        config,
      };

      this.chains.set(chainId, relation);

      let monitoringHost = config[0].rootConfig
        ? config[0].rootConfig.monitoringHost
        : config[0]?.monitoringHost;

      const count = Array.isArray(config) ? config.length : 0;

      if (count > 0) {
        config.forEach((value: NodeConfig, index: number) => {
          if (value) {
            value.index = index;
            value.count = count;
            value.monitoringHost = monitoringHost;
          }
        });
      } else {
        Logger.warn(`${this.ctn}: Chain configuration is empty`);
      }

      Logger.header(`${this.ctn}:\n\tChain ${chainId} creation has started...`);
      return chainId;
    } catch (error) {
      Logger.header(`${this.ctn}{createChain}:\n\t${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Updates an existing chain with new configurations
   * @param {ChainConfig} config - The new chain configurations to add
   * @returns {string} The chain identifier
   */
  private updateChain(config: ChainConfig): string {
    if (config.length === 0 || !config[0].chainId) {
      throw new Error('Invalid chain configuration');
    }
    const chainId = config[0].chainId;
    let relation = this.chains.get(chainId);

    if (relation) {
      // todo: to be reviewed
      relation.config = relation.config.concat(config);
      Logger.info(
        `${this.ctn}: Chain ${chainId} updated with ${config.length} new configurations`,
      );
    } else {
      relation = {
        config: config,
      };
      this.chains.set(chainId, relation);
      Logger.info(
        `${this.ctn}: Chain ${chainId} created with ${config.length} configurations`,
      );
    }
    return chainId;
  }

  /**
   * Sets the remote monitoring host for a chain
   * @param {NodeConfig} config - The node configuration containing the monitoring host
   */
  private async setRemoteMonitoringHost(config: NodeConfig): Promise<void> {
    const remoteMonitoringHost = config.monitoringHost;
    if (!remoteMonitoringHost) {
      throw new Error(
        `${this.ctn}: No Monitoring Host set for Chain ${config.chainId} during distribution`,
      );
    }
    const monitoring = MonitoringAgent.retrieveService();
    monitoring.setRemoteMonitoringHost(config.chainId, remoteMonitoringHost);
  }

  /**
   * Prepares the distribution of a processing chain
   * @param {string} chainId - The chain identifier
   */
  async prepareChainDistribution(chainId: string): Promise<void> {
    try {
      Logger.header(
        `${this.ctn}:\n\tChain distribution for ${chainId} in progress...`,
      );
      const chain = this.chains.get(chainId);
      if (!chain) {
        throw new Error(`${this.ctn}: Chain ${chainId} not found`);
      }
      const chainConfig: ChainConfig = chain.config;
      const localConfigs: NodeConfig[] = chainConfig.filter(
        (config) => config.location === 'local',
      );
      const remoteConfigs: NodeConfig[] = chainConfig.filter(
        (config) => config.location === 'remote',
      );

      if (!localConfigs) {
        Logger.warn('Local config undefined');
      }

      if (localConfigs.length > 0) {
        const rootNodeId = await this.setupNode(
          { ...localConfigs[0], chainId },
          true,
        );
        chain.rootNodeId = rootNodeId;

        let prevNodeId = rootNodeId;
        for (let i = 1; i < localConfigs.length; i++) {
          const currentNodeId = await this.setupNode(
            {
              ...localConfigs[i],
              chainId,
            },
            true,
          );
          const prevNode = this.nodes.get(prevNodeId);
          if (prevNode) {
            prevNode.setNextNodeInfo(currentNodeId, NodeType.LOCAL);
          }
          prevNodeId = currentNodeId;
        }

        if (!remoteConfigs) {
          Logger.warn('Remote config undefined');
        }

        // Set the last local node to point to the first remote service
        if (remoteConfigs.length > 0 && remoteConfigs[0].services.length > 0) {
          const lastLocalNode = this.nodes.get(prevNodeId);
          if (lastLocalNode) {
            const nextService = remoteConfigs[0].services[0];
            lastLocalNode.setNextNodeInfo(
              typeof nextService === 'string'
                ? nextService
                : nextService.targetId,
              NodeType.REMOTE,
              typeof nextService === 'string' ? void 0 : nextService.meta,
            );
          }
        }
      } else {
        Logger.warn(
          `${this.ctn}: No local config found for chain ${chainId}. Root node unavailable.`,
        );
      }
      try {
        if (remoteConfigs.length > 0) {
          const updatedRemoteConfigs: NodeConfig[] = remoteConfigs.map(
            (config, index) => {
              const nextConfig: string | ServiceConfig =
                remoteConfigs[index + 1]?.services[0];
              const nodeConfig: NodeConfig = {
                ...config,
                nextTargetId: nextConfig
                  ? typeof nextConfig === 'string'
                    ? nextConfig
                    : nextConfig.targetId
                  : undefined,
                nextNodeResolver: nextConfig
                  ? typeof nextConfig === 'string'
                    ? nextConfig
                    : nextConfig.meta?.resolver
                  : undefined,
                nextMeta:
                  nextConfig && typeof nextConfig !== 'string'
                    ? nextConfig.meta
                    : undefined,
              };
              return nodeConfig;
            },
          );
          await this.broadcastNodeSetupSignal(chainId, updatedRemoteConfigs);
        }
      } catch (error) {
        Logger.error(
          `${this.ctn}{prepareChainDistribution, broadcast}: ${(error as Error).message}`,
        );
      }
    } catch (error) {
      Logger.error(
        `${this.ctn}{prepareChainDistribution}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Broadcasts a setup signal for remote nodes in a chain
   * @param {string} chainId - The chain identifier
   * @param {ChainConfig} remoteConfigs - The remote node configurations
   */
  async broadcastNodeSetupSignal(
    chainId: string,
    remoteConfigs: ChainConfig,
  ): Promise<void> {
    const message: BroadcastSetupMessage = {
      signal: NodeSignal.NODE_SETUP,
      chain: {
        id: chainId,
        config: remoteConfigs,
      },
    };

    try {
      await this.broadcastSetupCallback(message);
      Logger.info(
        `${this.ctn}: Node creation signal broadcasted with chainId: ${chainId} for remote configs`,
      );
    } catch (error) {
      Logger.error(
        `${this.ctn}: Failed to broadcast node creation signal: ${error}`,
      );
    }
  }


  /**
   * Broadcasts a deploy signal for sub chain
   * @param {ChainConfig} remoteConfigs - The remote node configurations
   * @param data
   */
  async broadcastNodePreSignal(
    remoteConfigs: ChainConfig,
    data?: PipelineData,
  ): Promise<Object | undefined> {
    const message: BroadcastPreMessage = {
      signal: NodeSignal.NODE_PRE,
      chain: {
        config: remoteConfigs,
        data
      },
    };

    try {
      Logger.info(
        `${this.ctn}: Node creation signal broadcasted with chainId: ${remoteConfigs[0].chainId} for remote configs`,
      );
      return await this.broadcastPreCallback(message);
    } catch (error) {
      Logger.error(
        `${this.ctn}: Failed to broadcast node creation signal: ${error}`,
      );
    }
  }

  /**
   * Starts a pending chain
   * @param {string} chainId - The chain identifier
   */
  async startPendingChain(chainId: string) {
    const chain = this.chains.get(chainId);
    const data = chain?.dataRef;

    if (data) {
      const rootConfig = chain?.config[0]?.rootConfig;
      if (rootConfig) {
        const rootNodeId = chain?.rootNodeId;
        if (!rootNodeId) {
          // Logger.error(
          //   `${this.ctn}: Root node ID for chain ${chainId} not found.`,
          // );
          throw new Error('Root node ID not found');
        }
        const chainMode =
          chain?.config[0]?.rootConfig?.childMode === 'parallel'
            ? 'parallel'
            : 'serial';

        if (chainMode === ChildMode.PARALLEL) {
          // Logger.warn(`// Starting parallel child chain: ${chainId}`);
          this.notify(
            rootNodeId,
            ChainStatus.CHILD_CHAIN_STARTED,
            'global-signal',
          );

          this.startChain(chainId, data)
            .then(() =>
              this.notify(
                rootNodeId,
                ChainStatus.CHILD_CHAIN_COMPLETED,
                'global-signal',
              ),
            )
            .catch((error) => {
              // Logger.error(`Failed to start parallel child chain: ${error}`);
            });
        } else {
          // Logger.warn(`__ Starting serial child chain: ${chainId}`);
          await this.startChain(chainId);
          this.notify(
            rootNodeId,
            ChainStatus.CHILD_CHAIN_COMPLETED,
            'global-signal',
          );
        }
      } else {
        await this.startChain(chainId, data);
      }
    } else {
      await this.startChain(chainId);
      Logger.warn(`${this.ctn}:\n\tNothing to process on chain ${chainId}`);
    }
  }

  /**
   * Starts a new chain
   * @param {string} chainId - The chain identifier
   * @param {PipelineData} data - The initial data to process
   */
  async startChain(chainId: string, data?: PipelineData): Promise<void> {
    Logger.header(`<<Start Chain>>: Chain ${chainId} requested...`);
    Logger.info(`Data: ${JSON.stringify(data, null, 2)}`);
    const chain = this.chains.get(chainId);
    if (!chain) {
      Logger.warn(`Chain ${chainId} not found.`);
      return;
    }
    const rootNodeId = chain.rootNodeId;
    if (!rootNodeId) {
      Logger.error(`${this.ctn}: Root node ID for chain ${chainId} not found.`);
      return;
    }

    const rootNode = this.nodes.get(rootNodeId);

    if (!rootNode) {
      Logger.error(
        `${this.ctn}: Root node ${rootNodeId} for chain ${chainId} not found.`,
      );
      return;
    }

    try {
      await this.runNode(rootNodeId, data);
      Logger.info(
        `${this.ctn}: Chain ${chainId} started with root node ${rootNodeId}.`,
      );
    } catch (error) {
      Logger.error(`${this.ctn}: Failed to start chain ${chainId}: ${error}`);
    }
  }

  /**
   * Executes a node with the given data
   * @param {string} nodeId - The node identifier
   * @param {PipelineData} data - The data to process
   */
  private async runNode(nodeId: string, data: PipelineData): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.execute(data);
    } else {
      Logger.warn(`${this.ctn}: Node ${nodeId} not found.`);
    }
  }

  /**
   * Executes a node based on the given callback payload
   * @param {CallbackPayload} payload - The payload containing target ID, chain ID, and data
   */
  async runNodeByRelation(payload: CallbackPayload): Promise<void> {
    try {
      const { targetId, chainId, data } = payload;
      Logger.info(`Received data for node hosting target ${targetId}`);
      if (chainId === undefined) {
        throw new Error('chainId is undefined');
      }
      if (targetId === undefined) {
        throw new Error('targetId is undefined');
      }
      const node = this.getNodesByServiceAndChain(targetId, chainId);
      if (!node || node.length === 0) {
        throw new Error(
          `No node found for targetId ${targetId} and chainId ${chainId}`,
        );
      }
      const nodeId = node[0].getId();
      if (nodeId === undefined) {
        throw new Error(
          `No node ID exists for targetId ${targetId} and chainId ${chainId}`,
        );
      }
      await this.handleRequest({
        signal: NodeSignal.NODE_RUN,
        id: nodeId,
        data: data as PipelineData,
      });
    } catch (error) {
      // Logger.error(`Error in runNodeByRelation: ${(error as Error).message}`);
    }
  }

  /**
   * Sends data from a node
   * @param {string} nodeId - The node identifier
   */
  private async sendNodeData(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      try {
        await node.sendData();
      } catch (err) {
        const error = err as Error;
        // Logger.error(
        //   `${this.ctn}: Node ${nodeId} send data failed: ${error.message}`,
        // );
      }
    } else {
      // Logger.warn(`${this.ctn}: Node ${nodeId} not found.`);
    }
  }

  /**
   * Gets all the nodes managed by this supervisor
   * @returns {Map<string, Node>} Map of nodes
   */
  getNodes(): Map<string, Node> {
    return this.nodes;
  }

  /**
   * Gets all nodes associated with a specific service and chain
   * @param {string} serviceUid - The service identifier
   * @param {string} chainId - The chain identifier
   * @returns {Node[]} Array of nodes matching the criteria
   */
  getNodesByServiceAndChain(serviceUid: string, chainId: string): Node[] {
    return Array.from(this.nodes.values()).filter((node) => {
      const nodeConfig = node.getConfig();
      if (!nodeConfig) {
        return false;
      }
      return (
        nodeConfig.chainId === chainId &&
        nodeConfig.services.some((service) =>
          typeof service === 'string'
            ? service === serviceUid
            : service.targetId === serviceUid,
        )
      );
    });
  }
}
