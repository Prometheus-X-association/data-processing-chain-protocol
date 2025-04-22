import { NodeSignal, PipelineData, ChainStatus, ResumePayload } from '../types/types';
import { Logger } from '../utils/Logger';
import { Node } from './Node';

interface SuspendedState {
  generator: Generator<any, void, unknown>;
  currentBatch: any;
  data: PipelineData;
  previousNodeParams?: PipelineData | undefined;
}

export class NodeStatusManager {
  private signalQueue: NodeSignal.Type[] = [];
  private currentCursor: number = 0;
  private status: ChainStatus.Type[] = [];
  private suspendedState: SuspendedState | null = null;

  // eslint-disable-next-line no-unused-vars
  constructor(private node: Node) {}

  /**
   * Handles the stop signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleStopSignal(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing STOP signal`);
  }

  /**
   * Handles the suspend signal by adding the suspended status and logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleSuspendSignal(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing Suspend signal`);
    if (!this.status.includes(ChainStatus.NODE_SUSPENDED)) {
      this.status.push(ChainStatus.NODE_SUSPENDED);
      Logger.info(`Node ${this.node.getId()} suspended.`);
    }
  }

  /**
   * Handles the resume signal by removing the suspended status and resuming execution if the node is suspended.
   * @private
   * @returns {Promise<void>}
   */
  private async handleResumeSignal(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing RESUME signal`);
    const index = this.status.indexOf(ChainStatus.NODE_SUSPENDED);
    if (index > -1) {
      this.status.splice(index, 1);
      if (!this.suspendedState) {
        Logger.warn(
          `~ NodeStatusManager: Node ${this.node.getId()} may have resumed prematurely.`,
        );
        return;
      }
      Logger.info(`~ NodeStatusManager: Resuming node ${this.node.getId()}...`);
      return this.node.execute(this.suspendedState.data);
    } else {
      Logger.warn(
        `~ NodeStatusManager: Cannot resume Node ${this.node.getId()}, not in suspended state.`,
      );
    }
  }

  /**
   * Suspends execution by saving the generator, current batch, and data.
   * @template T
   * @param {Generator<T, void, unknown>} generator - The generator to save.
   * @param {T} currentBatch - The current batch being processed.
   * @param {PipelineData} data - The data being processed.
   */
  suspendExecution<T>(
    generator: Generator<T, void, unknown>,
    currentBatch: T,
    data: PipelineData,
  ): void {
    //TODO MONITORING NOTIFY PAUSE
    this.suspendedState = {
      generator,
      currentBatch,
      data,
    };
  }

  /**
   * Gets the current suspended state.
   * @returns {SuspendedState | null} The suspended state or null if not suspended.
   */
  getSuspendedState(): SuspendedState | null {
    return this.suspendedState;
  }

  /**
   * Clears the suspended state by setting it to null.
   */
  clearSuspendedState(): void {
    this.suspendedState = null;
  }

  /**
   * Checks if the node is currently suspended.
   * @returns {boolean} True if suspended, false otherwise.
   */
  isSuspended(): boolean {
    return this.status.includes(ChainStatus.NODE_SUSPENDED);
  }

  /**
   * Handles the error signal by logging an error message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleErrorSignal(): Promise<void> {
    Logger.error(`NodeStatusManager: Processing ERROR signal`);
  }

  /**
   * Handles the node setup signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleNodeSetup(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing NODE_SETUP signal`);
  }

  /**
   * Handles the node create signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleNodeCreate(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing NODE_CREATE signal`);
  }

  /**
   * Handles the node delete signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleNodeDelete(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing NODE_DELETE signal`);
  }

  /**
   * Handles the node run signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleNodeRun(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing NODE_RUN signal`);
  }

  /**
   * Handles the node send data signal by logging a message.
   * @private
   * @returns {Promise<void>}
   */
  private async handleNodeSendData(): Promise<void> {
    Logger.info(`~ NodeStatusManager: Processing NODE_SEND_DATA signal`);
  }

  /**
   * Updates the signal queue with new signals and resets the cursor.
   * @param {NodeSignal.Type[]} newSignals - The new signals to set in the queue.
   */
  public updateQueue(newSignals: NodeSignal.Type[]): void {
    this.signalQueue = newSignals;
    this.currentCursor = 0;
  }

  /**
   * Enqueues new signals and processes immediately if the first signal is resume.
   * @param {NodeSignal.Type[]} signals - The signals to add to the queue.
   * @param resumePayload
   * @returns {Promise<void>}
   */
  public async enqueueSignals(signals: NodeSignal.Type[], resumePayload?: ResumePayload): Promise<void> {
    this.signalQueue.push(...signals);

    if(resumePayload && this.suspendedState?.data){
      this.suspendedState.data = resumePayload.data;
    }

    if(resumePayload?.params && this.suspendedState){
      this.suspendedState.previousNodeParams = resumePayload.params;
    }

    if (signals.length > 0 && signals[0] === NodeSignal.NODE_RESUME) {
      await this.process();
    }
  }

  /**
   * Processes the next signal in the queue based on the current cursor position.
   * @private
   * @returns {Promise<void>}
   */
  private async processNextSignal(): Promise<void> {
    try {
      const currentSignal = this.signalQueue[this.currentCursor];
      switch (currentSignal) {
        case NodeSignal.NODE_STOP:
          return this.handleStopSignal();
        case NodeSignal.NODE_SUSPEND:
          return this.handleSuspendSignal();
        case NodeSignal.NODE_RESUME:
          return this.handleResumeSignal();
        case NodeSignal.NODE_ERROR:
          return this.handleErrorSignal();
        case NodeSignal.NODE_SETUP:
          return this.handleNodeSetup();
        case NodeSignal.NODE_CREATE:
          return this.handleNodeCreate();
        case NodeSignal.NODE_DELETE:
          return this.handleNodeDelete();
        case NodeSignal.NODE_RUN:
          return this.handleNodeRun();
        case NodeSignal.NODE_SEND_DATA:
          return this.handleNodeSendData();
        default:
          Logger.warn(
            `~ NodeStatusManager: Unknown signal type: ${currentSignal}`,
          );
      }
    } catch (error) {
      Logger.error(
        `~ NodeStatusManager: Error processing signal: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  /**
   * Gets the current state of the signal queue and cursor.
   * @returns {{ queue: NodeSignal.Type[]; cursor: number }} The queue and cursor state.
   */
  public getQueueState(): { queue: NodeSignal.Type[]; cursor: number } {
    return {
      queue: [...this.signalQueue],
      cursor: this.currentCursor,
    };
  }

  /**
   * Processes all signals in the queue from the current cursor to the end.
   * @returns {Promise<ChainStatus.Type[]>} The array of current statuses after processing.
   */
  async process(): Promise<ChainStatus.Type[]> {
    //TODO
    for (; this.currentCursor < this.signalQueue.length; this.currentCursor++) {
      await this.processNextSignal();
    }
    return this.status;
  }
}
