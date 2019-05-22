const helper = require("node-red-node-test-helper");
const rtpmidi = require('rtpmidi');
const sinon = require('sinon');

const rtpMIDINode = require('../rtpmidi/rtpmidi');

helper.init(require.resolve('node-red'));

describe('Testing the basic node configuration', () => {

  beforeEach((done) => {
    helper.startServer(done);
  });


  afterEach((done) => {

    // n1 should always be the tested node, declare before unloading
    const n1 = helper.getNode('n1');
    helper.unload();

    // Stream ended
    n1._session.should.have.property('readyState', 2);

    helper.stopServer(done);
  });

  it('Should load the right properties', (done) => {
    const flow = [{ id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node" }];

    helper.load(rtpMIDINode, flow, () => {
      const n1 = helper.getNode("n1");

      n1.should.have.property('id', 'n1');
      n1.should.have.property('type', 'rtp-midi-mtc-in-node');
      n1.should.have.property('name', 'test-load-node');

      n1.should.have.property('_mtc');
      n1.should.have.property('_session');

      const { _mtc, _session } = n1;

      _mtc.should.be.an.instanceOf(rtpmidi.MTC);

      _session.should.be.an.instanceOf(rtpmidi.Session);
      _session.should.have.property('localName', 'Node-RED RTP-MIDI session');
      _session.should.have.property('bonjourName', 'Node-RED RTP-MIDI session');
      _session.should.have.property('port', 5006);
      _session.should.have.property('readyState', 0);

      done();
    });
  });

  it('Should send the right payload when mtc gets a change event', (done) => {
    const flow = [{ id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node" }];
    //console.log(Object.keys(helper._logSpy))
    helper.load(rtpMIDINode, flow, () => {
      const n1 = helper.getNode("n1");

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
    });
  });

  it('Should also send the right payload using the helper node inspector method', (done) => {
    const flow = [
      { id: "n1", type: "rtp-midi-mtc-in-node", wires: [["n2"]] },
      { id: "n2", type: "helper" }
    ];

    helper.load(rtpMIDINode, flow, function () {
      var n1 = helper.getNode("n1");
      var n2 = helper.getNode("n2");
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
    });
  });


});
