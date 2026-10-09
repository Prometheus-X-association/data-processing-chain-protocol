import { expect } from 'chai';
import sinon from 'sinon';
import * as http from 'http';
import { AddressInfo } from 'net';
import { joinUrl } from '../utils/http';
import { Ext } from '../extensions/DefaultResolverCallbacks';
import { Logger } from '../utils/Logger';
import { BroadcastSetupMessage, NodeSignal } from '../types/types';

describe('joinUrl', () => {
  const path = '/service-chain/node/setup';

  it('should keep the base sub-path', () => {
    expect(joinUrl('https://host/service/pdc', path).href).to.equal(
      'https://host/service/pdc/service-chain/node/setup',
    );
  });

  it('should not duplicate slashes when the base ends with one', () => {
    expect(joinUrl('https://host/service/pdc/', path).href).to.equal(
      'https://host/service/pdc/service-chain/node/setup',
    );
  });

  it('should accept a relative path', () => {
    expect(
      joinUrl('https://host/service/pdc', 'service-chain/node/setup').href,
    ).to.equal('https://host/service/pdc/service-chain/node/setup');
  });

  it('should work with a base without sub-path', () => {
    expect(joinUrl('https://host', path).href).to.equal(
      'https://host/service-chain/node/setup',
    );
    expect(joinUrl('http://localhost:3333/', path).href).to.equal(
      'http://localhost:3333/service-chain/node/setup',
    );
  });

  it('should throw when the base is undefined', () => {
    expect(() => joinUrl(undefined, path)).to.throw();
  });
});

describe('Resolver callbacks behind a sub-path', () => {
  const PREFIX = '/service/pdc';
  let server: http.Server;
  let base: string;
  let received: string[];
  let statusCode: number;
  let onRequest: (() => void) | undefined;

  before((done) => {
    server = http.createServer((req, res) => {
      received.push(req.url ?? '');
      res.statusCode = statusCode;
      res.end('{}');
      onRequest?.();
    });
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      base = `http://localhost:${port}${PREFIX}`;
      done();
    });
  });

  after((done) => {
    server.close(done);
  });

  beforeEach(() => {
    received = [];
    statusCode = 201;
    onRequest = undefined;
  });

  afterEach(() => {
    sinon.restore();
  });

  const setupMessage = (resolver: string): BroadcastSetupMessage => ({
    signal: NodeSignal.NODE_SETUP,
    chain: {
      id: 'test-chain',
      config: [
        {
          chainId: '',
          location: 'remote',
          services: [{ targetId: 'https://catalog/service', meta: { resolver } }],
        },
      ],
    },
  });

  const hostResolver: Ext.HostResolverCallback = (_targetId, meta) =>
    meta?.resolver;

  it('broadcastSetupCallback should POST under the remote sub-path', async () => {
    const requested = new Promise<void>((resolve) => (onRequest = resolve));

    await Ext.broadcastSetupCallback({
      message: setupMessage(base),
      hostResolver,
      path: '/service-chain/node/setup',
    });
    await requested;

    expect(received).to.deep.equal([`${PREFIX}/service-chain/node/setup`]);
  });

  it('broadcastSetupCallback should log, not reject, when the remote node answers 404', async () => {
    statusCode = 404;
    const unhandled = sinon.spy();
    process.on('unhandledRejection', unhandled);
    const logged = new Promise<void>((resolve) =>
      sinon.stub(Logger, 'error').callsFake(() => resolve()),
    );

    try {
      await Ext.broadcastSetupCallback({
        message: setupMessage(base),
        hostResolver,
        path: '/service-chain/node/setup',
      });
      await logged;
      await new Promise((resolve) => setImmediate(resolve));

      const errorStub = Logger.error as sinon.SinonStub;
      expect(errorStub.calledOnce).to.be.true;
      expect(errorStub.firstCall.args[0]).to.contain(
        `${base}/service-chain/node/setup`,
      );
      expect(unhandled.called).to.be.false;
    } finally {
      process.removeListener('unhandledRejection', unhandled);
    }
  });

  it('broadcastSetupCallback should skip configs without resolvable host', async () => {
    sinon.stub(Logger, 'warn');

    await Ext.broadcastSetupCallback({
      message: setupMessage(base),
      hostResolver: () => undefined,
      path: '/service-chain/node/setup',
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(received).to.be.empty;
  });

  it('remoteServiceCallback should POST under the remote sub-path', async () => {
    await Ext.remoteServiceCallback({
      cbPayload: {
        chainId: 'test-chain',
        targetId: 'https://catalog/service',
        meta: { resolver: base },
      },
      hostResolver,
      path: '/service-chain/node/run',
    });

    expect(received).to.deep.equal([`${PREFIX}/service-chain/node/run`]);
  });
});
