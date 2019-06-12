const rtpmidi = require('rtpmidi');
const midi = require('midi');

const session = rtpmidi.manager.createSession({
    localName: 'Local session',
    bonjourName: 'Node RTPMidi',
    port: 5004
});

const input = new midi.input();
const output = new midi.output();

input.openPort(2);

session.on('ready', function() {
  // Send a note
});

// Route the messages
session.on('message', function(deltaTime, message) {
  console.log('Received a message', message);
});


input.on('message', function(deltaTime, message) {
  console.log(deltaTime, message)
  // The message is an array of numbers corresponding to the MIDI bytes:
  //   [status, data1, data2]
  // https://www.cs.cf.ac.uk/Dave/Multimedia/node158.html has some helpful
  // information interpreting the messages.
  session.sendMessage(message)
});
input.ignoreTypes(false, false, false);

input.emit('message', 0, [0x90, 0x09, 0xff])
// Connect to a remote session
session.connect({ address: '127.0.0.1', port: 5006 });