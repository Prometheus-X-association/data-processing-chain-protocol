import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import axios from 'axios';
import {
  BroadcastSetupMessage,
  BroadcastPreMessage,
  NodeSupervisor,
  PipelineProcessor,
  SupervisorPayloadSetup,
  Ext,
} from 'dpcp-library';
import { CallbackPayload, NodeSignal, PipelineData } from 'dpcp-library';
import { Logger } from './libs/Logger';
import http from 'http';

dotenv.config({ path: '.connector.env' });

export class LiteConnector {
  private app: Express;
  private port: number;
  private connectorUid: string;
  private nodeSupervisor: NodeSupervisor;
  private serviceConnectorMap: Map<string, string>;
  private server: http.Server | null;

  constructor(port?: number, connectorUid?: string) {
    this.app = express();
    this.port = port || parseInt(process.env.PORT || '3000', 10);
    this.connectorUid = connectorUid || process.env.CONNECTOR_UID || 'default';
    this.nodeSupervisor = NodeSupervisor.retrieveService();
    this.serviceConnectorMap = new Map();
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    this.app.use(express.json());
  }

  private setupRoutes() {
    // public
    this.app.post(
      '/configure-service-connector',
      this.configureServiceConnector.bind(this),
    );
    // public
    this.app.post('/dispatch-config', this.dispatchConfig.bind(this));
    //
    // public
    this.app.post('/chain/create', this.createChain.bind(this));
    // public
    this.app.put('/chain/start', this.startChain.bind(this));
    // private
    this.app.post('/node/setup', this.setupNode.bind(this));
    // private
    this.app.post('/node/run', this.runNode.bind(this));
  }

  // === Specific to this connector sample ===
  // Configuration: need a way to determine where a service is located and which remote connector is hosting it
  private async configureServiceConnector(
    req: Request,
    res: Response,
  ): Promise<void> {
    const configurations = req.body;
    if (!Array.isArray(configurations) || configurations.length === 0) {
      res.status(400).json({
        error: 'Invalid configuration format. Expected non-empty array.',
      });
      return;
    }

    const updatedMappings: string[] = [];

    for (const config of configurations) {
      const { targetUID, connectorURI } = config;
      if (!targetUID || !connectorURI) {
        const errorMessage = `Invalid configuration: ${JSON.stringify(config)}. Both targetUID and connectorURI are required.`;
        Logger.error({ message: errorMessage });
        res.status(400).json({ error: errorMessage });
        return;
      }

      try {
        new URL(connectorURI);
      } catch (error) {
        const errorMessage = `Invalid connectorURI for targetUID ${targetUID}: ${connectorURI}, error: ${(error as Error).message}`;
        Logger.error({ message: errorMessage });
        res.status(400).json({ error: errorMessage });
        return;
      }

      this.serviceConnectorMap.set(targetUID, connectorURI);
      updatedMappings.push(`${targetUID} -> ${connectorURI}`);
    }

    if (updatedMappings.length > 0) {
      Logger.info({
        message: `Updated service-connector mappings:\n${updatedMappings.join('\n')}`,
      });
    }

    res.status(200).json({
      message: 'All service-connector mappings updated successfully',
      updatedMappings: updatedMappings,
    });
  }

