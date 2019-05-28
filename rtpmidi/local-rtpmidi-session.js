module.exports = function(RED) {

  function LocalRTPMIDISession(n) {
    RED.nodes.createNode(this,n);
    this.localName = n.localName;
    this.bonjourName = n.bonjourName;
    this.port = n.port;
  }

  RED.nodes.registerType("local-rtpmidi-session", LocalRTPMIDISession);
};
