const rtpmidi = require('rtpmidi');

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
