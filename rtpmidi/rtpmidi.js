const rtpmidi = require('rtpmidi');

module.exports = function(RED) {
  function RTPMidiMTCInNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    node._session = rtpmidi.manager.createSession({
      localName: 'Node-RED RTP-MIDI session',
      bonjourName: 'Node-RED RTP-MIDI session',
      port: 5006
    });

    node._mtc = new rtpmidi.MTC();
    node._mtc.setSource(node._session);
    node._session.connect({ address: '127.0.0.1', port: 5004 });
    node._mtc.on('change', function() {
      // Log the time code HH:MM:SS:FF
      node.send({payload: {position: node._mtc.songPosition, time: node._mtc.getSMTPEString()}});
    });

    node.on('close', function() {
      node._session.end();
    });

  }

  RED.nodes.registerType("rtp-midi-mtc-in-node", RTPMidiMTCInNode);
};
