const helper = require("node-red-node-test-helper");
const rtpmidi = require('rtpmidi');
const midi = require('midi');

const rtpMIDINode = require('../rtpmidi/rtpmidi');
const localConfigNode = require('../rtpmidi/local-rtpmidi-session');
const remoteConfigNode = require('../rtpmidi/remote-rtpmidi-session');

helper.init(require.resolve('node-red'));

describe('Testing the basic node functionnality', () => {

  beforeEach((done) => {
    helper.startServer(done);
  });

  afterEach((done) => {
    helper.unload();
    helper.stopServer(done);
  });

  it('rtpmidi functionnal - Should add the node stream when session created first', (done) => {
    const BONJOURNAME = "TEST BONJOUR NAME";
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: BONJOURNAME, port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" , wires: [['n2']] },
      { id: "n2", type: "helper" } 
    ];

    const mockedRemoteSession = rtpmidi.manager.createSession({
      localName: 'Session 1',
      bonjourName: 'Node RTPMidi',
      port: 5006  
    });

    mockedRemoteSession.on('streamAdded', function(event) {
      event.should.have.property('stream');
      // Buffer to string contains \u0000 which is a known issue https://github.com/nodejs/node/issues/4775
      event.stream.should.have.property('name', BONJOURNAME + '\u0000');
      done();
    });

    // Will load nodes and start the streams
    helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {});
  });

  // it('rtpmidi functionnal - Should add the node stream when session created after node', (done) => {
  //   const BONJOURNAME = "TEST BONJOUR NAME";
  //   const flow = [
  //     { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: BONJOURNAME, port: 5004 },
  //     { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
  //     { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" , wires: [['n2']] },
  //     { id: "n2", type: "helper" } 
  //   ];
    
  //   helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {
  //     const mockedRemoteSession = rtpmidi.manager.createSession({
  //       localName: 'Session 1',
  //       bonjourName: 'Node RTPMidi',
  //       port: 5006  
  //     });

  //     mockedRemoteSession.on('streamAdded', function(event) {
  //       event.should.have.property('stream');
  //       // Buffer to string contains \u0000 which is a known issue https://github.com/nodejs/node/issues/4775
  //       event.stream.should.have.property('name', BONJOURNAME + '\u0000');
  //       done();
  //     });
  //   });
  // });

  // it('rtpmidi functionnal - Should handle reconnection', (done) => {
  //      const BONJOURNAME = "TEST BONJOUR NAME";
  //   const flow = [
  //     { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: BONJOURNAME, port: 5004 },
  //     { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
  //     { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" , wires: [['n2']] },
  //     { id: "n2", type: "helper" } 
  //   ];

  //   let mockedRemoteSession = rtpmidi.manager.createSession({
  //     localName: 'Session 1',
  //     bonjourName: 'Node RTPMidi',
  //     port: 5006  
  //   });
  //   let connectionCounter = 0;

  //   mockedRemoteSession.on('streamAdded', function(event) {
  //     if(connectionCounter > 0)
  //       done();
      
  //     connectionCounter++;
  //     // End remote session and restart
  //     mockedRemoteSession.end(() => { mockedRemoteSession.start() });
  //   });

  //   // Will load nodes and start the streams
  //   helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {});
    
  // });

  it('rtpmidi functionnal - ', (done) => {
    const flow = [
      { id: "l1", type: "local-rtpmidi-session", localName: "TEST LOCAL NAME", bonjourName: "TEST BONJOUR NAME", port: 5004 },
      { id: "r1", type: "remote-rtpmidi-session", host: "127.0.0.1", port: 5006 },
      { id: "n1", type: "rtp-midi-mtc-in-node", name: "test-load-node", local: "l1", remote: "r1" , wires: [['n2']] },
      { id: "n2", type: "helper" } 
    ];

    const mockedRemoteSession = rtpmidi.manager.createSession({
      localName: 'Session 1',
      bonjourName: 'Node RTPMidi',
      port: 5006  
    });

    const input = new midi.input();
    const mtc = new rtpmidi.MTC();

    input.openVirtualPort('Virtual test port');
    input.on('message', function(deltaTime, message) {
      console.log('INPUT GOT MESSAGE', message)
      mockedRemoteSession.sendMessage(message);
    });
    input.ignoreTypes(false, false, false);

    mockedRemoteSession.on('ready', () => {
      helper.load([rtpMIDINode, localConfigNode, remoteConfigNode], flow, () => {
        const n1 = helper.getNode('n1');
        const n2 = helper.getNode('n2');
        mockedRemoteSession.on('streamAdded', function(event) {
          n2.on('input', (msg) => {
            console.log(msg)
            input.closePort();
            done();
          });
          input.emit('message', mtc.getSMTPEString(), [0xf1]);
        });
      });
    });
  });
});