  // === Specific to this connector sample ===
  // Dispatch configuration to other connectors
  private async dispatchConfig(req: Request, res: Response) {
    try {
      const config = req.body;
      if (!Array.isArray(config) || config.length === 0) {
        res.status(400).json({
          error: 'Invalid configuration format. Expected a non-empty array.',
        });
        return;
      }

      const connectorURIs = [
        `http://localhost:${this.port}`,
        ...new Set(config.map((item) => item.connectorURI)),
      ];

      const successfulConfigs: any[] = [];
      const failedConfigs: any[] = [];

      for (const connectorURI of connectorURIs) {
        try {
          Logger.info({
            message: `Sending configuration to connector: ${connectorURI} ...`,
          });
          const response = await axios.post(
            `${connectorURI}/configure-service-connector`,
            config,
          );
          successfulConfigs.push({ connectorURI, data: response.data });
        } catch (error) {
          if (axios.isAxiosError(error) && error.response) {
            Logger.error({
              message: `Failed to send configuration to connector ${connectorURI}. Status: ${error.response.status}`,
            });
            failedConfigs.push({
              connectorURI,
              error: error.response.data,
              status: error.response.status,
            });
          } else {
            Logger.error({
              message: `Failed to send configuration to connector ${connectorURI}, ${(error as Error).message}`,
            });
            failedConfigs.push({
              connectorURI,
              error: (error as Error).message,
            });
          }
        }
      }

      res.status(200).json({
        message: 'Connector configuration completed',
        successfulConfigs,
        failedConfigs,
      });
    } catch (error) {
      Logger.error({
        message: `Error during connector configuration: ${(error as Error).message}`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Step 1: Chain creation called by initial connector
  // Endpoint example very close to real-world usage:
  private async createChain(req: Request, res: Response): Promise<void> {
    try {
      const chainConfig = req.body.chainConfig;
      if (!chainConfig) {
        res.status(400).json({ error: 'Chain configuration is required' });
        return;
      }
      const chainId = this.nodeSupervisor.createChain(chainConfig);
      await this.nodeSupervisor.prepareChainDistribution(chainId);
      res.status(201).json({ chainId });
    } catch (err) {
      const error = err as Error;
      Logger.error({
        message: `Error creating chain: ${error.message}`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Step 2: Automatically invoked after receiving a message from the broadcastSetup callback of a remote connector
  // Implementation very close to real-world usage:
  private async setupNode(req: Request, res: Response): Promise<void> {
    try {
      const { chainId, remoteConfigs } = req.body;
      const nodeId = await this.nodeSupervisor.handleRequest({
        signal: NodeSignal.NODE_SETUP,
        config: { ...remoteConfigs, chainId },
      } as SupervisorPayloadSetup);
      res.status(201).json({ nodeId });
    } catch (err) {
      const error = err as Error;
      Logger.error({
        message: `Error setting up node: ${error.message}`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Step 3: Start the chain
  // Implementation very close to real-world usage:
  private async startChain(req: Request, res: Response): Promise<void> {
    try {
      const { chainId, data } = req.body;
      if (!chainId) {
        res.status(400).json({ error: 'Chain ID is required' });
        return;
      }
      await this.nodeSupervisor.startChain(chainId, data);
      res.status(200).json({ message: 'Chain started successfully' });
    } catch (err) {
      const error = err as Error;
      Logger.error({
        message: `Error starting chain: ${error.message}`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Step 4: Automatically invoked by the remoteService callback to run a node in the chain using a given service ID for a specific chain ID
  // Basic implementation very close to real-world usage:
  private async runNode(req: Request, res: Response): Promise<void> {
    try {
      // Run node based on chain ID and target ID
      await this.nodeSupervisor.runNodeByRelation(req.body as CallbackPayload);
      res
        .status(200)
        .json({ message: 'Data received and processed successfully' });
    } catch (err) {
      const error: Error = err as Error;
      Logger.error({
        message: `Error processing received data: ${error.message}`,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Initialize necessary supervisor callbacks
  public async setupSupervisor(): Promise<void> {
    // Required callback to handle infrastructure services and/or other data transformation services
    PipelineProcessor.setCallbackService(
      async ({ targetId, data }): Promise<PipelineData> => {
        //
        // Here we call the required service
        //
        Logger.info({
          message: `PipelineProcessor callback invoked - Connector: ${this.connectorUid}, Target: ${targetId}, Data size: ${JSON.stringify(data).length} bytes`,
        });
        return data;
      },
    );

    // Example of the required broadcast setup callback, using the default broadcastSetupCallback from the dpcp library
    this.nodeSupervisor.setBroadcastSetupCallback(
      async (message: BroadcastSetupMessage): Promise<void> => {
        const payload: Ext.BSCPayload = {
          message,
          hostResolver: (targetId: string) => {
            return this.serviceConnectorMap.get(targetId);
          },
          path: '/node/setup',
        };
        await Ext.Resolver.broadcastSetupCallback(payload);
      },
    );

    // Example of the required broadcast setup callback, using the default broadcastSetupCallback from the dpcp library
    this.nodeSupervisor.setBroadcastPreCallback(
      async (message: BroadcastPreMessage): Promise<void> => {
        const payload: Ext.BDCPayload = {
          message,
          hostResolver: (targetId: string) => {
            return this.serviceConnectorMap.get(targetId);
          },
          path: '/chain/create-and-start',
        };
        await Ext.Resolver.broadcastPreCallback(payload);
      },
    );

    // Example of the required remote service callback, using the default remoteServiceCallback from the dpcp library
    this.nodeSupervisor.setRemoteServiceCallback(
      async (cbPayload: CallbackPayload): Promise<void> => {
        const payload: Ext.RSCPayload = {
          cbPayload,
          hostResolver: (targetId: string) => {
            return this.serviceConnectorMap.get(targetId);
          },
          path: '/node/run',
        };
        await Ext.Resolver.remoteServiceCallback(payload);
      },
    );

    // Set current supervisor uid
    try {
      this.nodeSupervisor.setUid(this.connectorUid);
    } catch (error) {
      Logger.error({
        message: `Failed to set node supervisor UID: ${(error as Error).message}`,
      });
      throw error;
    }
  }

  public async startServer(): Promise<http.Server> {
    await this.setupSupervisor();
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        Logger.info({
          message: `Test connector server running on http://localhost:${this.port}`,
        });
        resolve(this.server as http.Server);
      });
    });
  }

  public async stopServer(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server?.close(() => {
          this.server = null;
          resolve();
        });
      });
    }
  }

  public getApp(): Express {
    return this.app;
  }

  public getPort(): number {
    return this.port;
  }

  public setPort(port: number): void {
    this.port = port;
  }

  public getConnectorUid(): string {
    return this.connectorUid;
  }

  public setConnectorUid(uid: string): void {
    this.connectorUid = uid;
  }
}
