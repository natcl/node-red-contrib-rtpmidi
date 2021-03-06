const rtpmidi = require('rtpmidi');

module.exports = function(RED) {

  function LocalRTPMIDISession(n) {
    RED.nodes.createNode(this,n);
    this.localName = n.localName;
    this.bonjourName = n.bonjourName;
    this.port = n.port;

    try {

      this._session = rtpmidi.manager.createSession({
        localName: this.localName,
        bonjourName: this.bonjourName,
        port: parseInt(this.port) // When sent from UI, parsed as string
      });

      this._session.on('error', function(err) {
        console.error(err);
      });


      var node = this;
      this.on('close', function(done) {
        rtpmidi.manager.reset(function() {
         /*  // Close everything properly
          console.log('THERE SHOULD BE NO SESSIONS NOW', rtpmidi.manager.getSessions())
          const sessions = rtpmidi.manager.getSessions();
          function next() {
            if(rtpmidi.manager.getSessions().length != 0) {
              console.log('Still not cleared')

              next();
            } else {
              done();
            }
          }
          next(); */
          done();
        });
      });
    } catch (error) {
      console.log(error);
      this.status({ fill:"red", shape:"dot", text: "error"});
    }

  }

  RED.nodes.registerType("local-rtpmidi-session", LocalRTPMIDISession);
};
