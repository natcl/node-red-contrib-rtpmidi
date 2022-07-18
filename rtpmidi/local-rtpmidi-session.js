const rtpmidi = require('rtpmidi')
const os = require('os')

module.exports = function (RED) {
  function LocalRTPMIDISession (n) {
    RED.nodes.createNode(this, n)
    this.localName = n.localName
    this.bonjourName = n.bonjourName
    this.port = n.port

    try {
      this._session = rtpmidi.manager.createSession({
        localName: `${os.hostname()} ${this.localName}`,
        bonjourName: `${os.hostname()} ${this.bonjourName}`,
        port: parseInt(this.port) // When sent from UI, parsed as string
      })

      this._session.on('error', function (err) {
        console.error(err)
      })

      this.on('close', function (done) {
        try {
          rtpmidi.manager.reset(done)
        } catch (error) {
          console.error(error)
          done(error)
        }
      })
    } catch (error) {
      console.log(error)
    }
  }

  RED.nodes.registerType('local-rtpmidi-session', LocalRTPMIDISession)
}
