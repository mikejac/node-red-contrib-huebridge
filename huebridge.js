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

    var   os            = require('os');
    const Bridge        = require('./lib/Bridge.js');

    /******************************************************************************************************************
	 * 
	 *
	 */
    function HueBridgeNode(config) {
        RED.nodes.createNode(this, config);

        this.config         = config;
        this.lights         = {};
        this.sensors        = {};
        this.linkButtons    = {};

        var node = this;

        /******************************************************************************************************************
         * network info
         *
         */
        var interfaces  = os.networkInterfaces();
        var address     = config.address;
        var netmask     = config.netmask;
        var gateway     = config.gateway;
        var mac         = "";

        var all = Object.keys(interfaces).map(function (nic) {
            var addresses = interfaces[nic].filter(function (details) {
                if (details.internal === false) {
                    if (details.family === "IPv4" && details.address === address) {
                        netmask = details.netmask;
                        mac     = details.mac;
                        return;
                    }
                }
            });
        });

        if (mac === "") {
            node.error("Interface with address " + address + " not found");
            return;
        }

        this.bridge = new Bridge(address, netmask, gateway, mac, config.port);
        this.bridge.debugFn = RED.log.debug;
        this.bridge.warnFn  = RED.log.warn;
        
        this.bridge.start();

        /******************************************************************************************************************
         * functions called by our 'clients'
         *
         */
        this.register = function(client, type, name, typ, modelid) {
            RED.log.debug("HueBridgeNode(): register; type = " + type);

            if (type === 'light') {
                var lightid = node.bridge.dsCreateLight(client.id, name, typ, modelid);

                RED.log.debug("HueBridgeNode(register-light): name = " + name + ", typ = " + typ);
                RED.log.debug("HueBridgeNode(register-light): lightid = " + lightid);

                this.lights[lightid] = client;

                return lightid;
            } else if (type === 'link') {
                RED.log.debug("HueBridgeNode(link): client.id = " + client.id);

                this.linkButtons[client.id] = client;
                return true;
            } else if (type === 'manage') {
                return true;
            } else if (type === 'zll') {
                var sensorid = node.bridge.dsCreateSensor(typ, client.id, name);

                RED.log.debug("HueBridgeNode(register-zll): name = " + name + ", typ = " + typ);
                RED.log.debug("HueBridgeNode(register-zll): sensorid = " + sensorid);

                this.sensors[sensorid] = client;

                return sensorid;
            }

            return false;
        };

        this.deregister = function(client, type) {
            RED.log.debug("HueBridgeNode(): deregister; type = " + type);

            if (type === 'light') {

            } else if (type === 'link') {

            } else if (type === 'manage') {

            }
        };

        this.remove = function(client, type) {
            RED.log.debug("HueBridgeNode(): remove; type = " + type);

            if (type === 'light') {
                for (var idx in this.lights) {
                    if (client.id === this.lights[idx].id) {
                        RED.log.debug("HueBridgeNode(remove-light): found light!; idx = " + idx);
                        node.bridge.dsDeleteLight(idx);

                        delete this.lights[idx];
                        return;
                    }
                }
            } else if (type === 'link') {
                if (this.linkButtons.hasOwnProperty(client.id)) {
                    RED.log.debug("HueBridgeNode(remove-link): found link!");
                    delete this.linkButtons[client.id];
                }
            } else if (type === 'manage') {

            } else if (type === 'zll') {
                for (var idx in this.sensors) {
                    if (client.id === this.sensors[idx].id) {
                        RED.log.debug("HueBridgeNode(remove-zll): found sensor!; idx = " + idx);
                        node.bridge.dsDeleteSensor(idx);

                        delete this.sensors[idx];
                        return;
                    }
                }
            }
        };

        this.on('close', function(removed, done) {
            node.bridge.stop(done);
            
            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
                RED.log.debug("HueBridgeNode(on-close): restarting");
            }
        });

        /******************************************************************************************************************
         * notifications coming from clients
         *
         */
        this.on('manage', function(action, data) {
            RED.log.debug("HueBridgeNode(on-manage): action = " + action);

            if (action === 'clearconfig') {
                node.bridge.dsClearConfiguration();
                
                node.bridge.emit('rule-engine-reload');
            }
        });
        
        this.on('link', function(state) {
            RED.log.debug("HueBridgeNode(on-link): action = " + state);

            node.bridge.dsSetLinkbutton(state);
        });

        /******************************************************************************************************************
         * notifications coming from the bridge
         *
         */
        this.bridge.on('http-error', function(errorText) {
            RED.log.error("HueBridgeNode(http-error): errorText = " + errorText);
        });

        this.bridge.on('datastore-linkbutton', function(state) {
            RED.log.debug("HueBridgeNode(on-datastore-linkbutton): state = " + state);

            var all = Object.keys(node.linkButtons).map(function (clientid) {
                node.linkButtons[clientid].emit('datastore-linkbutton', state);
            });
        });
        
        this.bridge.on('config-user-created', function(username) {
            RED.log.debug("HueBridgeNode(config-user-created): username =" + username);
        });
        
        this.bridge.on('config-user-deleted', function(username) {
            RED.log.debug("HueBridgeNode(config-user-deleted): username =" + username);
        });
        
        this.bridge.on('config-modified', function() {
            RED.log.debug("HueBridgeNode(config-modified");
        });
        
        this.bridge.on('light-state-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(on-light-state-modified): id = " + id);

            if (node.lights.hasOwnProperty(id)) {
                var client = node.lights[id];

                client.emit('light-state-modified', id, o);
            }
        });
        
        this.bridge.on('light-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(on-light-modified): id = " + id);

            if (node.lights.hasOwnProperty(id)) {
                var client = node.lights[id];

                client.emit('light-modified', id, o);
            }
        });
        
        this.bridge.on('group-created', function(id, o) {
            RED.log.debug("HueBridgeNode(group-created): id =" + id);
        });
        
        this.bridge.on('group-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(group-modified): id =" + id);
        });
        
        this.bridge.on('group-deleted', function(id) {
            RED.log.debug("HueBridgeNode(group-deleted): id =" + id);
        });
        
        this.bridge.on('scene-created', function(id, o) {
            RED.log.debug("HueBridgeNode(scene-created): id =" + id);
        });
        
        this.bridge.on('scene-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(scene-modified): id =" + id);
        });
        
        this.bridge.on('scene-lightstate-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(scene-lightstate-modified): id =" + id);
        });
        
        this.bridge.on('scene-deleted', function(id) {
            RED.log.debug("HueBridgeNode(scene-deleted): id =" + id);
        });
        
        this.bridge.on('sensor-created', function(id, o) {
            RED.log.debug("HueBridgeNode(sensor-created): id =" + id);
        });
        
        this.bridge.on('sensor-deleted', function(id) {
            RED.log.debug("HueBridgeNode(sensor-deleted): id =" + id);
        });
        
        this.bridge.on('sensor-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(sensor-modified): id =" + id);
        });
        
        this.bridge.on('sensor-config-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(sensor-config-modified): id =" + id);
        });
        
        this.bridge.on('sensor-state-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(sensor-state-modified): id =" + id);
        });
        
        this.bridge.on('rule-created', function(id, o) {
            RED.log.debug("HueBridgeNode(rule-created): id =" + id);
        });
        
        this.bridge.on('rule-deleted', function(id) {
            RED.log.debug("HueBridgeNode(rule-deleted): id =" + id);
        });
        
        this.bridge.on('rule-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(rule-modified): id =" + id);
        });
        
        this.bridge.on('resourcelinks-created', function(id, o) {
            RED.log.debug("HueBridgeNode(resourcelinks-created): id =" + id);
        });
        
        this.bridge.on('resourcelinks-deleted', function(id) {
            RED.log.debug("HueBridgeNode(resourcelinks-deleted): id =" + id);
        });
        
        this.bridge.on('resourcelinks-modified', function(id, o) {
            RED.log.debug("HueBridgeNode(resourcelinks-modified): id =" + id);
        });
        
        this.bridge.on('schedule-created', function(id, o, t) {
            RED.log.debug("HueBridgeNode(schedule-created): id =" + id);
        });
        
        this.bridge.on('schedule-deleted', function(id) {
            RED.log.debug("HueBridgeNode(schedule-deleted): id =" + id);
        });
        
        this.bridge.on('schedule-modified', function(id, o, t) {
            RED.log.debug("HueBridgeNode(schedule-modified): id =" + id);
        });
    }

    RED.nodes.registerType("huebridge-client", HueBridgeNode);
    
    /******************************************************************************************************************
	 * 
	 *
	 */
    function LinkButtonNode(config) {
        RED.nodes.createNode(this, config);

        this.timeout    = config.timeout;
        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("huebridge.errors.missing-config"));
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("huebridge.errors.missing-bridge"));
            return;            
        }
        
        this.clientConn.register(this, 'link');

        var node = this;

        node.status({fill:"yellow", shape:"ring", text:"Link disabled"});

        /******************************************************************************************************************
         * notifications coming from the bridge
         *
         */
        this.on('datastore-linkbutton', function (state) {
            RED.log.debug("LinkButtonNode(datastore-linkbutton)");

            if (state) {
                node.status({fill:"green", shape:"ring", text:"Link enabled"});
            } else {
                node.status({fill:"yellow", shape:"ring", text:"Link disabled"});
            }
        });
        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("LinkButtonNode(input)");

            node.clientConn.emit('link', true);

            setTimeout(function(){
                node.clientConn.emit('link', false);
            }, this.timeout * 1000);
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'link');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'link');
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-link", LinkButtonNode);
}