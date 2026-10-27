import {
  DefaultCallback,
  ReportingCallback,
  ReportingMessage,
  ReportingPayload,
} from '../types/types';
import { Logger } from '../utils/Logger';
import { Agent } from './Agent';
import { ReportingAgentBase } from './ReportingAgent';

/**
 * Class for a node monitoring and status reporting agent
 */
export class ReportingAgent extends ReportingAgentBase {
  /**
   * Creates a new ReportingAgent instance
   * @param {string} chainId - The chain identifier
   * @param {string} nodeId - The node identifier
   */
  constructor(
    // eslint-disable-next-line no-unused-vars
    readonly chainId: string,
    // eslint-disable-next-line no-unused-vars
    readonly nodeId: string,
  ) {
    super();
  }
}

export interface MonitoringChainStatus {
  [key: string]: {
    [key: string]: boolean;
  };
}
export interface WorkflowNode {
  status?: MonitoringChainStatus;
  setupCount?: number;
  setupCompleted?: boolean;
  deployed?: boolean;
}

export interface Workflow {
  [key: string]: WorkflowNode;
}

/**
 * Responsible for managing all reporting agents and the monitoring of nodes within a processing chain
 */
export class MonitoringAgent extends Agent {
  private static instance: MonitoringAgent;
  private reportingCallback: ReportingCallback;
  private broadcastReportingCallback: ReportingCallback;
  private readonly remoteMonitoringHost: Map<string, string>;
  private workflow: Workflow;

  /**
   * Creates a new MonitoringAgent instance
   */
  constructor() {
    super();
    this.workflow = {};
    this.remoteMonitoringHost = new Map();
    this.reportingCallback = DefaultCallback.REPORTING_CALLBACK;
    this.broadcastReportingCallback =
      DefaultCallback.BROADCAST_REPORTING_CALLBACK;
  }

  /**
   * Retrieves the current workflow object
   * @returns {Workflow} The current workflow object
   */
  getWorkflow(): Workflow {
    return this.workflow;
  }

  /**
   * Retrieves or creates a MonitoringAgent instance (Singleton pattern)
   * @param {boolean} refresh - Whether to force create a new instance
   * @returns {MonitoringAgent} The MonitoringAgent instance
   */
  static retrieveService(refresh: boolean = false): MonitoringAgent {
    if (!MonitoringAgent.instance || refresh) {
      const instance = new MonitoringAgent();
      MonitoringAgent.instance = instance;
    }
    return MonitoringAgent.instance;
  }

  /**
   * Sets the reporting callback function
   * @param {ReportingCallback} reportingCallback - The callback function to handle reports
   */
  setReportingCallback(reportingCallback: ReportingCallback): void {
    this.reportingCallback = reportingCallback;
  }

  /**
   * Sets the broadcast reporting callback function
   * @param {ReportingCallback} broadcastReportingCallback - The callback function to handle broadcast reports
   */
  setBroadcastReportingCallback(
    broadcastReportingCallback: ReportingCallback,
  ): void {
    this.broadcastReportingCallback = broadcastReportingCallback;
  }

  /**
   * Gets the remote monitoring host for a specific chain
   * @param {string} chainId - The chain identifier
   * @returns {string|undefined} The remote monitoring host address if exists
   */
  getRemoteMonitoringHost(chainId: string): string | undefined {
    return this.remoteMonitoringHost.get(chainId);
  }

  /**
   * Sets the remote monitoring host for a specific chain
   * @param {string} chainId - The chain identifier
   * @param {string} remoteMonitoringHost - The remote monitoring host address
   */
  setRemoteMonitoringHost(chainId: string, remoteMonitoringHost: string): void {
    this.remoteMonitoringHost.set(chainId, remoteMonitoringHost);
  }

