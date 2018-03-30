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
    function ZGPSwitchNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);
        this.timer      = null;

        if (!this.clientConn) {
            this.error(RED._("zllswitch.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("zllswitch.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing bridge"});
            return;            
        }

        this.switchid = this.clientConn.register(this, 'zll', config.name, 'ZGPSwitch');

        if (this.switchid === false) {
            this.error(RED._("zllswitch.errors.create"));
            this.status({fill:"red", shape:"dot", text:RED._("zllswitch.errors.create")});
            return;
        }

        var node = this;
        
        this.status({fill:"green", shape:"dot", text:"Ready"});

        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("ZGPSwitchNode(input): msg = " + JSON.stringify(msg));
            RED.log.debug("ZGPSwitchNode(input): typeof payload = " + typeof msg.payload);

            var buttonid = 0;

            if (typeof msg.payload === 'number') {
                switch (msg.payload) {
                    case 1:
                        buttonid = 34;
                        node.status({fill:"green", shape:"dot", text:"Button 1"});
                        setTimeout(function () { node.status({}) }, 5000);
                        break;

                    case 2:
                        buttonid = 16;
                        node.status({fill:"green", shape:"dot", text:"Button 2"});
                        setTimeout(function () { node.status({}) }, 5000);
                        break;

                    case 3:
                        buttonid = 17;
                        node.status({fill:"green", shape:"dot", text:"Button 3"});
                        setTimeout(function () { node.status({}) }, 5000);
                        break;

                    case 4:
                        buttonid = 18;
                        node.status({fill:"green", shape:"dot", text:"Button 4"});
                        setTimeout(function () { node.status({}) }, 5000);
                        break;

                    default:
                        return;                        
                }
            }

            var obj = node.clientConn.bridge.dsGetSensor(node.switchid);
            RED.log.debug("ZGPSwitchNode(input): obj = " + JSON.stringify(obj));

            obj.state.buttonevent = buttonid;

            RED.log.debug("ZGPSwitchNode(input): obj = " + JSON.stringify(obj));
            node.clientConn.bridge.dsUpdateSensorState(node.switchid, obj.state);

            setTimeout(function(node) {
                RED.log.debug("ZGPSwitchNode(timer):");
    
                var obj = node.clientConn.bridge.dsGetSensor(node.switchid);
                RED.log.debug("ZGPSwitchNode(timer): obj = " + JSON.stringify(obj));
    
                obj.state.buttonevent = 0;
    
                RED.log.debug("ZGPSwitchNode(timer): obj = " + JSON.stringify(obj));
                node.clientConn.bridge.dsUpdateSensorState(node.switchid, obj.state);
            }, 1000, node);
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'zll');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'zll');
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-zgpswitch", ZGPSwitchNode);
}