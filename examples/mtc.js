const rtpmidi = require('../node_modules/rtpmidi/index');

const session = rtpmidi.manager.createSession({
  localName: 'My RTPMidi Session',
  bonjourName: 'Node Midi Client',
  port: 5006,
});

// Create a clock
const mtc = new rtpmidi.MTC();

// Init TC and lastTC values
let TC =  ""
let lastTC =  ""

mtc.setSource(session);

mtc.on('change', () => {
  // Log the time code HH:MM:SS:FF
  //console.log(`Position: ${mtc.songPosition} Time: ${mtc.getSMTPEString()}`);
  // Update TC to always get last getSMTPEString value
  TC =  mtc.getSMTPEString();
});

// Connect to a remote session
session.connect({ address: '10.10.90.253', port: 5004 });

// Get Stream unique SSRC to retreive stream to force deconnexion 
let streamSsrc = undefined

// Use event streamAdded to get the stream unique SSRC
session.on('streamAdded', (event) => {
    const { stream } = event;
    console.log(`New stream started. SSRC: ${stream.ssrc}`);
    streamSsrc =  stream.ssrc
  });
/*session.on('streamRemoved', (event) => {
    console.log(`The stream "${event.stream.name}" was removed from the session "${session.localName}"`);
});*/
  
// Use reconnectSession to compare TC and last at fix interval unique SSRC
function reconnectSession(){
    try {
    console.log(`check if value change for the past 10sec TC =  ${TC} and lastTC =  ${lastTC}`)
      if(TC == lastTC){
        console.log('value is the same, we have a problem')
        var stream = session.getStream(streamSsrc);
        if(stream != null){
            console.log(`deleting stream: ${stream.name}`)
            session.removeStream(stream)
        }else{
            console.log(`no more stream`)
            session.connect({ address: '10.10.90.253', port: 5004 });
        }
      }else{
        lastTC = TC
      }
      setTimeout(reconnectSession, 5000);
    } catch (error) {
        console.warn(error)
    }
  }

setTimeout(reconnectSession, 10000); 