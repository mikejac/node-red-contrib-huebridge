# node-red-contrib-huebridge

A Philips Hue Bridge *emulator* to control any kind of lights (or other things for that matter).

> This is a work in progress!

## Linux: Run http server on port 80 as non-root user
Ref.: [stackoverflow](https://stackoverflow.com/questions/16573668/best-practices-when-running-node-js-with-port-80-ubuntu-linode)

    sudo apt install libcap2-bin
    sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``

**Note 1:** The Philips Hue app seems only to be able to connect to port 80.

**Note 2:** The above `setcap` command does not survive a reboot.

## Installation
To install - change to your Node-RED user directory.

        cd ~/.node-red
        npm install node-red-contrib-huebridge

## Nodes in this package

### On/Off Light
...

### Dimmable Light
...

### Color Light
...

### Extended Color Light

Support colormode 'hs' (hue, saturation), 'xy' (CIE 1931 Chromacity) and 'ct' (color temperature).

### Color Temperature Light
...

### Link Button
Enables pairing.

`topic` can be anything (i.e. the node does not use it).

`payload` can be anything (i.e. the node does not use it).


### Manage
....

### Sensors

##### ZGP Switch (Hue Tap)
Emulate a Hue Tap with it's four buttons.

`topic` can be anything (i.e. the node does not use it).
`payload` must be a number.
Valid payload numbers: `1, 2, 3, 4`.

##### ZLL Switch (Hue Wireless Dimmer Switch)
Not implemented.

##### ZLL Presence (Hue Motion Sensor)
Not implemented.

##### ZLL Temperature
Not implemented.

##### ZLL Lightlevel
Not implemented.

##### CLIP Switch
Not implemented as a node.

##### CLIP OpenClose
Not implemented as a node.

##### CLIP Presence
Not implemented as a node.

##### CLIP Temperature
Not implemented as a node.

##### CLIP Humidity
Not implemented as a node.

##### CLIP Lightlevel
Not implemented as a node.

##### CLIP Generic Flag Sensor
Not implemented as a node.

## Notes

1. The timezone can be set using the Hue App but these nodes will always use the timezone setup on the server running Node-RED.

2. HomeKit interface is not implemented.

3. None of the remote access features will work.

4. The transfom node will handle transitions but it might not work very well. It does a transition calculation once every 100ms and that might simply be too much depending on your setup.

## Examples

1) Red at 100% brightness (using hue, saturation - colormode 'hs')

    topic = setstate
    payload (JSON) = {"transitiontime":4,"on":true,"bri":254,"colormode":"hs","hue":0,"sat":254}

2) Green at 100% brightness (using hue, saturation - colormode 'hs')

    topic = setstate
    payload (JSON) = {"transitiontime":4,"on":true,"bri":254,"colormode":"hs","hue":21845,"sat":254}

3) Blue at 100% brightness (using hue, saturation - colormode 'hs')

    topic = setstate
    payload (JSON) = {"transitiontime":4,"on":true,"bri":254,"colormode":"hs","hue":43690,"sat":254}

4) White at 100% brightness (using hue, saturation - colormode 'hs')

    topic = setstate
    payload (JSON) = {"transitiontime":4,"on":true,"bri":254,"colormode":"hs","hue":0,"sat":0}

5) Off

    topic = setstate
    payload (JSON) = {"on":false,"bri":0}

6) On at 100% brightness

    topic = setstate
    payload (JSON) = {"on":true,"bri":254}

## Copyright and license

Copyright 2018 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).