/**
 * NodeRED Hue Bridge
 * Copyright (C) 2018 Michael Jacobsen / Marius Schmeding.
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
    function HueBridgeNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        this.register = function(client) {
            RED.log.debug("HueBridgeNode(): register");
        };

        this.deregister = function(client) {
            RED.log.debug("HueBridgeNode(): deregister");
        };

        this.remove = function(client) {
            RED.log.debug("HueBridgeNode(): remove");
        };

        this.on('close', function(removed, done) {
            if (removed) {
                // this node has been deleted
            } else {
                // this node is being restarted
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-client", HueBridgeNode);

    /******************************************************************************************************************
	 * 
	 *
	 */
    function LinkButtonNode(config) {
        RED.nodes.createNode(this, config);

        this.client     = config.client;
        this.clientConn = RED.nodes.getNode(this.client);

        if (!this.clientConn) {
            this.error(RED._("huebridge.errors.missing-config"));
            return;
        }
        
        this.clientConn.register(this);

        var node = this;

        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            RED.log.debug("LinkButtonNode(input)");
        });

        this.on('close', function(removed, done) {
            node.clientConn.deregister(node);

            if (removed) {
                // This node has been deleted
            } else {
                // This node is being restarted
            }
            
            done();
        });
    }

    RED.nodes.registerType("huebridge-link", LinkButtonNode);
}