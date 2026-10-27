import {
  NodeConfig,
  PipelineData,
  PipelineMeta,
  preProcessorCallback,
  ProcessorCallback,
  ServiceConfig,
} from 'types/types';
import { Logger } from '../utils/Logger';
import { getServiceTargetId } from '../utils/service';

/**
 * Represents a processor that encapsulate external services within a pipeline
 */
export class PipelineProcessor {
  /** Static callback service used by all processor instances */
  private static _callbackService: ProcessorCallback;
  /** Static pre-processing callback service used by all processor instances */
  private static _preProcessorCallback: preProcessorCallback;

  /** Optional metadata associated with this processor */
  private readonly meta?: PipelineMeta;

  /** Target service identifier for this processor */
  private readonly targetId: string;

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
    PipelineProcessor._callbackService = callbackService;
  }

  /**
     * Gets the static callback service used by all processor instances
     * @returns {ProcessorCallback} The callback service
     */
  static get callbackService(): ProcessorCallback {
    return PipelineProcessor._callbackService;
  }

  /**
     * Sets the static callback service used by all processor instances
     * @param {ProcessorCallback} preCallbackService - The callback function to process data
     */
  static setPreCallbackService(preCallbackService: ProcessorCallback): void {
    PipelineProcessor._preProcessorCallback = preCallbackService;
  }

  /**
     * Gets the static pre-processing callback service used by all processor instances
     * @returns {preProcessorCallback} The pre-processing callback service
     */
  static get preProcessorCallback(): preProcessorCallback {
    return PipelineProcessor._preProcessorCallback;
  }

  /**
     * Processes input data through the callback service
     * @param {PipelineData} data - Data to be processed
     * @param config
     * @returns {Promise<PipelineData>} Processed data
     */
  async digest(data: PipelineData, config?: NodeConfig | null): Promise<PipelineData> {
    const callbackService = PipelineProcessor._callbackService;
    if (callbackService) {
      Logger.info(
        `[PipelineProcessor]: Digesting data using "${this.targetId}"`,
      );
      return await callbackService({
        nextTargetId: config?.nextTargetId,
        nextNodeResolver: config?.nextNodeResolver,
        previousTargetId: getServiceTargetId(config?.pre?.[0]?.[0]?.services?.[0]),
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
