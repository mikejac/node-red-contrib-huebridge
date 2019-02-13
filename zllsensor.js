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
    function ZLLTemperatureNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("zllsensor.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("zllsensor.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing bridge"});
            return;            
        }

        var node = this;
        
        /*var fakeClient1 = {
            id: this.id + '.1'
        };

        RED.log.debug("ZLLTemperatureNode(): fakeClient1 = " + JSON.stringify(fakeClient1));

        var fakeClient2 = {
            id: this.id + '.2'
        };
        var fakeClient3 = {
            id: this.id + '.3'
        };

        this.presenceid    = this.clientConn.register(fakeClient1, 'zll', 'Motion sensor', 'ZLLPresence');
        this.temperatureid = this.clientConn.register(fakeClient2, 'zll', 'Temperature sensor', 'ZLLTemperature');
        this.presenceid    = this.clientConn.register(fakeClient3, 'zll', 'Light level sensor', 'ZLLLightlevel');*/
        //this.presenceid    = this.clientConn.register(this, 'zll', 'Motion sensor', 'ZLLPresence');
        
        //this.sensorid = this.clientConn.register(this, 'zll', config.name, 'CLIPTemperature');

        //this.switch = node.clientConn.bridge.dsCreateSensor('ZGPSwitch', 'xx0', 'Switch');
        //RED.log.debug("ZLLTemperatureNode(): this.switch = " + this.switch);

        /*var owner = 'Uf0c889b2bdcd4d02a36a833a';

        // virtual motion sensor
        this.clipid = node.clientConn.bridge.dsCreateSensor('CLIPGenericStatus', 'xx1', 'Virtual motion sensor');
        RED.log.debug("ZLLTemperatureNode(): this.clipid = " + this.clipid);

        this.presenceid = node.clientConn.bridge.dsCreateSensor('ZLLPresence', 'xx2', 'Motion sensor');
        RED.log.debug("ZLLTemperatureNode(): this.presenceid = " + this.presenceid);

        this.temperatureid = node.clientConn.bridge.dsCreateSensor('ZLLTemperature', 'xx3', 'Temperature sensor');
        RED.log.debug("ZLLTemperatureNode(): this.temperatureid = " + this.temperatureid);

        //this.lightlevelid = node.clientConn.bridge.dsCreateSensor('ZLLLightlevel', 'xx4', 'Light level sensor');
        //RED.log.debug("ZLLTemperatureNode(): this.lightlevelid = " + this.lightlevelid);

        //
        // Link the physical motion sensor to the virtual motion sensor
        // https://community.home-assistant.io/t/tutorial-adding-hue-motion-sensor-lux-temp-and-motion/5532
        //
        this.ruleid = node.clientConn.bridge.dsCreateRule(owner);
        RED.log.debug("ZLLTemperatureNode(): this.ruleid = " + this.ruleid);

        var rule = node.clientConn.bridge.dsGetRule(this.ruleid);

        rule.conditions = [
            {
                address: '/sensors/' + this.presenceid + '/state/presence',
                operator: "eq",
                value: "true",
                _sensorid: this.presenceid.toString(),
                _key: "presence"
            },
            {
                address: '/sensors/' + this.presenceid + '/state/presence',
                operator: "dx",
                _sensorid: this.presenceid.toString(),
                _key: "presence"
            }
        ];

        rule.actions = [
            {
                address: '/sensors/' + this.clipid + '/state',
                method: 'PUT',
                body: {
                    status: 1
                }
            }
        ];

        //RED.log.debug("ZLLTemperatureNode(): rule = " + JSON.stringify(rule));

        node.clientConn.bridge.dsUpdateRule(this.ruleid, rule);

        RED.log.debug("ZLLTemperatureNode(): rules = " + JSON.stringify(node.clientConn.bridge.dsRules.list));*/

        this.status({fill:"green", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("ZLLTemperatureNode(input): msg = " + JSON.stringify(msg));
            RED.log.debug("ZLLTemperatureNode(input): typeof payload = " + typeof msg.payload);

            var temp = 0;

            if (typeof msg.payload === 'number') {
                temp = Math.round(msg.payload * 100);
            }

            var obj = node.clientConn.bridge.dsGetSensor(node.temperatureid);
            RED.log.debug("ZLLTemperatureNode(input): obj = " + JSON.stringify(obj));

            obj.state.temperature = temp;
            RED.log.debug("ZLLTemperatureNode(input): obj = " + JSON.stringify(obj));
            node.clientConn.bridge.dsUpdateSensorState(node.temperatureid, obj.state);

            /*if (msg.topic.toLowerCase() === "clearconfig") {
                if (typeof msg.payload === 'boolean' && msg.payload === true) {
                    this.status({fill:"green", shape:"dot", text:"Clear config"});
                    setTimeout(function () { node.status({}) }, 5000);

                    node.clientConn.emit('manage', 'clearconfig');
                } else {
                    this.status({fill:"yellow", shape:"dot", text:"Payload must be bool 'true'"});
                    setTimeout(function () { node.status({}) }, 5000);
                }
            } else if (msg.topic.toLowerCase() === "getconfig") {
                this.status({fill:"green", shape:"dot", text:"Get config"});
                setTimeout(function () { node.status({}) }, 5000);

                var c = node.clientConn.bridge.dsGetEverything();

                var msg = {
                    topic: "fullconfig",
                    payload: c
                };
    
                node.send(msg);
            } else if (msg.topic.toLowerCase() === "setconfig") {
                if (node.clientConn.bridge.dsSetEverything(JSON.parse(msg.payload)) === false) {
                    this.status({fill:"red", shape:"dot", text:"Failed to set config"});
                } else {
                    this.status({fill:"green", shape:"dot", text:"Set config success"});
                    setTimeout(function () { node.status({}) }, 5000);
                }
            } else if (msg.topic.toLowerCase() === "getlightids") {
                this.status({fill:"green", shape:"dot", text:"Get light IDs"});
                setTimeout(function () { node.status({}) }, 5000);

                var obj = node.clientConn.bridge.dsGetAllLightNodes();

                var msg = {
                    topic: "lightids",
                    payload: obj
                };
    
                node.send(msg);
            } else if (msg.topic.toLowerCase() === "deletelight") {
                var lightid = msg.payload;

                if (typeof msg.payload === 'number') {
                    lightid = msg.payload.toString();
                }

                if (node.clientConn.bridge.dsDeleteLight(lightid) === false) {
                    this.status({fill:"red", shape:"dot", text:"Failed to delete light"});
                } else {
                    this.status({fill:"green", shape:"dot", text:"Light deleted"});
                    setTimeout(function () { node.status({}) }, 5000);
                }
            }*/
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'zll');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'manage');
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-zlltemperature", ZLLTemperatureNode);
}