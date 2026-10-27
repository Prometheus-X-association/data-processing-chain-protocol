import { expect } from 'chai';
import sinon from 'sinon';
import { Node } from '../core/Node';
import { ChainType, ChainStatus, NodeSignal } from '../types/types';
import { PipelineProcessor } from '../core/PipelineProcessor';
import { NodeSupervisor } from '../core/NodeSupervisor';

describe('Node System Tests', function () {
  let nodes: Node[];
  let nodeSupervisor: NodeSupervisor;

  beforeEach(function () {
    nodes = [new Node(), new Node(['node1']), new Node(['node2'])];
    nodeSupervisor = NodeSupervisor.retrieveService(true);
  });

  it('should create nodes with correct dependencies', function () {
    expect(nodes[0].getDependencies()).to.be.empty;
    expect(nodes[1].getDependencies()).to.deep.equal(['node1']);
    expect(nodes[2].getDependencies()).to.deep.equal(['node2']);
  });

  it('should execute node with processors', async function () {
    const node = nodes[0];
    const config = { targetId: '' };
    const processor1 = new PipelineProcessor(config);
    const processor2 = new PipelineProcessor(config);

    sinon.stub(processor1, 'digest').resolves({ result1: 'data1' });
    sinon.stub(processor2, 'digest').resolves({ result2: 'data2' });

    node.addPipeline([processor1, processor2]);

    await node.execute({ initial: 'data' });
    await node.getExecutionQueue();

    expect(
      (processor1.digest as sinon.SinonStub).calledWith({ initial: 'data' }),
    ).to.be.true;
    expect(
      (processor2.digest as sinon.SinonStub).calledWith({ result1: 'data1' }),
    ).to.be.true;

    expect(node.getStatus()).to.equal(ChainStatus.NODE_COMPLETED);
  });

  it('should handle node execution failure', async function () {
    const node = nodes[0];
    const config = { targetId: '' };
    const failingProcessor = new PipelineProcessor(config);
    sinon
      .stub(failingProcessor, 'digest')
      .rejects(new Error('Processor failed'));

    node.addPipeline([failingProcessor]);

    await node.execute({ initial: 'data' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(node.getStatus()).to.equal(ChainStatus.NODE_FAILED);
    expect(node.getError())
      .to.be.an('error')
      .with.property('message', 'Processor failed');
  });

  it('should create and run a node through the supervisor', async function () {
    const nodeId = (await nodeSupervisor.handleRequest({
      signal: NodeSignal.NODE_CREATE,
      params: {
        chainType: ChainType.PERSISTANT,
        services: [],
        chainId: '',
      },
    })) as string;

    const config = { targetId: '' };
    const processor = new PipelineProcessor(config);
    sinon.stub(processor, 'digest').resolves({ result: 'processed data' });
    await nodeSupervisor.handleRequest({
      signal: NodeSignal.NODE_RUN,
      id: nodeId,
      data: { initial: 'data' },
    });

    const nodes = nodeSupervisor.getNodes();
    const node = nodes.get(nodeId);
    expect(node, 'expect 1').to.exist;
    expect(node!.getStatus(), 'expect 2').to.equal(ChainStatus.NODE_COMPLETED);
  });
});
