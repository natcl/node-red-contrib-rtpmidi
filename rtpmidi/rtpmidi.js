const rtpmidi = require('rtpmidi');

module.exports = function(RED) {
  function RTPMidiMTCInNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    var session = rtpmidi.manager.createSession({
      localName: 'Node-RED RTP-MIDI session',
      bonjourName: 'Node-RED RTP-MIDI session',
      port: 5006
    });

    node.mtc = new rtpmidi.MTC();
    node.mtc.setSource(session);
    session.connect({ address: '127.0.0.1', port: 5004 });
    node.mtc.on('change', function() {
      // Log the time code HH:MM:SS:FF
      node.send({payload: {position: node.mtc.songPosition, time: node.mtc.getSMTPEString()}});
    });

    node.on('close', function() {
      session.end();
    });

  }

  RED.nodes.registerType("rtp-midi-mtc-in-node", RTPMidiMTCInNode);
};