  /**
   * Generates a new ReportingAgent instance
   * @param {ReportingPayload} payload - The reporting payload containing chainId, nodeId and index
   * @returns {ReportingAgent} A new ReportingAgent instance
   */
  genReportingAgent(payload: ReportingPayload): ReportingAgent {
    const { chainId, nodeId, index } = payload;
    ReportingAgent.authorize(this);
    const reporting = new ReportingAgent(chainId, nodeId);
    // Handle global-signal
    // This is the main process for redirecting signals and communicating with the
    // entire context. It is called after any global notification
    // todo: add type for signals
    reporting.on('global-signal', async (signal) => {
      Logger.event(
        'Receive global-signal:\n' +
          `\t\t\t\t${JSON.stringify(signal)}\n` +
          `\t\t\t\tfor node ${nodeId}\n`,
      );
      const message: ReportingMessage = { ...payload, signal };
      if (index > 0) {
        // Report message to distant monitoring host
        signal.broadcasted = true;
        void this.broadcastReportingCallback(message);
      } else {
        // Report message to monitoring
        await this.reportingCallback(message);
      }
    });

    // handle local signal for a specific node on a specific chain
    reporting.on('local-signal', async (signal) => {
      Logger.event(
        'Receive local-signal:\n' +
          `\t\t\t\t${JSON.stringify(signal)}\n` +
          `\t\t\t\tfor node ${nodeId} in chain ${chainId}\n`,
      );
      const message: ReportingMessage = { ...payload, signal };
      const update: MonitoringChainStatus = {
        [message.nodeId]: { [message.signal.status]: true },
      };
      if (!this.workflow[message.chainId]) {
        this.workflow[message.chainId] = {};
      }
      const prev = this.workflow[message.chainId].status || {};
      const next = { ...prev, ...update };
      this.workflow[message.chainId].status = next;

      if (nodeId === 'supervisor') {
        // Report message to monitoring
        await this.reportingCallback(message);
      }
    });
    return reporting;
  }

  /**
   * Gets the status for a specific chain
   * @param {string} chainId - The chain identifier
   * @returns {ChainStatus|undefined} The chain status if exists
   */
  getChainStatus(chainId: string): MonitoringChainStatus | undefined {
    return this.workflow[chainId]?.status;
  }

  /**
   * Sets the setup count for a specific chain
   * @param {string} chainId - The chain identifier
   * @param {number} count - The setup count to be set
   */
  setChainSetupCount(chainId: string, count: number): void {
    if (!this.workflow[chainId]) {
      this.workflow[chainId] = {};
    }
    this.workflow[chainId].setupCount = count;
  }

  /**
   * Retrieves the setup count for a specific chain
   * @param {string} chainId - The chain identifier
   * @returns {number|undefined} The setup count if exists
   */
  getChainSetupCount(chainId: string): number | undefined {
    return this.workflow[chainId]?.setupCount;
  }

  /**
   * Marks a chain as deployed
   * @param {string} chainId - The chain identifier
   */
  setChainDeployed(chainId: string): void {
    if (!this.workflow[chainId]) {
      this.workflow[chainId] = {};
    }
    this.workflow[chainId].deployed = true;
  }

  /**
   * Checks if a chain is deployed
   * @param {string} chainId - The chain identifier
   * @returns {boolean|undefined} Whether the chain is deployed
   */
  getChainDeployed(chainId: string): boolean | undefined {
    return this.workflow[chainId]?.deployed;
  }

  /**
   * Marks a chain setup as completed
   * @param {string} chainId - The chain identifier
   */
  setChainSetupCompleted(chainId: string): void {
    if (!this.workflow[chainId]) {
      this.workflow[chainId] = {};
    }
    this.workflow[chainId].setupCompleted = true;
  }

  /**
   * Checks if a chain setup is completed
   * @param {string} chainId - The chain identifier
   * @returns {boolean|undefined} Whether the chain setup is completed
   */
  getChainSetupCompleted(chainId: string): boolean | undefined {
    return this.workflow[chainId]?.setupCompleted;
  }
}
