# node-red-contrib-huebridge

A Philips Hue Bridge *emulator* to control any kind of lights (or other things for that matter).

> This is a work in progress!

## Linux: Run http server on port 80 as non-root user
Ref.: [stackoverflow](https://stackoverflow.com/questions/16573668/best-practices-when-running-node-js-with-port-80-ubuntu-linode)

    sudo apt install libcap2-bin
    sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``

**Note:** The Philips Hue app seems only to be able to connect to port 80.

## Installation
To install - change to your Node-RED user directory.

        cd ~/.node-red
        npm install node-red-contrib-huebridge

##Nodes in this package

### Light
...

### Link Button
...

### Manage
....

## Copyright and license

Copyright 2018 Michael Jacobsen under [the GNU General Public License version 3](LICENSE).