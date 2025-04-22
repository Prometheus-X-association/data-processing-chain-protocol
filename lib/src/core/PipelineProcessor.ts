import {
  NodeConfig,
  PipelineData,
  PipelineMeta,
  preProcessorCallback,
  ProcessorCallback,
  ServiceConfig,
} from 'types/types';
import { Logger } from '../utils/Logger';

/**
 * Represents a processor that encapsulate external services within a pipeline
 */
export class PipelineProcessor {
  /** Static callback service used by all processor instances */
  static callbackService: ProcessorCallback;
  /** Static callback service used by all processor instances */
  static preProcessorCallback: preProcessorCallback;

  /** Optional metadata associated with this processor */
  private meta?: PipelineMeta;

  /** Target service identifier for this processor */
  private targetId: string;

  /**
     * Creates a new PipelineProcessor instance
     * @param {ServiceConfig} config - Configuration containing targetId and optional metadata
     */
  constructor(config: ServiceConfig) {
    this.targetId = config.targetId;
    this.meta = config.meta;
  }

  /**
     * Sets the static callback service used by all processor instances
     * @param {ProcessorCallback} callbackService - The callback function to process data
     */
  static setCallbackService(callbackService: ProcessorCallback): void {
    PipelineProcessor.callbackService = callbackService;
  }

  /**
     * Sets the static callback service used by all processor instances
     * @param {ProcessorCallback} preCallbackService - The callback function to process data
     */
  static setPreCallbackService(preCallbackService: ProcessorCallback): void {
    PipelineProcessor.preProcessorCallback = preCallbackService;
  }

  /**
     * Processes input data through the callback service
     * @param {PipelineData} data - Data to be processed
     * @param config
     * @returns {Promise<PipelineData>} Processed data
     */
  async digest(data: PipelineData, config?: NodeConfig | null): Promise<PipelineData> {
    if (PipelineProcessor.callbackService) {
      Logger.info(
        `[PipelineProcessor]: Digesting data using "${this.targetId}"`,
      );
      return await PipelineProcessor.callbackService({
        nextTargetId: config?.nextTargetId,
        nextNodeResolver: config?.nextNodeResolver,
        previousTargetId: config?.pre && config?.pre.length > 0 && config?.pre[0] && config?.pre[0].length > 0 && config?.pre[0][0] && config?.pre[0][0]?.services[0]
          ? typeof config?.pre[0][0].services[0] === 'string'
            ? config?.pre[0][0].services[0]
            : config?.pre[0][0].services[0].targetId
          : undefined,
        chainId: config?.chainId,
        targetId: this.targetId,
        meta: this.meta,
        data,
      });
    }
    // Return empty object if no callback service is configured
    return {};
  }
}
