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
    function ManageNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("manage.errors.missing-config"));
            this.status({fill:"red", shape:"dot", text:"Missing config"});
            return;
        } else if (typeof this.clientConn.register !== 'function') {
            this.error(RED._("manage.errors.missing-bridge"));
            this.status({fill:"red", shape:"dot", text:"Missing bridge"});
            return;            
        }
        
        this.clientConn.register(this, 'manage', config);
        this.status({fill:"green", shape:"dot", text:"Ready"});

        var node = this;

        //
        //
        //
        this.on('hue-remove', function() {
            RED.log.debug("ManageNode(hue-remove)");
        });
        /******************************************************************************************************************
         * respond to inputs from NodeRED
         *
         */
        this.on('input', function (msg) {
            RED.log.debug("ManageNode(input): msg = " + JSON.stringify(msg));

            if (msg.topic.toLowerCase() === "clearconfig") {
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
            }
        });

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
                node.clientConn.remove(node, 'manage');
            } else {
                // this node is being restarted
                node.clientConn.deregister(node, 'manage');
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-manage", ManageNode);
}