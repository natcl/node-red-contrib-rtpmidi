const rtpmidi = require('rtpmidi');

var midiTypes = {
  0x80: 'noteoff',
  0x90: 'noteon',
  0xA0: 'polyat',
  0xB0: 'controlchange',
  0xC0: 'programchange',
  0xD0: 'channelat',
  0xE0: 'pitchbend'
};

module.exports = function(RED) {
  function RTPMidiMTCInNode(config) {
    RED.nodes.createNode(this, config);

    try {
      if(!config.local) throw new Error("ERROR: Missing local session config node");
      if(!config.remote) throw new Error("ERROR: Missing local session config node");

      const local = RED.nodes.getNode(config.local);
      const remote = RED.nodes.getNode(config.remote);

      this._session = local._session;

      this._mtc = new rtpmidi.MTC();
      this._mtc.setSource(this._session);

      this._remote = {
        address: remote.host,
        port: parseInt(remote.port) // When sent from UI, parsed as string
      };

      // To use in sub-callbacks
      var node = this;

      this._session.on('ready', function() {
        node._session.connect(node._remote);
        node.status({ fill:"green", shape:"dot", text:"ready"});
      });

      const msg = {};
      
      // Intercepts MTL messages before MIDI parsing in the next scope
      this._mtc.on('change', function() {
        // Log the time code HH:MM:SS:FF
        node.send({
          mtc: {
            position: node._mtc.songPosition, 
            time: node._mtc.getSMTPEString()
          },
          payload: {}
        });
      });

      this._session.on('message', function(deltaTime, message) {
        try {
          // Skip undefined system exclusive messages not defined in type
          if(!!message && midiTypes[message[0]]) {
            // Midi message array to interpret
            msg.midi = {};
            msg.midi.raw = message.slice();
            msg.payload = message;
            msg.midi.channel = (message & 0xF) + 1;
            msg.midi.type = midiTypes[message[0]];
            msg.midi.deltaTime = deltaTime;
            msg.midi.data = msg.payload;
            node.send(msg);
          } 
        } catch (error) {
          node._err = error.message;
          node.error(error.message);
          node.status({ fill:"red", shape:"dot", text: "error"});
        }
      });


      rtpmidi.manager.on('remoteSessionAdded', function(event) {
        console.log('A remote session was discovered');
        console.log('Connecting...');
        node._session.connect(event.remoteSession);
      });

      rtpmidi.manager.on('remoteSessionRemoved', function(event) {
        console.log('A remote session disappered');
      });


      // Close all sessions, including remote ones
      this.on('close', function(done) {
        node._session = undefined;
        done();
      });

    } catch (error) {
      this._err = error.message;
      this.status({ fill:"red", shape:"dot", text: "error"});
    }
  }

  RED.nodes.registerType("rtp-midi-mtc-in-node", RTPMidiMTCInNode);
};
