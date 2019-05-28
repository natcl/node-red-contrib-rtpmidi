const rtpmidi = require('rtpmidi');

var midiTypes = {
  '8': 'noteoff',
  '9': 'noteon',
  '10': 'polyat',
  '11': 'controlchange',
  '12': 'programchange',
  '13': 'channelat',
  '14': 'pitchbend'
};

module.exports = function(RED) {
  function RTPMidiMTCInNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;

    try {

      if(!config.local) throw new Error("ERROR: Missing local session config node");
      if(!config.remote) throw new Error("ERROR: Missing local session config node");

      const local = RED.nodes.getNode(config.local);
      const remote = RED.nodes.getNode(config.remote);

      node._session = rtpmidi.manager.createSession({
        localName: local.localName,
        bonjourName: local.bonjourName,
        port: parseInt(local.port) // When sent from UI, parsed as string
      });

      node._mtc = new rtpmidi.MTC();
      node._mtc.setSource(node._session);
      node._remote = {
        address: remote.host,
        port: parseInt(remote.port) // When sent from UI, parsed as string
      }

      node._session.connect(node._remote);

      node._session.on('ready', function() {
        node.status({ fill:"green", shape:"dot", text:"ready"});
      });

      node._session.on('message', function(deltaTime, message) {
        // For compliance with the node-red-contrib-midi package
        const msg = {};
        msg.midi = {};
        msg.midi.raw = message.slice();
        msg.payload = message.splice(1);

        msg.midi.deltaTime = deltaTime;
        msg.midi.channel = (message & 0xF) + 1;
        msg.midi.type = midiTypes[message >> 4];
        msg.midi.data = msg.payload;

        node.send(msg);
      });

      node._mtc.on('change', function() {
        // Log the time code HH:MM:SS:FF
        node.send({payload: {position: node._mtc.songPosition, time: node._mtc.getSMTPEString()}});
      });

      node.on('close', function() {
        node._session.end();
        node.status({ fill:"blue", shape:"dot", text:"closed"});
      });
    } catch (error) {
      node._err = error.message;
      node.status({ fill:"red", shape:"dot", text: "error"});
    }
  }

  RED.nodes.registerType("rtp-midi-mtc-in-node", RTPMidiMTCInNode);
};
