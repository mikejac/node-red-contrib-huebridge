/**
 * NodeRED Hue Bridge
 * Copyright (C) 2018 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

module.exports = function(RED) {
    "use strict";

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightNode(config) {
        RED.nodes.createNode(this, config);

        this.timer      = null;
        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("light.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("light.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing bridge"});
            return;            
        }
        
        this.lightid = this.clientConn.register(this, 'light', config);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        //
        // light state change
        //
        this.on('light-state-modified', function(id, objectX) {
            RED.log.debug("LightNode(light-state-modified): object = " + JSON.stringify(objectX));
            
            var object = {
                state: objectX
            };

            var payload = {
                current: node.light.state,
                new: {}
            };

            switch (node.light._typ) {
                case 0x0000:    // On/off Light
                    if (object.state.hasOwnProperty('on')) {
                        payload.new.on = object.state.on;
                    }
                    if (object.state.hasOwnProperty('transitiontime')) {
                        payload.new.transitiontime = object.state.transitiontime;
                    }
                    break;
    
                case 0x0100:    // Dimmable Light
                    if (object.state.hasOwnProperty('on')) {
                        payload.new.on = object.state.on;
                    }
                    if (object.state.hasOwnProperty('transitiontime')) {
                        payload.new.transitiontime = object.state.transitiontime;
                    }
                    if (object.state.hasOwnProperty('bri')) {
                        payload.new.bri = object.state.bri;
                    }
                    break;
    
                case 0x0200:    // Color Light
                    if (object.state.hasOwnProperty('on')) {
                        payload.new.on = object.state.on;
                    }
                    if (object.state.hasOwnProperty('transitiontime')) {
                        payload.new.transitiontime = object.state.transitiontime;
                    }
                    if (object.state.hasOwnProperty('bri')) {
                        payload.new.bri = object.state.bri;
                    }
                    if (object.state.hasOwnProperty('hue')) {
                        payload.new.hue = object.state.hue;
                    }
                    if (object.state.hasOwnProperty('sat')) {
                        payload.new.sat = object.state.sat;
                    }
                    if (object.state.hasOwnProperty('xy')) {
                        payload.new.xy = object.state.xy;
                    }
                    if (object.state.hasOwnProperty('colormode')) {
                        payload.new.colormode = object.state.colormode;
                    }
                    if (object.state.hasOwnProperty('effect')) {
                        payload.new.effect = object.state.effect;
                    }
                    break;
    
                case 0x0210:    // Extended Color Light
                    if (object.state.hasOwnProperty('on')) {
                        payload.new.on = object.state.on;
                    }
                    if (object.state.hasOwnProperty('transitiontime')) {
                        payload.new.transitiontime = object.state.transitiontime;
                    }
                    if (object.state.hasOwnProperty('bri')) {
                        payload.new.bri = object.state.bri;
                    }
                    if (object.state.hasOwnProperty('hue')) {
                        payload.new.hue = object.state.hue;
                    }
                    if (object.state.hasOwnProperty('sat')) {
                        payload.new.sat = object.state.sat;
                    }
                    if (object.state.hasOwnProperty('ct')) {
                        payload.new.ct = object.state.ct;
                    }
                    if (object.state.hasOwnProperty('xy')) {
                        payload.new.xy = object.state.xy;
                    }
                    if (object.state.hasOwnProperty('colormode')) {
                        payload.new.colormode = object.state.colormode;
                    }
                    if (object.state.hasOwnProperty('effect')) {
                        payload.new.effect = object.state.effect;
                    }
                    break;
    
                case 0x0220:    // Color Temperature Light
                    if (object.state.hasOwnProperty('on')) {
                        payload.new.on = object.state.on;
                    }
                    if (object.state.hasOwnProperty('transitiontime')) {
                        payload.new.transitiontime = object.state.transitiontime;
                    }
                    if (object.state.hasOwnProperty('ct')) {
                        payload.new.ct = object.state.ct;
                    }
                    if (object.state.hasOwnProperty('colormode')) {
                        payload.new.colormode = object.state.colormode;
                    }
                    break;
    
                default:
                    RED.log.debug("LightNode(light-state-modified): invalid light type");
                    return;
            }
    
            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            var msg = {
                topic: "change",
                payload: payload
            };

            outputState(node, msg);

            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        //
        //
        /*this.on('hue-remove', function() {
            RED.log.debug("LightNode(hue-remove)");
            node.status({fill:"yellow", shape:"dot", text:"Light removed"});
        });*/
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightNode(input)");
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'light');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'light');
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-light", LightNode);

    //
    //
    //
    var outputState = function(node, msg) {
        /*msg.payload.current.hue = scaleHue(msg.payload.current.hue);
        msg.payload.current.sat = scaleSaturation(msg.payload.current.sat);
        msg.payload.current.bri = scaleBrightness(msg.payload.current.bri);

        if (msg.payload.new.hasOwnProperty('hue')) {
            msg.payload.new.hue = scaleHue(msg.payload.new.hue);
        }
        if (msg.payload.new.hasOwnProperty('sat')) {
            msg.payload.new.sat = scaleSaturation(msg.payload.new.sat);
        }
        if (msg.payload.new.hasOwnProperty('bri')) {
            msg.payload.new.bri = scaleBrightness(msg.payload.new.bri);
        }*/

        node.send(msg);        
    }
    //
    var scaleHue = function(hue) {
        // scale from 0 - 65535 => 0.0 - 360.0
        var v = hue / 182.04166;
        return v > 360.0 ? 360.0 : v; 
    }
    //
    var scaleSaturation = function(sat) {
        // scale from 0 - 254 => 0.0 - 100.0
        var v = sat / 2.54;
        return v > 100 ? 100 : v; 
    }
    //
    var scaleBrightness = function(bri) {
        // scale from 1 to 254 => 0 - 100%
        var v = Math.round(bri / 2.54);
        return v > 100 ? 100 : v; 
    }
}
