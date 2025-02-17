import {
  ReportingMessage,
  BroadcastReportingMessage,
  ChainStatus,
  SupervisorPayloadStartPendingChain,
  NodeSignal,
} from '../types/types';
import { NodeSupervisor } from '../core/NodeSupervisor';
import { Logger } from './Logger';
import { post } from './http';
import { MonitoringAgent } from 'agents/MonitoringAgent';
import { MonitoringSignalHandler } from 'agents/MonitoringSignalHandler';

/**
 * Type defining a callback to handle reporting signals
 * @param {ReportingMessage} message - The reporting message containing signal and metadata
 * @returns {Promise<void>}
 */
export type ReportSignalHandlerCallback = (
  // eslint-disable-next-line no-unused-vars
  message: ReportingMessage,
) => Promise<void>;

/**
 * Type defining a callback to resolve the monitoring host for a chain
 * @param {string} chainId - The ID of the chain to find the monitoring host for
 * @returns {Promise<string | undefined>}
 */
export type MonitoringResolverCallback = (
  // eslint-disable-next-line no-unused-vars
  chainId: string,
) => Promise<string | undefined>;

/**
 * Interface for the monitoring payload
 */
export interface MCPayload {
  message: ReportingMessage;
  reportSignalHandler: ReportSignalHandlerCallback;
}

/**
 * Interface for the broadcast reporting payload
 */
export interface BRCPayload {
  message: BroadcastReportingMessage;
  path: string;
  monitoringResolver: MonitoringResolverCallback;
}

/**
 * Default callback for reporting, to be set on the initial supervisor
 * @param {MCPayload} payload - Contains the message and report signal handler callback
 * @returns {Promise<void>}
 */
export const reportingCallback = async (payload: MCPayload): Promise<void> => {
  const { message, reportSignalHandler } = payload;
  await reportSignalHandler(message);
};

/**
 * Interface to configure default reporting callbacks
 */
export interface DefaultReportingCallbackPayload {
  paths: { notify: string };
  reportSignalHandler?: ReportSignalHandlerCallback;
  monitoringResolver?: MonitoringResolverCallback;
}

/**
 * Default handler for reporting signals
 * Primarily handles the start of chains once setup is completed
 * @param {ReportingMessage} message - The reporting message containing the signal and metadata
 * @returns {Promise<void>}
 */
const defaultReportSignalHandler = async (
  message: ReportingMessage,
): Promise<void> => {
  Logger.info({ message: `${JSON.stringify(message, null, 2)}` });
  await MonitoringSignalHandler.handle(message);
};

/**
 * Default resolver to find the monitoring host for a chain
 * @param {string} chainId - The ID of the chain to locate the monitoring host
 * @returns {Promise<string | undefined>}
 */
const defaultMonitoringResolver = async (
  chainId: string,
): Promise<string | undefined> => {
  try {
    const monitoring = MonitoringAgent.retrieveService();
    const monitoringHost = monitoring.getRemoteMonitoringHost(chainId);
    if (monitoringHost !== undefined) {
      Logger.info({
        message: `DRC: Resolving host for monitoring: ${monitoringHost}`,
      });
      return monitoringHost;
    } else throw new Error('Monitoring host not found');
  } catch (error) {
    Logger.error({ message: (error as Error).message });
  }
};

/**
 * Handles broadcasting reporting messages to monitoring hosts
 * @param {BRCPayload} payload - Contains the broadcast message, path, and monitoring resolver
 * @returns {Promise<void>}
 */
const broadcastReportingCallback = async (
  payload: BRCPayload,
): Promise<void> => {
  const { message, path, monitoringResolver } = payload;
  const monitoringHost = await monitoringResolver(message.chainId);
  const url = new URL(path, monitoringHost);
  const data = JSON.stringify(message);
  Logger.info(`DRC: Sending message to ${url}`);
  await post(url, data);
};

/**
 * Configures monitoring callbacks for the supervisor
 * - Sets up the local reporting callback
 * - Sets up the broadcast reporting callback
 * @param {DefaultReportingCallbackPayload} dcPayload - Configuration for paths and handlers
 * @returns {Promise<void>}
 */
export const setMonitoringCallbacks = async (
  dcPayload: DefaultReportingCallbackPayload,
): Promise<void> => {
  const { paths, reportSignalHandler, monitoringResolver } = dcPayload;
  const supervisor = NodeSupervisor.retrieveService();

  supervisor.setMonitoringCallback(
    async (message: ReportingMessage): Promise<void> => {
      const payload: MCPayload = {
        message,
        reportSignalHandler: reportSignalHandler ?? defaultReportSignalHandler,
      };
      await reportingCallback(payload);
    },
  );

  supervisor.setBroadcastReportingCallback(
    async (message: BroadcastReportingMessage): Promise<void> => {
      const payload: BRCPayload = {
        message,
        path: paths.notify,
        monitoringResolver: monitoringResolver ?? defaultMonitoringResolver,
      };
      await broadcastReportingCallback(payload);
    },
  );
};
