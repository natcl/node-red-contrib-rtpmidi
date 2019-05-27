const helper = require("node-red-node-test-helper");
const rtpmidi = require('rtpmidi');
const sinon = require('sinon');

const rtpMIDINode = require('../rtpmidi/rtpmidi');
const localConfigNode = require('../rtpmidi/local-rtpmidi-session');
const remoteConfigNode = require('../rtpmidi/remote-rtpmidi-session');

helper.init(require.resolve('node-red'));

describe('Testing the basic node configuration', () => {

  beforeEach((done) => {
    helper.startServer(done);
  });

  afterEach((done) => {

    // n1 should always be the tested node, declare before unloading
    const n1 = helper.getNode('n1');

    helper.unload(); // Why node.emit('close') is being called
    // Ensures that on close is properly handled

    if(!!n1._session)
      n1._session.should.have.property('readyState', 2);

    helper.stopServer(done);
  });

  it('Should load the right properties', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" }
    ];


    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {
      try {
        const l1 = helper.getNode("l1");
        const r1 = helper.getNode("r1");
        const n1 = helper.getNode("n1");

        n1.should.not.have.property('_err');

        n1.should.have.property('id', 'n1');
        n1.should.have.property('type', 'rtp-midi-mtc-in-node');
        n1.should.have.property('name', 'test-load-node');

        n1.should.have.property('_mtc');
        n1.should.have.property('_session');

        const { _mtc, _session } = n1;

        _mtc.should.be.an.instanceOf(rtpmidi.MTC);

        _session.should.be.an.instanceOf(rtpmidi.Session);
        _session.should.have.property('localName', l1.localName);
        _session.should.have.property('bonjourName', l1.bonjourName);
        _session.should.have.property('port', l1.port);
        _session.should.have.property('readyState', 0);
        _session.should.have.property('ipVersion', 4);

        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('Should send the right payload when mtc gets a change event', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" }
    ];

    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {

      try {
        const n1 = helper.getNode("n1");

        n1.should.not.have.property('_err');

        // Lets spy on our node send method
        sinon.spy(n1, "send");

        /*
        * node.send is called when an mtc change event happens.
        * Which means something was received on the network.
        */
        n1._mtc.emit('change');

        const { lastArg } = n1.send.getCall(0);
        lastArg.should.have.property('payload');

        const { payload }  = lastArg;
        payload.should.have.property('position');
        payload.should.have.property('time');

        const { position, time } = payload;

        position.should.equal(0);
        time.should.equal(n1._mtc.getSMTPEString());
        // Before getting any real MTC event, this is normal
        time.should.equal('00:00:00:00');

        done();
      } catch (error) {
        done(error);
      }
    });
  });

  it('Should send the right payload when session gets a message event', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1", wires: [['n2']] },
      { id: "n2", type: "helper" }
    ];

    const midiMessage = [0x90, 0x0e, 0xff];
    const deltaTime = 0;

    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {
      try {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");

        n1.should.not.have.property('_err');

        // Copy before sending as the node with call operations on the message instance
        const midiMessageClone = midiMessage.slice(0);

        n2.on('input', (msg) => {
          try {
            msg.should.have.property('midi');
            msg.should.have.property('payload');

            const { midi, payload } = msg;
            const params = midiMessageClone.slice(1);

            midi.should.have.property('raw', midiMessageClone);
            midi.should.have.property('deltaTime', deltaTime);
            midi.should.have.property('channel', 1);
            midi.should.have.property('type', 'noteon');
            midi.should.have.property('data', params);

            payload.should.equal(midi.data);

            done();
          } catch (error) {
            done(error);
          }
        });

        n1._session.emit('message', deltaTime, midiMessage);
      } catch (error) {
        done(error);
      }
    });
  });

  it('Should also send the right payload using the helper node inspector method', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", local: 'l1', remote: 'r1', wires: [["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, function () {

      try {
        const n1 = helper.getNode("n1");
        const n2 = helper.getNode("n2");

        n1.should.not.have.property('_err');
        n2.should.not.have.property('_err');

        n2.on("input", function (msg) {
          const { payload }  = msg;
          payload.should.have.property('position');
          payload.should.have.property('time');

          const { position, time } = payload;

          position.should.equal(0);
          time.should.equal(n1._mtc.getSMTPEString());
          // Before getting any real MTC event, this is normal
          time.should.equal('00:00:00:00');

          done();
        });

        n1._mtc.emit('change');
      } catch (error) {
        done(error);
      }
    });
  });
});

describe('Testing the configuration nodes', () => {
  beforeEach((done) => {
    helper.startServer(done);
  });

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('Should load the right values', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 }
    ];

    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {
      try {
        const l1 = helper.getNode('l1');
        const r1 = helper.getNode('r1');

        l1.should.have.property('localName', 'TEST LOCAL NAME');
        l1.should.have.property('bonjourName', 'TEST BONJOUR NAME');
        l1.should.have.property('port', 5004);

        r1.should.have.property('host', '127.0.0.1');
        r1.should.have.property('port', 5006);

        done();
      } catch (error) {
        done(error);
      }
    });
  });
});
