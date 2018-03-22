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

/*
Run http server on port 80 as non-root user:
https://stackoverflow.com/questions/16573668/best-practices-when-running-node-js-with-port-80-ubuntu-linode

sudo apt install libcap2-bin
sudo setcap cap_net_bind_service=+ep `readlink -f \`which node\``
*/

"use strict";

const Emitter       = require('events').EventEmitter;
const stoppable     = require('stoppable');
const http          = require('http');

const Aggregation   = require('./Aggregation.js');
const Lights        = require('./Lights.js');
const Groups        = require('./Groups.js');
const Schedules     = require('./Schedules.js');
const Scenes        = require('./Scenes.js');
const Sensors       = require('./Sensors.js');
const Rules         = require('./Rules.js');
const Configuration = require('./Configuration.js');
const Resourcelinks = require('./Resourcelinks.js');
const Capabilities  = require('./Capabilities');
const Datastore     = require('./Datastore.js');
const RuleEngine    = require('./RuleEngine.js');
const SSDP          = require('./Ssdp.js');

//
//
//
class Bridge extends Aggregation(Lights, Groups, Schedules, Scenes, Sensors, Rules, Configuration, Resourcelinks, Capabilities, Datastore, SSDP, RuleEngine, Emitter) {
    static get JSON_HEADERS() {
        return { 'Content-Type': 'application/json' };
    }

