const rtpmidi = require('rtpmidi');

module.exports = function(RED) {

  function LocalRTPMIDISession(n) {
    RED.nodes.createNode(this,n);
    this.localName = n.localName;
    this.bonjourName = n.bonjourName;
    this.port = n.port;

    this._session = rtpmidi.manager.createSession({
      localName: this.localName,
      bonjourName: this.bonjourName,
      port: parseInt(this.port) // When sent from UI, parsed as string
    });

    this.on('close', function(done) {
      rtpmidi.manager.reset(function() {
        // When all sessions closed, proceed
        done();
      });
    });
  }

  RED.nodes.registerType("local-rtpmidi-session", LocalRTPMIDISession);
};
