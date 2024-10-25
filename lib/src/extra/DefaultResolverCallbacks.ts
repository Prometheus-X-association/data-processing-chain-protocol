import { Logger } from './Logger';
import {
  BrodcastSetupMessage,
  CallbackPayload,
  ChainConfig,
  PipelineMeta,
} from '../types/types';
import { NodeSupervisor } from '../core/NodeSupervisor';
import { post } from './http';

export type HostResolverCallback = (
  // eslint-disable-next-line no-unused-vars
  targetId: string,
  // eslint-disable-next-line no-unused-vars
  meta?: PipelineMeta,
) => string | undefined;
export interface BSCPayload {
  message: BrodcastSetupMessage;
  hostResolver: HostResolverCallback;
  path: string;
}

export const broadcastSetupCallback = async (
  payload: BSCPayload,
): Promise<void> => {
  const { message, hostResolver, path } = payload;
  Logger.info(`Broadcast message: ${JSON.stringify(message, null, 2)}`);
  const chainConfigs: ChainConfig = message.chain.config;
  const chainId: string = message.chain.id;

  for (const config of chainConfigs) {
    if (config.services.length === 0) {
      Logger.warn('Empty services array encountered in config');
      continue;
    }
    const service = config.services[0];
    const targetId: string =
      typeof service === 'string' ? service : service.targetId;
    const meta = typeof service === 'string' ? undefined : service.meta;

    const host = hostResolver(targetId, meta);
    if (!host) {
      Logger.warn(`No container address found for targetId: ${targetId}`);
      continue;
    }
    try {
      // Send a POST request to set up the node on a remote container with the specified host address
      const data = JSON.stringify({
        chainId,
        remoteConfigs: config,
      });
      const url = new URL(path, host);
      void post(url, data);
    } catch (error) {
      Logger.error(
        `Unexpected error sending setup request to ${host} for targetId ${targetId}: ${(error as Error).message}`,
      );
    }
  }
};

export interface RSCPayload {
  cbPayload: CallbackPayload;
  hostResolver: HostResolverCallback;
  path: string;
}

export const remoteServiceCallback = async (payload: RSCPayload) => {
  const { cbPayload, hostResolver, path } = payload;
  Logger.info(`Service callback payload: ${JSON.stringify(payload, null, 2)}`);
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

export interface DefaultCallbackPayload {
  supervisor: NodeSupervisor;
  paths: { setup: string; run: string };
  hostResolver: HostResolverCallback;
}
export const setResolverCallbacks = async (
  dcPayload: DefaultCallbackPayload,
): Promise<void> => {
  const { supervisor, paths, hostResolver } = dcPayload;

  supervisor.setBroadcastSetupCallback(
    async (message: BrodcastSetupMessage): Promise<void> => {
      const payload: BSCPayload = {
        message,
        hostResolver,
        path: paths.setup,
      };
      await broadcastSetupCallback(payload);
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
