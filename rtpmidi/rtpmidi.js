let rtpmidi
if (process.env.RTPMIDI_DISABLE === 'true') {
  console.log('RTPMIDI disabled')
} else {
  rtpmidi = require('rtpmidi')
}

const midiTypes = {
  0x80: 'noteoff',
  0x90: 'noteon',
  0xA0: 'polyat',
  0xB0: 'controlchange',
  0xC0: 'programchange',
  0xD0: 'channelat',
  0xE0: 'pitchbend'
}

module.exports = function (RED) {
  function RTPMidiMTCInNode (config) {
    RED.nodes.createNode(this, config)

    if (process.env.RTPMIDI_DISABLE === 'true') {
      this.status({ fill: 'gray', shape: 'dot', text: 'disabled' })
      return
    }

    try {
      const { local, remote, reconnectTime } = config

      if (!local) throw new Error('ERROR: Missing local session config node')
      if (!remote) throw new Error('ERROR: Missing local session config node')

      const localSession = RED.nodes.getNode(local)
      const remoteConfig = RED.nodes.getNode(remote)

      const { _session } = localSession
      const { host, port } = remoteConfig

      this._session = _session

      this._mtc = new rtpmidi.MTC()

      // Listens to session on message to catch 0xf1 and 0xf2
      this._mtc.setSource(this._session)

      this._remote = {
        address: host,
        port: parseInt(port) // When sent from UI, parsed as string
      }

      this._session.on('ready', () => {
        try {
          this._session.connect(this._remote)
          this.status({ fill: 'green', shape: 'dot', text: 'ready' })
        } catch (error) {
          this.warn(error)
          this.status({ fill: 'red', shape: 'dot', text: 'error' })
        }
      })

      this._session.on('error', (err) => {
        console.error(err)
        this.status({ fill: 'red', shape: 'dot', text: 'error' })
      })

      // CHECK IF VALUE CHANGE OVERTIME TO FORCE RECONNECTION WITH THE REMOTE SESSION
      // reconnection Variables
      const globalContext = this.context().global
      let streamID
      let remoteStream = null
      // let SMTPEString = 1
      // const lastSMTPEString = 0

      let streamConnected = false

      // Stream data from remote session. Use event streamAdded to get the stream unique SSRC
      this._session.on('streamAdded', (event) => {
        const { stream } = event
        streamID = stream.ssrc
        this.status({ fill: 'green', shape: 'dot', text: 'connected' })
        console.log('streamAdded', streamID)
        streamConnected = true
      })

      this._session.on('streamRemoved', (event) => {
        console.log('streamRemoved', streamID)
        this.status({ fill: 'yellow', shape: 'dot', text: 'disconnected' })
        streamConnected = false
      })

      // Check if we still get data from stream every 5 secs, if not restart connection.
      function CheckRemoteConnection (session, remote) {
        if (globalContext.get('CheckRemoteConnection')) {
          try {
            console.log('remoteStream exists', !!remoteStream)
            // console.log('SMTPEString', SMTPEString)
            // console.log('lastSMTPEString', lastSMTPEString)
            // console.log('streamID', streamID)
            console.log('streamConnected', streamConnected)
            // if (SMTPEString === lastSMTPEString) {
            //   if (streamID !== undefined) {
            //     remoteStream = session.getStream(streamID)
            //   }
            //   if (remoteStream != null) {
            //     remoteStream.end()
            //   }
            //   session.connect(remote)
            // } else {
            //   lastSMTPEString = SMTPEString
            // }

            if (!streamConnected) {
              session.connect(remote)
            }
          } catch (error) {
            console.warn(error)
          }
        }
      }

      this.CheckRemoteConnectionInterval = setInterval(CheckRemoteConnection, reconnectTime, this._session, this._remote)

      // Intercepts MTL messages before MIDI parsing in the next scope
      this._mtc.on('change', () => {
        // Set SMTPEString to mtc.getSMTPEString() for CheckRemoteConnection()
        // SMTPEString = this._mtc.getSMTPEString()
        // Send to the second output
        this.send([null, {
          payload: {
            position: this._mtc.songPosition,
            time: this._mtc.getSMTPEString()
          }
        }])
        this.status({ fill: 'green', shape: 'dot', text: this._mtc.getSMTPEString() })
      })

      let messageArray = []
      let msg = {}
      let midi = {}
      let channel = 0
      this._session.on('message', (deltaTime, message) => {
        try {
          if (Buffer.isBuffer(message)) {
            for (const val of message.values()) {
              messageArray.push(val)
            }
          }

          // Keep LSB for channel
          channel = messageArray[0] & 0xF
          // Keep MSB for midi message type
          midi.type = midiTypes[messageArray[0] & 0xF0]
          // Skip undefined system exclusive messages not defined in type 0xF?
          if (!!messageArray && !!midi.type) {
            // Midi messageArray array to interpret
            midi.raw = messageArray.slice() // lazy copy
            midi.data = messageArray.splice(1)
            midi.channel = channel + 1
            midi.deltaTime = deltaTime
            msg.midi = midi

            msg.payload = midi.data

            // Send to the first output
            this.send([msg, null])
          }

          messageArray = []
          msg = {}
          midi = {}
        } catch (error) {
          this._err = error.message
          this.error(error.message)
          console.error(error)
          this.status({ fill: 'red', shape: 'dot', text: 'error' })
        }
      })

      // Close all sessions, including remote ones
      this.on('close', (done) => {
        // Closure handled
        if (streamID !== undefined) {
          remoteStream = this._session.getStream(streamID)
        }
        if (remoteStream != null) {
          remoteStream.end()
        }
        clearInterval(this.CheckRemoteConnectionInterval)
        done()
      })
    } catch (error) {
      this._err = error.message
      this.status({ fill: 'red', shape: 'dot', text: 'error' })
    }
  }

  RED.nodes.registerType('rtp-midi-mtc-in-node', RTPMidiMTCInNode)
}
