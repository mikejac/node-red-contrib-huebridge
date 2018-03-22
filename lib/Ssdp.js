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

"use strict";

const ssdp = require("peer-ssdp");

class SSDP {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/hue-bridge-discovery
    //
    ssdpDispatcher(response, method, url, urlParts, obj) {
        //this.debug("SSDP::ssdpDispatcher(): url = " + url);

        var api1 = /^\/description.xml$/.exec(url);

        if (api1 && method === 'get') {
            //this.debug("SSDP::ssdpDispatcher(): /description.xml");
            this._ssdpDiscovery(response);
        } else {
            //this.debug("SSDP::ssdpDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    //
    //
    //
    ssdpStart() {
        if (this.dsGetHttpPort() === null || this.dsGetHttpPort() === undefined || this.dsGetHttpPort() <= 0 || this.dsGetHttpPort() >= 65536) {
            this.debug("SSDP::ssdpStart(): invalid port; " + this.dsGetHttpPort());
            return false;
        }

        var node     = this;
        var bridgeId = this.dsGetBridgeID();
        var mac      = this.dsGetMAC().replace(/:/g, "");
        var uuid1    = "uuid:2f402f80-da50-11e1-9b23-" + mac + "::upnp:rootdevice";
        var peer     = ssdp.createPeer();
        
        this.ssdpPeer = peer;

        peer.on("ready", function() {
            node.debug("SSDP::ssdpStart(peer-ready)");

            // send NOTIFY periodocally - every 30seconds
            setInterval(function(){
                peer.alive({
                    LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                    SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                    NT:                 "upnp:rootdevice",
                    USN:                uuid1,
                    'hue-bridgeid':     bridgeId,
                    'CACHE-CONTROL':    "max-age=100"
                });

                peer.alive({
                    LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                    SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                    NT:                 "uuid:2f402f80-da50-11e1-9b23-" + mac,
                    USN:                uuid1,
                    'hue-bridgeid':     bridgeId,
                    'CACHE-CONTROL':    "max-age=100"
                });
 
                peer.alive({
                    LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                    SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                    NT:                 "urn:schemas-upnp-org:device:basic:1",
                    USN:                uuid1,
                    'hue-bridgeid':     bridgeId,
                    'CACHE-CONTROL':    "max-age=100"
                });
            }, 30000);
        });

        peer.on("notify", function(headers, address) {
            //myself.node.debug("SSDP::start(peer-notify): address = " + JSON.stringify(address));
            //myself.node.debug("SSDP::start(peer-notify): headers = " + JSON.stringify(headers));
        });

        peer.on("search", function(headers, address) {
            //myself.node.debug("SSDP::start(peer-search): address = " + JSON.stringify(address));
            //myself.node.debug("SSDP::start(peer-search): headers = " + JSON.stringify(headers));
            peer.reply({
                LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                EXT:                "",
                ST:                 "upnp:rootdevice",
                USN:                uuid1,
                'hue-bridgeid':     bridgeId,
                'CACHE-CONTROL':    "max-age=100"
            }, address);

            peer.reply({
                LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                EXT:                "",
                ST:                 "uuid:2f402f80-da50-11e1-9b23-" + mac,
                USN:                uuid1,
                'hue-bridgeid':     bridgeId,
                'CACHE-CONTROL':    "max-age=100"
            }, address);

            peer.reply({
                LOCATION:           "http://{{networkInterfaceAddress}}:" + node.dsGetHttpPort() + "/description.xml",
                SERVER:             "Linux/3.14.0 UPnP/1.0 IpBridge/1.14.0",
                EXT:                "",
                ST:                 "urn:schemas-upnp-org:device:basic:1",
                USN:                uuid1,
                'hue-bridgeid':     bridgeId,
                'CACHE-CONTROL':    "max-age=100"
            }, address);
        });

        peer.on("found",function(headers, address){
            node.debug("SSDP::ssdpStart(peer-found): address = " + JSON.stringify(address));
            node.debug("SSDP::ssdpStart(peer-found): headers = " + JSON.stringify(headers));
        });

        peer.on("close",function(){
            node.debug("SSDP::ssdpStart(peer-close)");
        });

        peer.start();        

        return true;
    }
    //
    //
    //
    ssdpStop() {
        this.ssdpPeer.close();
    }
    //
    //
    //
    _ssdpDiscovery(response) {
        //this.debug("SSDP::_ssdpDiscovery");
        
        var resp = `
                <root xmlns="urn:schemas-upnp-org:device-1-0">
                <specVersion>
                    <major>1</major>
                    <minor>0</minor>
                </specVersion>
                <URLBase>http://{{URL}}/</URLBase>
                <device>
                    <deviceType>urn:schemas-upnp-org:device:Basic:1</deviceType>
                    <friendlyName>Philips hue ({{ADDRESS}})</friendlyName>
                    <manufacturer>Royal Philips Electronics</manufacturer>
                    <manufacturerURL>http://www.philips.com</manufacturerURL>
                    <modelDescription>Philips hue Personal Wireless Lighting</modelDescription>
                    <modelName>Philips hue bridge 2015</modelName>
                    <modelNumber>BSB002</modelNumber>
                    <modelURL>http://www.meethue.com</modelURL>
                    <serialNumber>{{SERIAL}}</serialNumber>
                    <UDN>uuid:2f402f80-da50-11e1-9b23-{{UUID}}</UDN>
                    <presentationURL>index.html</presentationURL>
                    <iconList>
                        <icon>
                            <mimetype>image/png</mimetype>
                            <height>48</height>
                            <width>48</width>
                            <depth>24</depth>
                            <url>hue_logo_0.png</url>
                        </icon>
                        <icon>
                            <mimetype>image/png</mimetype>
                            <height>120</height>
                            <width>120</width>
                            <depth>24</depth>
                            <url>hue_logo_3.png</url>
                        </icon>
                    </iconList>
                </device>
            </root>`;

        resp = resp.replace("{{URL}}",     this.dsGetAddress() + ":" + this.dsGetHttpPort());
        resp = resp.replace("{{ADDRESS}}", this.dsGetAddress());
        resp = resp.replace("{{SERIAL}}",  this.dsGetMAC().replace(/:/g, ""));
        resp = resp.replace("{{UUID}}",    this.dsGetMAC().replace(/:/g, ""));

        response.writeHead(200, {'Content-Type': 'application/xml'});
        response.end(resp);
    }
};

module.exports = SSDP;
