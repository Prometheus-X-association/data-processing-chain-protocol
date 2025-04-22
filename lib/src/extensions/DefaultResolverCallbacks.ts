import { Logger } from '../utils/Logger';
import {
  BroadcastSetupMessage,
  BroadcastPreMessage,
  CallbackPayload,
  ChainConfig, NodeConfig,
  PipelineMeta, PipelineData,
} from '../types/types';
import { NodeSupervisor } from '../core/NodeSupervisor';
import { post } from '../utils/http';

export namespace Ext {
  /**
   * Type defining a host resolution function to build a URL from target information
   */
  export type HostResolverCallback = (
    // eslint-disable-next-line no-unused-vars
    targetId: string,
    // eslint-disable-next-line no-unused-vars
    meta?: PipelineMeta,
  ) => string | undefined;

  /**
   * Interface for the setup configuration broadcast payload
   */
  export interface BSCPayload {
    message: BroadcastSetupMessage;
    hostResolver: HostResolverCallback;
    path: string;
  }

  /**
   * Interface for the setup configuration broadcast payload
   */
  export interface BDCPayload {
    message: BroadcastPreMessage;
    hostResolver: HostResolverCallback;
    path: string;
  }

  /**
   * Manages broadcasting setup configurations to different remote nodes
   * @param {BSCPayload} payload - Contains the message to broadcast, host resolution function, and path
   */
  export const broadcastSetupCallback = async (
    payload: BSCPayload,
  ): Promise<void> => {
    const { message, hostResolver, path } = payload;
    Logger.info(`Broadcast message: ${JSON.stringify(message, null, 2)}`);
    const chainConfigs: ChainConfig = message.chain.config;
    const chainId: string = message.chain.id;
    for (const config of chainConfigs) {

      const processedConfig = processConfig(config, hostResolver);
      
      try {
        // Send a POST request to set up the node on a remote container with the specified host address
        const data = JSON.stringify({
          chainId,
          remoteConfigs: config,
        });
        const url = new URL(path, processedConfig?.host);
        void post(url, data);
      } catch (error) {
        Logger.error(
          `Unexpected error sending setup request to ${processedConfig?.host} for targetId ${processedConfig?.targetId}: ${(error as Error).message}`,
        );
      }
    }
  };

  /**
   * Manages broadcasting setup configurations to different remote nodes
   * @param {BDCPayload} payload - Contains the message to broadcast, host resolution function, and path
   */
  export const broadcastPreCallback = async (
    payload: BDCPayload,
  ): Promise<Object | undefined> => {
    const { message, hostResolver, path } = payload;
    const chainConfigs: ChainConfig = message.chain.config;
    for (const config of chainConfigs) {

      const processedConfig = processConfig(config, hostResolver);

      try {
        // Send a POST request to set up the node on a remote container with the specified host address
        const data = JSON.stringify(config);

        const url = new URL(path, processedConfig?.host);
        Logger.info(`Broadcast pre message at url: ${JSON.stringify(url, null, 2)}`);
        return JSON.parse(await post(url, data));
      } catch (error) {
        Logger.error(
          `Unexpected error sending setup request to ${processedConfig?.host} for targetId ${processedConfig?.targetId}: ${(error as Error).message}`,
        );
      }
    }
  };
  
  const processConfig = (config: NodeConfig, hostResolver: HostResolverCallback) =>  {

    // chainId?: string;
    // nextTargetId?: string;
    // previousTargetId?: string;
    // targetId: string;
    // data: PipelineData;
    // meta?: PipelineMeta;
    if (config.services.length === 0) {
      Logger.warn('Empty services array encountered in config');
      return;
    }
    const service = config.services[0];
    const targetId: string =
        typeof service === 'string' ? service : service.targetId;
    const meta = typeof service === 'string' ? undefined : service.meta;

    const host = hostResolver(targetId, meta);
    if (!host) {
      Logger.warn(`No container address found for targetId: ${targetId}`);
      return;
    }
    
    return { service, targetId, meta, host }
  }

  /**
   * Interface for the payload of remote service calls
   */
  export interface RSCPayload {
    cbPayload: CallbackPayload;
    hostResolver: HostResolverCallback;
    path: string;
  }

  /**
   * Manages sending data to remote services
   * @param {RSCPayload} payload - Contains data to send, host resolution function, and path
   */
  export const remoteServiceCallback = async (payload: RSCPayload) => {
    const { cbPayload, hostResolver, path } = payload;
    Logger.info(
      `Service callback payload: ${JSON.stringify(payload, null, 2)}`,
    );
    try {
      if (!cbPayload.chainId) {
        throw new Error('payload.chainId is undefined');
      }

      const nextConnectorUrl = hostResolver(cbPayload.targetId, cbPayload.meta);
      if (!nextConnectorUrl) {
        throw new Error(
          `Next connector URI not found for the following target service: ${cbPayload.targetId}`,
        );
      }

      const url = new URL(path, nextConnectorUrl);
      Logger.info(`Sending data to next connector on: ${url.href}`);
      const data = JSON.stringify(cbPayload);
      await post(url, data);
    } catch (error) {
      Logger.error(
        `Error sending data to next connector: ${(error as Error).message}`,
      );
      throw error;
    }
  };

  /**
   * Interface for configuring default callbacks
   */
  export interface DefaultCallbackPayload {
    paths: { setup: string; run: string; pre: string; };
    hostResolver: HostResolverCallback;
  }

  /**
   * Configures resolution callbacks for the node supervisor
   * - Configures the setup broadcast callback
   * - Configures the remote service callback
   * @param {DefaultCallbackPayload} dcPayload - Configuration for paths and host resolver
   */
  export const setResolverCallbacks = async (
    dcPayload: DefaultCallbackPayload,
  ): Promise<void> => {
    const { paths, hostResolver } = dcPayload;
    const supervisor = NodeSupervisor.retrieveService();

    supervisor.setBroadcastSetupCallback(
      async (message: BroadcastSetupMessage): Promise<void> => {
        const payload: BSCPayload = {
          message,
          hostResolver,
          path: paths.setup,
        };
        await broadcastSetupCallback(payload);
      },
    );

    supervisor.setBroadcastPreCallback(
      async (message: BroadcastPreMessage): Promise<any> => {
        const payload: BDCPayload = {
          message,
          hostResolver,
          path: paths.pre,
        };
        return await broadcastPreCallback(payload);
      },
    );

    supervisor.setRemoteServiceCallback(
      async (cbPayload: CallbackPayload): Promise<void> => {
        const payload: RSCPayload = {
          cbPayload,
          hostResolver,
          path: paths.run,
        };
        await remoteServiceCallback(payload);
      },
    );
  };
}