    constructor(address, netmask, gateway, mac, port) {
        super();

        this.dsSetNetwork(address, netmask, gateway, mac);
        this.dsSetHttpPort(port);
    }
    //
    //
    //
    start() {
        var   node              = this;
        const graceMilliseconds = 500;

        this.httpServer = stoppable(http.createServer(function(request, response) {
            var obj      = {};
            var urlParts = request.url.split("/");
            var method   = request.method.toLowerCase();

            node.debug("Bridge::httpServer(request): method = " + method);
            node.debug("Bridge::httpServer(request): url    = " + request.url);

            if (method === 'post' || method === 'put') {
                var body = [];
                request.on('data', (chunk) => {
                    body.push(chunk);
                }).on('end', () => {
                    body = Buffer.concat(body).toString();
                    node.debug("Bridge::httpServer(request): body = " + body);

                    if (body.length > 1) {
                        try {
                            obj = JSON.parse(body);
                        } catch (err) {
                            node.debug("Bridge::httpServer(request): JSON error = " + err);
                        }
                    }

                    node.dispatch(response, method, request.url, urlParts, obj);
                });    
            } else if (method === 'get') {
                node.dispatch(response, method, request.url, urlParts, obj);
            } else if (method === 'delete') {
                node.dispatch(response, method, request.url, urlParts, obj);
            } else {
                node.debug("Bridge::httpServer(request): unsupported method");

                response.writeHead(404);
                response.end();
            }
        }), graceMilliseconds);

        this.httpServer.on('error', function(error) {
            if (!error) {
                node.debug("Bridge::httpServer(on-error): unable to start");
                //node.status({fill:"red", shape:"ring", text:"unable to start [0] (p:" + port + ")"});
                return;
            }

            var errorCode = null;
            if (error.code) {
                errorCode = error.code;
            } else if (error.errno) {
                errorCode = error.errno;
            }

            var errorText = "";
            if (errorCode) {
                errorText += errorCode;
            } else {
                errorText += "unable to start [1]";
            }
            errorText += " (p:" + node.port + ")";

            //node.status({fill:"red", shape:"ring", text:errorText});
            //node.error(error);
            node.debug("Bridge::httpServer(on-error): " + errorText);
        });

        // start server
        this.httpServer.listen(this.dsGetHttpPort(), function(error) {
            if (error) {
                node.debug("Bridge::httpServer(listen): " + JSON.stringify(error));
                //node.status({fill:"red", shape:"ring", text:"unable to start [2] (p:" + port + ")"});
                //RED.log.error("HueBridgeNode(listen): " + JSON.stringify(error));
                return;
            }

            // extract the actual port number that was used
            var actualPort = node.httpServer.address().port;
            node.debug("Bridge::httpServer(listen): actualPort = " + actualPort);

            //node.status({fill:"green", shape:"dot", text:"online (p:" + actualPort + ")"});

            // start discovery service after we know the port number
            node.ssdpStart(actualPort);      
        });        

        this.debug("Bridge::start(): staring engines");
        this.ruleEngine();

        /*this.on('data', function(data) {
            node.debug(`Bridge::run(on-data): received data: "${data}"`);
        });*/
    }
    //
    //
    //
    stop(done) {
        this.debug("Bridge::stop(): begin");

        var myself = this;

        this.ssdpStop();

        this.httpServer.stop(function() {
            myself.debug("Bridge::stop(httpServer-stop): begin");

            if (typeof done === 'function') {
                done();
                myself.debug("Bridge::stop(): done ...");
            }

            myself.debug("Bridge::stop(httpServer-stop): end");
        });

        setImmediate(function(){
            myself.httpServer.emit('close');
        });

        this.debug("Bridge::stop(): end");
    }
    //
    //
    //
    dispatch(response, method, url, urlParts, obj) {
        //
        // https://developers.meethue.com/philips-hue-api
        //
        if (this.lightsDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.groupsDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.schedulesDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.scenesDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.sensorsDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.rulesDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.configurationDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.resourcelinksDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.capabilitiesDispatcher(response, method, url, urlParts, obj)) {

        } else if (this.ssdpDispatcher(response, method, url, urlParts, obj)) {

        } else {
            this.debug("Bridge::dispatch(): unsupported API");

            response.writeHead(404);
            response.end();                
        }
    }
    //
    //
    //
    getNewHttpResponse() {
        return new FakeResponse();
    }
    /******************************************************************************************************************
     * web responses
     *
     */
    responseMultiBegin() {
        return [];
    }
    //
    //
    //
    responseMultiAddSuccess(arr, key, value) {
        var r = {success:{}};
        
        r.success[key] = value;

        arr.push(r);
    }
    //
    //
    //
    responseMultiAddError(arr, key, value) {
        var r = {error:{}};
        
        r.success[key] = value;

        arr.push(r);
    }
    //
    //
    //
    responseMultiEnd(arr, response) {
        var resp = JSON.stringify(arr);

        this.debug("Bridge::responseMultiEnd(): resp = " + resp);
        response.writeHead(200, this.JSON_HEADERS);
        response.end(resp);
    }
    //
    //
    //
    responseJSON(response, data) {
        var resp = this.marshalJSON(data);

        response.writeHead(200, this.JSON_HEADERS);
        response.end(resp);
    }
    //
    //
    //
    responseError(response, type, address) {
        var err = {
            error: {
                type: type,
                description: "",
                address: address
            }
        }

        switch (type) {
            case 1:
                err.error.description = "unauthorized user";
                break;
        
            case 2:
                err.error.description = "body contains invalid JSON";
                break;
        
            case 3:
                err.error.description = "resource not available";
                break;

            case 101:
                err.error.description = "link button not pressed";
                break;

            case 608:
                err.error.description = "action error";
                break;

            case 901:
                err.error.description = "internal error";
                break;
        }

        var r = [
            err
        ];

        var resp = JSON.stringify(r);

        response.writeHead(200, this.JSON_HEADERS);
        response.end(resp);

        this.debug("Bridge::responseError(): resp = " + resp);
    }
    //
    //
    //
    marshalJSON(value) {
        return JSON.stringify(value, function(key, value) {
            if (key.charAt(0) == '_') {
                return undefined;
            } else {
                return value;
            }
        });
    }
    //
    //
    //
    debug(data) {
        var now = new Date();
        var str = 'D' + now.toISOString() + ': ' + data;
        console.log(str);
    }
    //
    //
    //
    warn(data) {
        var now = new Date();
        var str = 'W' + now.toISOString() + ': ' + data;
        console.log(str);
    }
};
/******************************************************************************************************************
 * a fake http.ServerResponse used internally - doesn't do anything
 *
 */
class FakeResponse {
    writeHead() {
    }
    end() {
    }
};

module.exports = Bridge;
