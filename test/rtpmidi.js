const helper = require("node-red-node-test-helper");
const rtpMIDINode = require('../rtpmidi/rtpmidi');

helper.init(require.resolve('node-red'));

describe('Basic setup', function () {

  beforeEach(function (done) {
    helper.startServer(done);
  });

  
  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it('should be loaded', function (done) {
    const flow = [{ id: "n1", type: "rtp-midi-mtc-in-node", name: "lower-case" }];
    helper.load(rtpMIDINode, flow, function () {
      const n1 = helper.getNode("n1");
      n1.should.have.property('name', 'lower-case');
      done();
    });
  });
});