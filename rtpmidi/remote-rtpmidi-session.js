module.exports = function(RED) {

  function RemoteRTPMIDISession(n) {

    RED.nodes.createNode(this,n);
    this.host = n.host;
    this.port = n.port;
  }

  RED.nodes.registerType("remote-rtpmidi-session", RemoteRTPMIDISession);
};
