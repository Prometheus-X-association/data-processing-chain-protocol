import { Logger } from '../utils/Logger';
import { Agent } from './Agent';
import {
  ChainStatus,
  NodeStatusMessage,
  Notification,
  ReportingSignalType,
} from '../types/types';

/**
 * Abstract base class for a node monitoring and status reporting agent
 * @abstract
 */
export abstract class ReportingAgentBase extends Agent {
  private static authorizedAgent: Agent | null = null;
  private readonly status: ChainStatus.Type[] = [];

  /**
   * Creates a new ReportingAgentBase instance
   * @throws {Error} Throws an error if the agent instantiating this instance is not authorized.
   */
  constructor() {
    super();
    if (!(ReportingAgentBase.authorizedAgent instanceof Agent)) {
      throw new Error(
        'Node Reporter needs to be instantiated by an authorized Agent',
      );
    }
    ReportingAgentBase.authorizedAgent = null;
  }

  /**
   * Authorizes an agent to create ReportingAgent instances
   * @param {Agent} agent - The agent to authorize
   */
  static authorize(agent: Agent): void {
    ReportingAgentBase.authorizedAgent = agent;
  }

  /**
   * Notifies about a new chain status
   * @param {ChainStatus.Type} status - The status to notify
   * @param {ReportingSignalType} type - The type of signal ('local-signal' by default)
   */
  notify(
    notification: Notification & Partial<NodeStatusMessage>,
    type: ReportingSignalType = 'local-signal',
  ): void {
    const { status } = notification;
    Logger.info(`Status ${status} from ${this.uid}`);
    this.status.push(status);
    this.emit(type, notification);
  }

  /**
   * Gets all recorded signals/statuses
   * @returns {ChainStatus.Type[]} Array of recorded chain statuses
   */
  getSignals(): ChainStatus.Type[] {
    return this.status;
  }
}
