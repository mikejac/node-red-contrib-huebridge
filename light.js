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
    function LightOnOffNode(config) {
        RED.nodes.createNode(this, config);

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
        
        this.lightid = this.clientConn.register(this, 'light', config.name, "0x0000", config.typ);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightOnOffNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        setTimeout(function(node) {
            RED.log.debug("LightOnOffNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);

        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            RED.log.debug("LightOnOffNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {     // well, this doesn't make sense for an on/off light ...
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('colormode')) {
                changedState.colormode = object.colormode;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }

            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightOnOffNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightOnOffNode(input)");

            if (msg.topic === 'success' || msg.topic.toUpperCase() === 'SETSTATE') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightOnOffNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                if (msg.topic.toUpperCase() === 'SETSTATE') {
                    process.nextTick(() => {
                        node.emit('light-state-modified', node.lightid, node.light.state);
                    });
                }
            }

            /*if (msg.topic === 'success') {
                // this is a message that comes back from the actual device - don't send it, just update the state
                // ....
            } else if (msg.topic.toUpperCase() === 'SETSTATE') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightOnOffNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                process.nextTick(() => {
                    node.emit('light-state-modified', node.lightid, node.light.state);
                });
            }*/
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

    RED.nodes.registerType("huebridge-light-onoff", LightOnOffNode);

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightDimmableNode(config) {
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
        
        this.lightid = this.clientConn.register(this, 'light', config.name, "0x0100", config.typ);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightDimmableNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        setTimeout(function(node) {
            RED.log.debug("LightDimmableNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);

        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            RED.log.debug("LightDimmableNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }
    
            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightDimmableNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightDimmableNode(input)");

            if (msg.topic === 'success') {
                // this is a message that comes back from the actual device - don't send it, just update the state
                // ....
            } else if (msg.topic.toUpperCase() === 'setstate') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightExtendedColorNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                process.nextTick(() => {
                    node.emit('light-state-modified', node.lightid, node.light.state);
                });                
            }
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

    RED.nodes.registerType("huebridge-light-dimmable", LightDimmableNode);

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightColorNode(config) {
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
        
        this.lightid = this.clientConn.register(this, 'light', config.name, "0x0200", config.typ);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightColorNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        setTimeout(function(node) {
            RED.log.debug("LightColorNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);

        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            RED.log.debug("LightColorNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('hue')) {
                changedState.hue = object.hue;
            }
            if (object.hasOwnProperty('sat')) {
                changedState.sat = object.sat;
            }
            if (object.hasOwnProperty('ct')) {
                changedState.ct = object.ct;
            }
            if (object.hasOwnProperty('xy')) {
                changedState.xy = object.xy;
            }
            if (object.hasOwnProperty('colormode')) {
                changedState.colormode = object.colormode;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }
    
            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightColorNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightColorNode(input)");

            if (msg.topic === 'success') {
                // this is a message that comes back from the actual device - don't send it, just update the state
            } else if (msg.topic.toUpperCase() === 'SETSTATE') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightColorNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('hue')) {
                    node.light.state.hue = object.hue;
                }
                if (object.hasOwnProperty('sat')) {
                    node.light.state.sat = object.sat;
                }
                if (object.hasOwnProperty('ct')) {
                    node.light.state.ct = object.ct;
                }
                if (object.hasOwnProperty('xy')) {
                    node.light.state.xy = object.xy;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                process.nextTick(() => {
                    node.emit('light-state-modified', node.lightid, node.light.state);
                });                
            }
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

    RED.nodes.registerType("huebridge-light-color", LightColorNode);

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightExtendedColorNode(config) {
        RED.nodes.createNode(this, config);

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

        RED.log.debug("LightExtendedColorNode(startup): config.typ = " + config.typ);
        
        this.lightid = this.clientConn.register(this, 'light', config.name, "0x0210", config.typ);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightExtendedColorNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        setTimeout(function(node) {
            RED.log.debug("LightExtendedColorNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);

        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            RED.log.debug("LightExtendedColorNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('hue')) {
                changedState.hue = object.hue;
            }
            if (object.hasOwnProperty('sat')) {
                changedState.sat = object.sat;
            }
            if (object.hasOwnProperty('ct')) {
                changedState.ct = object.ct;
            }
            if (object.hasOwnProperty('xy')) {
                changedState.xy = object.xy;
            }
            if (object.hasOwnProperty('colormode')) {
                changedState.colormode = object.colormode;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }
    
            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightExtendedColorNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightExtendedColorNode(input)");

            if (msg.topic.toUpperCase() === 'SETSTATE') {
                if (typeof msg.payload === 'object') {
                    process.nextTick(() => {
                        node.emit('light-state-modified', node.lightid, msg.payload);
                    });
                    
                    return;
                } else {
                    RED.log.debug("LightExtendedColorNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }
            }

            if (msg.topic === 'success' || msg.topic.toUpperCase() === 'SETSTATE') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightExtendedColorNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('hue')) {
                    node.light.state.hue = object.hue;
                }
                if (object.hasOwnProperty('sat')) {
                    node.light.state.sat = object.sat;
                }
                if (object.hasOwnProperty('ct')) {
                    node.light.state.ct = object.ct;
                }
                if (object.hasOwnProperty('xy')) {
                    node.light.state.xy = object.xy;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                /*if (msg.topic.toUpperCase() === 'SETSTATE') {
                    process.nextTick(() => {
                        node.emit('light-state-modified', node.lightid, node.light.state);
                    });
                }*/
            }


            //if (msg.topic === 'success') {
                // this is a message that comes back from the actual device - don't send it, just update the state
                // ....
            //} else if (msg.topic.toUpperCase() === 'SETSTATE') {
                /*var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightExtendedColorNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('hue')) {
                    node.light.state.hue = object.hue;
                }
                if (object.hasOwnProperty('sat')) {
                    node.light.state.sat = object.sat;
                }
                if (object.hasOwnProperty('ct')) {
                    node.light.state.ct = object.ct;
                }
                if (object.hasOwnProperty('xy')) {
                    node.light.state.xy = object.xy;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);*/

            //    process.nextTick(() => {
            //        node.emit('light-state-modified', node.lightid, node.light.state);
            //    });
            //}
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

    RED.nodes.registerType("huebridge-light-extcolor", LightExtendedColorNode);

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LightColorTemperatureNode(config) {
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
        
        this.lightid = this.clientConn.register(this, 'light', config.name, "0x0220", config.typ);

        if (this.lightid === false) {
            this.error(RED._("light.errors.light-create"));
            this.status({fill:"red", shape:"dot", text:RED._("light.errors.light-create")});
            return;
        }

        var node = this;

        // get a COPY of the light
        this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        RED.log.debug("LightColorTemperatureNode(startup): light = " + JSON.stringify(this.light));

        this.status({fill:"green", shape:"dot", text:"Ready"});

        setTimeout(function(node) {
            RED.log.debug("LightColorTemperatureNode(): initial write");

            outputState(node, node.light.state, node.light.state);
        }, 100, node);

        //
        // light state change
        //
        this.on('light-state-modified', function(id, object) {
            RED.log.debug("LightColorTemperatureNode(light-state-modified): object = " + JSON.stringify(object));
            
            var changedState = {};

            if (object.hasOwnProperty('on')) {
                changedState.on = object.on;
            }
            if (object.hasOwnProperty('transitiontime')) {
                changedState.transitiontime = object.transitiontime;
            }
            if (object.hasOwnProperty('bri')) {
                changedState.bri = object.bri;
            }
            if (object.hasOwnProperty('ct')) {
                changedState.ct = object.ct;
            }
            if (object.hasOwnProperty('colormode')) {
                changedState.colormode = object.colormode;
            }
            if (object.hasOwnProperty('effect')) {
                changedState.effect = object.effect;
            }

            this.status({fill:"green", shape:"dot", text:"Light state changed"});
            setTimeout(function () { node.status({}) }, 3000);

            outputState(node, node.light.state, changedState);
            
            // update our copy
            this.light = node.clientConn.bridge.dsGetLight(this.lightid);
        });
        //
        // light modified
        //
        this.on('light-modified', function(id, object) {
            RED.log.debug("LightColorTemperatureNode(light-modified): object = " + JSON.stringify(object));

            this.status({fill:"green", shape:"dot", text:"Light config modified"});
            setTimeout(function () { node.status({}) }, 3000);
        });
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LightColorTemperatureNode(input)");

            if (msg.topic === 'success') {
                // this is a message that comes back from the actual device - don't send it, just update the state
                // ....
            } else if (msg.topic.toUpperCase() === 'SETSTATE') {
                var object = {};

                if (typeof msg.payload === 'object') {
                    object = msg.payload;
                } else {
                    RED.log.debug("LightColorTemperatureNode(input): typeof payload = " + typeof msg.payload);
                    return;
                }

                if (object.hasOwnProperty('on')) {
                    node.light.state.on = object.on;
                }
                if (object.hasOwnProperty('transitiontime')) {
                    node.light.state.transitiontime = object.transitiontime;
                }
                if (object.hasOwnProperty('bri')) {
                    node.light.state.bri = object.bri;
                }
                if (object.hasOwnProperty('ct')) {
                    node.light.state.ct = object.ct;
                }
                if (object.hasOwnProperty('colormode')) {
                    node.light.state.colormode = object.colormode;
                }
                if (object.hasOwnProperty('effect')) {
                    node.light.state.effect = object.effect;
                }

                node.clientConn.bridge.dsUpdateLightState(node.lightid, node.light.state);

                process.nextTick(() => {
                    node.emit('light-state-modified', node.lightid, node.light.state);
                });                
            }
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

    RED.nodes.registerType("huebridge-light-colortemp", LightColorTemperatureNode);

    //
    //
    //
    var outputState = function(node, fullState, changedState) {
        var payload1 = {
            topic:      'fullstate',
            payload:    fullState
        };

        var payload2 = {
            topic:      'write',
            payload:    changedState
        };

        RED.log.debug("LightNode::outputState(): payload1 = " + JSON.stringify(payload1));
        RED.log.debug("LightNode::outputState(): payload2 = " + JSON.stringify(payload2));

        node.send(payload2, payload1);
    }
    //
    //
    //
    /*function hue_rgb_to_xy(rgb) {
        // Default to white
        float red   = 1.0f;
        float green = 1.0f;
        float blue  = 1.0f;
    
        // Apply gamma correction
        float r = (red   > 0.04045f) ? pow((red   + 0.055f) / (1.0f + 0.055f), 2.4f) : (red   / 12.92f);
        float g = (green > 0.04045f) ? pow((green + 0.055f) / (1.0f + 0.055f), 2.4f) : (green / 12.92f);
        float b = (blue  > 0.04045f) ? pow((blue  + 0.055f) / (1.0f + 0.055f), 2.4f) : (blue  / 12.92f);
    
        // Wide gamut conversion D65
        float X = r * 0.664511f + g * 0.154324f + b * 0.162028f;
        float Y = r * 0.283881f + g * 0.668433f + b * 0.047685f;
        float Z = r * 0.000088f + g * 0.072310f + b * 0.986039f;
    
        float cx = X / (X + Y + Z);
        float cy = Y / (X + Y + Z);
    
        if (isnan(cx)) {
            cx = 0.0f;
        }
    
        if (isnan(cy)) {
            cy = 0.0f;
        }
    
        struct xy xy = { .x = cx, .y = cy };
    
        return xy;
    }*/
}
