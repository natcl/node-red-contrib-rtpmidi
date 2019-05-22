# node-red-contrib-rtpmidi

Also known as AppleMIDI, RTP-MIDI is a protocol aimed at serving MIDI messages over RTP (Real-time Protocol) packets.


## Tests
The testing strategy follows the one of [node-red-test-helper](https://github.com/node-red/node-red-node-test-helper).
As node-rtpmidi has an optionnal dependency to mDNS, node-mdns is also listed as a dev-dependency.
Make sure you installed follow the instructions stated in the [mDNS](https://www.npmjs.com/package/mdns) package before proceading.
Eg. on Ubuntu 18.04:
````
sudo apt-get install avahi-daemon avahi-discover libnss-mdns libavahi-compat-libdnssd-dev
sudo service dbus start && service avahi-daemon start
```` 

### Running them
``` bash
# Make sure you have the node dependencies
npm install

# Run tests
npm test
```