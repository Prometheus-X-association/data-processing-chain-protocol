import { expect } from 'chai';
import sinon from 'sinon';
import { NodeSupervisor } from '../core/NodeSupervisor';
import { PipelineProcessor } from '../core/PipelineProcessor';
import { ChainConfig, NodeSignal, PipelineData } from '../types/types';
import { Node } from '../core/Node';
import { MonitoringAgent } from '../agents/MonitoringAgent';

describe('Node Supervisor Chain Flow Test', function () {
  let nodeSupervisor: NodeSupervisor;
  let monitoring: MonitoringAgent;

  beforeEach(function () {
    nodeSupervisor = NodeSupervisor.retrieveService(true);
    monitoring = MonitoringAgent.retrieveService();
    nodeSupervisor.setUid('test');
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should create, prepare, and execute a chain of local nodes', async function () {
    const stub = sinon
      .stub(nodeSupervisor, 'handleRequest')
      .callsFake(async function (this: NodeSupervisor, request) {
        if (request.signal === NodeSignal.NODE_DELETE) {
          return undefined;
        }
        return stub.wrappedMethod.call(this, request);
      });

    const chainConfig: ChainConfig = [
      {
        services: ['service1'],
        location: 'local',
        chainId: '',
        monitoringHost: 'http://fakehost.test',
      },
      {
        services: ['service2'],
        location: 'local',
        chainId: '',
      },
      {
        services: ['service3'],
        location: 'local',
        chainId: '',
      },
    ];

    const callOrder: string[] = [];
    PipelineProcessor.setCallbackService(({ targetId, data }) => {
      callOrder.push(targetId);
      return Promise.resolve({ ...(data as any), [targetId]: 'processed' });
    });

    const digestSpy = sinon.spy(PipelineProcessor.prototype, 'digest');
    const terminateSpy = sinon.spy(Node as any, 'terminate');

    const chainId = nodeSupervisor.createChain(chainConfig);
    expect(chainId, 'expect 1').to.be.a('string');

    await nodeSupervisor.prepareChainDistribution(chainId);

    const nodes = nodeSupervisor.getNodes();
    expect(nodes.size, 'expect 2').to.equal(3);

    const initialData: PipelineData = { input: 'initialData' };
    await nodeSupervisor.startChain(chainId, initialData);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(digestSpy.calledThrice, 'expect 3').to.be.true;

    expect(digestSpy.getCall(0).args[0], 'expect 4').to.have.property(
      'input',
      'initialData',
    );
    expect(digestSpy.getCall(1).args[0], 'expect 5').to.have.property(
      'service1',
      'processed',
    );
    expect(digestSpy.getCall(2).args[0], 'expect 6').to.have.property(
      'service2',
      'processed',
    );

    expect(callOrder, 'expect services called in chain order').to.deep.equal([
      'service1',
      'service2',
      'service3',
    ]);

    expect(terminateSpy.calledThrice, 'expect 7').to.be.true;
    expect(terminateSpy.lastCall.args[1], 'expect 8').to.deep.equal([
      {
        input: 'initialData',
        service1: 'processed',
        service2: 'processed',
        service3: 'processed',
      },
    ]);

    const chainState = monitoring.getChainStatus(chainId);
    expect(chainState, 'expect chain state to be defined').to.not.be.undefined;
    if (chainState) {
      const completedNodes = Object.keys(chainState).filter(
        (nodeId) => chainState[nodeId].node_completed === true,
      );
      expect(
        completedNodes,
        'expect all nodes to be completed',
      ).to.have.lengthOf(3);

      const pendingNodes = Object.keys(chainState).filter(
        (nodeId) => chainState[nodeId].node_completed === false,
      );
      expect(pendingNodes, 'expect no pending nodes').to.be.empty;

      const failedNodes = Object.keys(chainState).filter(
        (nodeId) => chainState[nodeId].node_failed === true,
      );
      expect(failedNodes, 'expect no failed nodes').to.be.empty;
    }
  });
});
