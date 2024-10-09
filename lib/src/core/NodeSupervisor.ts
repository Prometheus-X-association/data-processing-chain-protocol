import { Node } from './Node';
import {
  Callback,
  NodeSignal,
  NodeStatus,
  PipelineData,
  SupervisorPayload,
  CallbackPayload,
  BrodcastMessage,
} from '../types/types';
import { NodeMonitoring } from './NodeMonitoring';
import { Logger } from '../libs/Logger';
import { NodeProcessor } from './NodeProcessor';
import { randomUUID } from 'node:crypto';

type ChainConfig = {
  services: string[];
  location: 'local' | 'remote';
};

export class NodeSupervisor {
  private uid: string = 'to be set from outside';
  private static instance: NodeSupervisor;
  private nodes: Map<string, Node>;
  private nodeMonitoring?: NodeMonitoring;
  private broadcastFunction: (message: any) => Promise<void> = async () => {};
  private chainConfig: ChainConfig[] = [];
  callbackOutput: Callback;

  constructor() {
    this.nodes = new Map();
    this.callbackOutput = (_payload: CallbackPayload) => {};
  }

  setCallbackOutput(callback: Callback): void {
    this.callbackOutput = callback;
  }

  setMonitoring(nodeMonitoring: NodeMonitoring): void {
    this.nodeMonitoring = nodeMonitoring;
  }

  setBroadcastFunction(
    broadcastFunction: (message: any) => Promise<void>,
  ): void {
    this.broadcastFunction = broadcastFunction;
  }

  setChainConfig(config: ChainConfig[]): void {
    this.chainConfig = config;
  }

  public static retrieveService(): NodeSupervisor {
    if (!NodeSupervisor.instance) {
      const instance = new NodeSupervisor();
      NodeSupervisor.instance = instance;
    }
    return NodeSupervisor.instance;
  }

  async handleRequest(payload: SupervisorPayload): Promise<void | string> {
    switch (payload.signal) {
      case NodeSignal.NODE_CREATE:
        return this.createNode(payload.params);
      case NodeSignal.NODE_DELETE:
        return this.deleteNode(payload.id);
      case NodeSignal.NODE_PAUSE:
        return this.pauseNode(payload.id);
      case NodeSignal.NODE_DELAY:
        return this.delayNode(payload.id, payload.delay);
      case NodeSignal.NODE_RUN:
        return await this.runNode(payload.id, payload.data);
      case NodeSignal.NODE_SEND_DATA:
        return await this.sendNodeData(payload.id);
      default:
        Logger.warn({
          message: `Unknown signal received: ${payload.signal}`,
        });
    }
  }

  private async createNode(dependencies: string[] = []): Promise<string> {
    const node = new Node(dependencies);
    const nodeId = node.getId();
    this.nodes.set(nodeId, node);
    if (this.nodeMonitoring) {
      this.nodeMonitoring.addNode(node);
    }
    Logger.info({ message: `Node ${nodeId} created.` });
    return nodeId;
  }

  async addProcessors(
    nodeId: string,
    processors: NodeProcessor[],
  ): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.addPipeline(processors);
      Logger.info({ message: `Processors added to Node ${nodeId}.` });
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  private async deleteNode(nodeId: string): Promise<void> {
    if (this.nodes.has(nodeId)) {
      this.nodes.delete(nodeId);
      if (this.nodeMonitoring) {
        this.nodeMonitoring.removeNode(nodeId);
      }
      Logger.info({ message: `Node ${nodeId} deleted.` });
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  private async pauseNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.updateStatus(NodeStatus.PAUSED);
      Logger.info({ message: `Node ${nodeId} paused.` });
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  private async delayNode(nodeId: string, delay: number): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.setDelay(delay);
      Logger.info({ message: `Node ${nodeId} delayed by ${delay} ms.` });
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  async startChain(): Promise<void> {
    const localConfigs = this.chainConfig.filter(
      (config) => config.location === 'local',
    );
    const remoteConfigs = this.chainConfig.filter(
      (config) => config.location === 'remote',
    );

    for (const config of localConfigs) {
      // Todo: pass chain info to node
      await this.createNode();
    }

    if (remoteConfigs.length > 0) {
      await this.broadcastNodeCreationSignal();
    }
  }

  async broadcastNodeCreationSignal(): Promise<void> {
    const timestamp = Date.now();
    const chainId = `${this.uid}-${timestamp}-${randomUUID().slice(0, 8)}`;

    const message: BrodcastMessage = {
      signal: NodeSignal.NODE_CREATE,
      chain: {
        id: chainId,
        config: this.chainConfig.map((config) => ({
          services: config.services,
        })),
      },
    };

    try {
      await this.broadcastFunction(message);
      Logger.info({
        message: `Node creation signal broadcasted with chainId: ${chainId}`,
      });
    } catch (error) {
      Logger.error({
        message: `Failed to broadcast node creation signal: ${error}`,
      });
    }
  }

  // Todo: move data to a dedicated input method
  private async runNode(nodeId: string, data: PipelineData): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      await node.execute(data);
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  private async sendNodeData(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (node) {
      try {
        await node.sendData();
      } catch (err) {
        const error = err as Error;
        Logger.error({
          message: `Node ${nodeId} execution failed: ${error.message}`,
        });
      }
    } else {
      Logger.warn({ message: `Node ${nodeId} not found.` });
    }
  }

  getNodes(): Map<string, Node> {
    return this.nodes;
  }
}

export default NodeSupervisor.retrieveService();