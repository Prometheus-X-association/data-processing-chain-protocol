import { joinUrl, post } from '../utils/http';
import { NodeSupervisor } from '../core/NodeSupervisor';
import { NodeStatusMessage } from '../types/types';
import { Logger } from 'utils/Logger';
export namespace Ext {
  export type NodeStatusHandlerCallback = (
    // eslint-disable-next-line no-unused-vars
    message: any,
  ) => Promise<string | undefined>;

  export interface DefaultNodeStatusCallbackPayload {
    paths: { enqueue: string };
    hostResolver?: NodeStatusHandlerCallback;
  }

  export interface NSCPayload {
    message: NodeStatusMessage;
    hostResolver: NodeStatusHandlerCallback;
    path: string;
  }

  /**
   * Resolves the host for a given node status message.
   * Extracts the host URI from the message payload.
   * @param {any} message - The node status message containing the host URI
   * @returns {Promise<string | undefined>}
   */
  export const defaultHostResolver = async (
    message: any,
  ): Promise<string | undefined> => {
    try {
      const hostURI = message.payload?.hostURI;
      if (hostURI) {
        return hostURI;
      } else {
        throw new Error('host URI not set');
      }
    } catch (error) {
      Logger.error(`${(error as Error).message}`);
    }
  };

  /**
   * Handles the callback for node status updates.
   * Sends the node status message to the resolved host.
   * @param {NSCPayload} payload - Contains the node status message, path, and host resolver
   * @returns {Promise<void>}
   */
  const nodeStatusCallback = async (payload: NSCPayload): Promise<void> => {
    try {
      const { message, path, hostResolver } = payload;
      const host = await hostResolver(message);
      const url = joinUrl(host, path);
      const data = JSON.stringify(message);
      Logger.info(`NodeStatusCallback: Sending message to ${url}`);
      await post(url, data);
    } catch (error) {
      Logger.error(`${(error as Error).message}`);
    }
  };

  /**
   * Configures the node status resolver callbacks.
   * - Sets up the local node status callback with the provided or default host resolver.
   * @param {DefaultNodeStatusCallbackPayload} dcPayload - Configuration for paths and handlers
   * @returns {Promise<void>}
   */
  export const setNodeStatusResolverCallbacks = async (
    dcPayload: DefaultNodeStatusCallbackPayload,
  ): Promise<void> => {
    const { paths, hostResolver } = dcPayload;
    const supervisor = NodeSupervisor.retrieveService();

    supervisor.setNodeStatusCallback(
      async (message: NodeStatusMessage): Promise<void> => {
        const payload: NSCPayload = {
          message,
          hostResolver: hostResolver ?? defaultHostResolver,
          path: paths.enqueue,
        };
        await nodeStatusCallback(payload);
      },
    );
  };
}
