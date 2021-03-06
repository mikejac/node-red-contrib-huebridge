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
When you configure conflicting parameters, only one parameter is accepted, the priority is:
- xy beats ct, ct beats hue, hue beats sat.
*/

"use strict";

const storage = require('node-persist');
const fs      = require('fs');

class Datastore {
    constructor() {
        storage.initSync();

        this.dsInitConfiguration(false);
        this.dsInitLights(false);
        this.dsInitGroups(false);
        this.dsInitSchedules(false);
        this.dsInitScenes(false);
        this.dsInitSensors(false);
        this.dsInitRules(false);
        this.dsInitResourcelinks(false);
        this.dsInitCapabilities(false);
    }
    //
    //
    //
    dsShutdown() {
        this.dsSaveAllLights();
        this.dsSaveConfiguration();
    }
    dsGetEverything() {
        return JSON.parse(JSON.stringify({
            config:         this.dsGetConfig(),
            lights:         this.dsLights,
            groups:         this.dsGroups,
            schedules:      this.dsSchedules,
            scenes:         this.dsScenes,
            sensors:        this.dsSensors,
            rules:          this.dsRules,
            resourcelinks:  this.dsResourcelinks
        }));
    }
    dsSetEverything(obj) {
        if (!obj.hasOwnProperty('config')) {
            this.warn("Datastore::dsSetEverything(): config object missing");
            return false;
        }
        if (!obj.hasOwnProperty('lights')) {
            this.warn("Datastore::dsSetEverything(): lights object missing");
            return false;
        }
        if (!obj.hasOwnProperty('groups')) {
            this.warn("Datastore::dsSetEverything(): groups object missing");
            return false;
        }
        if (!obj.hasOwnProperty('schedules')) {
            this.warn("Datastore::dsSetEverything(): schedules object missing");
            return false;
        }
        if (!obj.hasOwnProperty('scenes')) {
            this.warn("Datastore::dsSetEverything(): scenes object missing");
            return false;
        }
        if (!obj.hasOwnProperty('sensors')) {
            this.warn("Datastore::dsSetEverything(): sensors object missing");
            return false;
        }
        if (!obj.hasOwnProperty('rules')) {
            this.warn("Datastore::dsSetEverything(): rules object missing");
            return false;
        }
        if (!obj.hasOwnProperty('resourcelinks')) {
            this.warn("Datastore::dsSetEverything(): resourcelinks object missing");
            return false;
        }

        this.dsInitConfiguration(true, obj.config);
        this.dsInitLights(true, obj.lights);
        this.dsInitGroups(true, obj.groups);
        this.dsInitSchedules(true, obj.schedules);
        this.dsInitScenes(true, obj.scenes);
        this.dsInitSensors(true, obj.sensors);
        this.dsInitRules(true, obj.rules);
        this.dsInitResourcelinks(true, obj.resourcelinks);
        this.dsInitCapabilities(true);
        
        return true;
    }
    //
    //
    //
    dsClearConfiguration() {
        this.dsInitConfiguration(true);
        //this.dsInitLights(true);
        this.dsInitGroups(true);
        this.dsInitSchedules(true);
        this.dsInitScenes(true);
        this.dsInitSensors(true);
        this.dsInitRules(true);
        this.dsInitResourcelinks(true);
        this.dsInitCapabilities(true);
    }
    /******************************************************************************************************************
     * lights
     *
     */
    dsInitLights(clear, obj) {
        this.dsLights = storage.getItemSync('dsLights');
        if (typeof this.dsLights === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsLights = {
                    list: {},
                    nodelist: {
                        nextfree: 1,
                        nodes: {}
                    },
                    clients: {}
                };
            } else {
                this.dsLights = {
                    list: JSON.parse(JSON.stringify(obj.list)),
                    nodelist: {
                        nextfree: obj.nodelist.nextfree,
                        nodes: JSON.parse(JSON.stringify(obj.nodelist.nodes))
                    },
                    clients: JSON.parse(JSON.stringify(obj.clients))
                };
            }
            storage.setItemSync('dsLights', this.dsLights);
        }
    }
    dsGetNewLightId(clientid) {
        if (typeof clientid !== 'string') {
            this.debug("Datastore::dsNewLightId(): 'clientid' must be a string");
            return false;
        }

        if (this.dsLights.nodelist.nodes.hasOwnProperty(clientid)) {
            // client already exists
            this.debug("Datastore::dsGetNewLightId(): client already exists; clientid: " + clientid);

            return this.dsLights.nodelist.nodes[clientid];
        } else {
            // client does not exist
            this.debug("Datastore::dsGetNewLightId(): client does not already exist; clientid: " + clientid);

            var newId = this.dsLights.nodelist.nextfree;
            this.dsLights.nodelist.nextfree++;

            this.dsLights.nodelist.nodes[clientid] = newId;

            return newId;
        }
    }
    /*  
        Gamut A - Color Light
        Color	x	    y
        Red	    0.704	0.296
        Green	0.2151	0.7106
        Blue	0.138	0.08
    
    
        Gamut B - Extended Color Light
        Color	x	    y
        Red	    0.675	0.322
        Green	0.409	0.518
        Blue	0.167	0.04
    */
    dsCreateLight(clientid, name, type, model) {
        if (typeof clientid !== 'string') {
            this.debug("Datastore::dsCreateLight(): 'clientid' must be a string");
            return false;
        }

        if (this.dsLights.nodelist.nodes.hasOwnProperty(clientid)) {
            // client already exists
            this.debug("Datastore::dsCreateLight: client already exists; clientid: " + clientid);

            return this.dsLights.nodelist.nodes[clientid];
        }

        var capabilities = {
            certified: true,    // oh well
            streaming: {
                renderer: false,
                proxy: false
            }
        };

        var swupdate = {
            state: "notupdatable",
            lastinstall: "2018-02-02T00:00:00"
        };

        //var state = this.dsCreateLightState();

        var l = {
            _typ: 0xFFFF,
            state: this.dsCreateLightState(), //state,
            capabilities: capabilities,
            config: {},
            swupdate: swupdate,
            type: "", //devicetype,
            name: name,
            modelid: "", //modelid,
            manufacturername: "Philips", //"Node-RED",
            uniqueid: clientid,
            swversion: "99999999",
            swconfigid: "FF6681C4" //, // <---
            //productid: "node-red-contrib-huebridge"
        };

        //var _typ       = 0xFFFF;
        //var devicetype = "";
        //var modelid    = "";

        // https://developers.meethue.com/documentation/supported-lights
        if (type === "0x0000") {          // On/off Light
            l._typ          = 0x0000;
            l.type          = "On/off Light";
            l.modelid       = "NR001";
            //_typ            = 0x0000;
            //devicetype      = "On/off Light";
            //modelid         = "NR001";
        } else if (type === "0x0100") {   // Dimmable Light
            l._typ          = 0x0100;
            l.type          = "Dimmable Light";
            l.modelid       = "LWB010";
            l.productid     = "Philips-LWB010-1-A19DLv4";
            l.productname   = "Hue white lamp";
            l.swversion     = "1.29.0_r21169";
            l.swconfigid    = "FF6681C4";

            l.capabilities.control = {
                mindimlevel: 5000,
                maxlumen:    806
            };

            l.config = {
                archetype: "classicbulb",
                function:  "functional",
                direction: "omnidirectional"
            };

            //_typ            = 0x0100;
            //devicetype      = "Dimmable Light";
            //modelid         = "LWB010";
        } else if (type === "0x0200") {   // Color Light - Color Gamut A
            l._typ          = 0x0200;
            l.type          = "Color Light";
            l.modelid       = "LST001";
            //_typ            = 0x0200;
            //devicetype      = "Color Light";
            //modelid         = "LST001";
        } else if (type === "0x0210") {   // Extended Color Light - Color Gamut B
            l._typ          = 0x0210;
            l.uniqueid      = "00:17:88:01:03:ac:b0:43-0b";
                            //"00:17:88:a5:f1:7e" - bridge MAC
            l.type          = "Extended Color Light";
            l.modelid       = "LCT015";
            l.productid     = "Philips-LCT015-1-A19ECLv5";
            l.productname   = "Hue color lamp";
            l.swversion     = "1.29.0_r21169";
            l.swconfigid    = "3416C2DD";

            l.capabilities.control = {
                mindimlevel: 1000,
                maxlumen:    806,
                colorgamuttype: "C",
                colorgamuttype: "other",
                colorgamut: [
                    [
                        0.0000,
                        0.0000
                    ],
                    [
                        0.0000,
                        0.0000
                    ],
                    [
                        0.0000,
                        0.0000
                    ]
                ],
                ct: {
                    min: 153,
                    max: 500
                }            
            };

            l.capabilities.streaming.renderer = true;
            l.capabilities.streaming.proxy    = true;

            l.config = {
                archetype: "sultanbulb",
                function:  "mixed",
                direction: "omnidirectional"
            };
            //_typ            = 0x0210;
            //devicetype      = "Extended Color Light";
            //modelid         = "LCT001";
        } else if (type === "0x0220") {   // Color Temperature Light
            l._typ          = 0x0220;
            l.type          = "Color Temperature Light";
            l.modelid       = "LTW011";
            //_typ            =  0x0220;
            //devicetype      = "Color Temperature Light";
            //modelid         = "LTW011";
            l.state.colormode = "ct";
        } else {
            this.warn("Invalid light type '" + type + "'");
            return false;
        }

        if (typeof model === 'string') {
            l.modelid = model;
        }
        
        var id                    = this.dsGetNewLightId(clientid);
        this.dsLights.list[id]    = l;
        this.dsLights.clients[id] = clientid;      // save the clientid so that we can find it later on

        storage.setItemSync('dsLights', this.dsLights);

        return id;
    }
    dsCreateLightState() {
        var state      = {
            colormode: "hs",                // “hs” for Hue and Saturation, “xy” for XY and “ct” for Color Temperature
            effect: "none",                 // “none” or “colorloop”
            hue: 0,                         // uint16
            sat: 0,                         // uint8
            xy: [0.442365,0.459879],        // [x, y], both x and y must be between 0.0000 and 1.0000
            bri: 254,                       // uint8, 1 to 254
            ct: 233,                        // uint16, Mirek color temperature; 153 (6500K) to 500 (2000K).
            on: false,
            transitiontime: 4,              // multiple of 100ms, defaults to 4 (400ms)
            alert: "none",
            mode: "homeautomation",
            reachable: true
            // stream: {}
        };

        return state;
    }
    dsDeleteLight(id) {
        if (this.dsLights.list.hasOwnProperty(id)) {
            var groupIds = this.dsGetAllGroupIDs();
            for (var idx in groupIds) {
                this.dsRemoveLightFromGroup(groupIds[idx], id);
            }

            var sceneIds = this.dsGetAllSceneIDs();
            for (var idx in sceneIds) {
                this.dsRemoveLightFromScene(sceneIds[idx], id);
            }

            var scheduleIds = this.dsGetAllScheduleIDs();
            for (var idx in scheduleIds) {
                this.dsRemoveLightFromSchedule(scheduleIds[idx], id);
            }

            var resourcelinkIds = this.dsGetAllResourcelinkIDs();
            for (var idx in resourcelinkIds) {
                this.dsRemoveLightFromResourcelinks(resourcelinkIds[idx], id);
            }

            var ruleIds = this.dsGetAllRuleIDs();
            for (var idx in ruleIds) {
                this.dsRemoveLightFromRule(ruleIds[idx], id);
            }

            var clientid = this.dsLights.clients[id];

            delete this.dsLights.nodelist.nodes[clientid];
            delete this.dsLights.clients[id];
            delete this.dsLights.list[id];

            storage.setItemSync('dsLights', this.dsLights);

            return true;
        } else {
            this.debug("Datastore::dsDeleteLight() light does not exists; id = " + id);
            return false;
        }
    }
    dsGetLight(id) {
        if (this.dsLights.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsLights.list[id]));
        } else {
            this.debug("Datastore::dsGetLight() light does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateLight(id, o) {
        if (this.dsLights.list.hasOwnProperty(id)) {
            this.dsLights.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsLights', this.dsLights);
            return true;
        } else {
            this.debug("Datastore::dsUpdateLight() light does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateLightState(id, state) {
        if (this.dsLights.list.hasOwnProperty(id)) {
            this.dsLights.list[id].state = JSON.parse(JSON.stringify(state));
            return true;
        } else {
            this.debug("Datastore::dsUpdateLightState() light does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllLights() {
        return this.dsLights.list;
    }
    dsGetAllLightIDs() {
        var result = [];

        var all = Object.keys(this.dsLights.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsGetAllLightNodes() {
        var ids = this.dsGetAllLightIDs();

        var result = {};

        for (var idx in ids) {
            var lightid = ids[idx];

            var obj = {
                clientid: this.dsLights.clients[lightid],
                type:     this.dsLights.list[lightid].type,
                _typ:     this.dsLights.list[lightid]._typ
            };

            result[lightid] = obj;
        }

        return result;
    }
    dsSaveAllLights() {
        storage.setItemSync('dsLights', this.dsLights);        
    }
    /******************************************************************************************************************
     * groups
     *
     */
    dsInitGroups(clear, obj) {
        this.dsGroups = storage.getItemSync('dsGroups');
        if (typeof this.dsGroups === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsGroups = {
                    list:       {},
                    nextfree:   1
                };
            } else {
                this.dsGroups = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };
            }
            storage.setItemSync('dsGroups', this.dsGroups);
        }
    }
    dsGetNewGroupId() {
        var newId = this.dsGroups.nextfree;
        this.dsGroups.nextfree++;

        return newId;
    }
    dsCreateGroup(name) {
        var g = {
            name: name,
            lights: [],
            type: "LightGroup",
            state: {
                all_on: false,
                any_on: false
            },
            recycle: false,
            class: "Other",
            action: {
                colormode: "hs",                // “hs” for Hue and Saturation, “xy” for XY and “ct” for Color Temperature
                effect: "none",
                hue: 0,                         // uint16
                sat: 0,                         // uint8
                xy: [0.0000, 0.0000],           // [x, y], both x and y must be between 0.0000 and 1.0000
                bri: 0,                         // uint8, 0 to 255
                ct: 500,                        // uint16, Mirek color temperature; 153 (6500K) to 500 (2000K).
                on: false,
                transitiontime: 4,              // multiple of 100ms, defaults to 4 (400ms)
                alert: "none",
            }
        }
    
        var id                    = this.dsGetNewGroupId();
        this.dsGroups.list[id]    = g;
        storage.setItemSync('dsGroups', this.dsGroups);

        return id;
    }
    dsDeleteGroup(id) {
        if (this.dsGroups.list.hasOwnProperty(id)) {
            delete this.dsGroups.list[id];
            storage.setItemSync('dsGroups', this.dsGroups);
            return true;
        } else {
            this.debug("Datastore::dsDeleteGroup() group does not exists; id = " + id);
            return false;
        }
    }
    dsGetGroup(id) {
        if (this.dsGroups.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsGroups.list[id]));
        } else {
            this.debug("Datastore::dsGetGroup() group does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateGroup(id, o) {
        if (this.dsGroups.list.hasOwnProperty(id)) {
            this.dsGroups.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsGroups', this.dsGroups);
            return true;
        } else {
            this.debug("Datastore::dsUpdateGroup() group does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllGroups() {
        return this.dsGroups.list;
    }
    dsGetAllGroupIDs() {
        var result = [];

        var all = Object.keys(this.dsGroups.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsRemoveLightFromGroup(id, lightid) {
        this.debug("Datastore::dsRemoveLightFromGroup() id = " + id + ", lightid = " + lightid);

        for (var idx in this.dsGroups.list[id].lights) {
            this.debug("  Datastore::dsRemoveLightFromGroup() idx = " + idx + "; lightid = " + this.dsGroups.list[id].lights[idx]);

            if (lightid === this.dsGroups.list[id].lights[idx]) {
                this.debug("    Datastore::dsRemoveLightFromGroup() found light!");
                //delete this.dsGroups.list[id].lights[idx];

                this.dsGroups.list[id].lights.splice(idx, 1);

                storage.setItemSync('dsGroups', this.dsGroups);
            }
        }
    }
    /******************************************************************************************************************
     * scenes
     *
     */
    dsInitScenes(clear, obj) {
        this.dsScenes = storage.getItemSync('dsScenes');
        if (typeof this.dsScenes === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsScenes = {
                    list:       {}
                };
            } else {
                this.dsScenes = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };                
            }
            storage.setItemSync('dsScenes', this.dsScenes);
        }
    }
    dsGetNewSceneId() {
        var newId = this.dsUuidGenerate("S");

        return newId;
    }
    dsCreateScene(username) {
        var s = {
            name: "",
            lights: [],
            owner: username,
            recycle: true,
            locked: false,
            appdata: {},
            picture: "",
            effect: "",
            lastupdated: this.dsDateString(),
            version: 2,                         // scene created via POST, lightstates available
            lightstates: {}
        }

        var id                    = this.dsGetNewSceneId();
        this.dsScenes.list[id]    = s;
        storage.setItemSync('dsScenes', this.dsScenes);

        return id;
    }
    dsDeleteScene(id) {
        if (this.dsScenes.list.hasOwnProperty(id)) {
            delete this.dsScenes.list[id];
            storage.setItemSync('dsScenes', this.dsScenes);
            return true;
        } else {
            this.debug("Datastore::dsDeleteScene() scene does not exists; id = " + id);
            return false;
        }
    }
    dsGetScene(id) {
        if (this.dsScenes.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsScenes.list[id]));
        } else {
            this.debug("Datastore::dsGetScene() scene does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateScene(id, o) {
        if (this.dsScenes.list.hasOwnProperty(id)) {
            o.lastupdated          = this.dsDateString();
            this.dsScenes.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsScenes', this.dsScenes);
            return true;
        } else {
            this.debug("Datastore::dsUpdateScene() scene does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllScenes() {
        return this.dsScenes.list;
    }
    dsGetAllSceneIDs() {
        var result = [];

        var all = Object.keys(this.dsScenes.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsRemoveLightFromScene(id, lightid) {
        this.debug("Datastore::dsRemoveLightFromScene() id = " + id + ", lightid = " + lightid);

        for (var idx in this.dsScenes.list[id].lightstates) {
            this.debug("  Datastore::dsRemoveLightFromScene() idx = " + idx);

            if (lightid === idx) {
                this.debug("    Datastore::dsRemoveLightFromScene() found light!");
                delete this.dsScenes.list[id].lightstates[idx];

                storage.setItemSync('dsScenes', this.dsScenes);
            }
        }
    }
    /******************************************************************************************************************
     * sensors
     * https://developers.meethue.com/documentation/supported-sensors
     *
     */
    dsInitSensors(clear, obj) {
        this.dsSensors = storage.getItemSync('dsSensors');
        if (typeof this.dsSensors === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsSensors = {
                    list:       {},
                    //nextfree:   1
                    nodelist: {
                        nextfree: 1,
                        nodes: {}
                    },
                    clients: {}
                };
            } else {
                this.dsSensors = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    //nextfree:   obj.nextfree
                    nodelist: {
                        nextfree: obj.nodelist.nextfree,
                        nodes: JSON.parse(JSON.stringify(obj.nodelist.nodes))
                    },
                    clients: JSON.parse(JSON.stringify(obj.clients))
                };
            }
            storage.setItemSync('dsSensors', this.dsSensors);
        }

        /*
        ** A sensor indicating the switch between daylight and night for a given location.
        ** This sensor is implemented in the bridge and is always available.
        */
        if (!this.dsSensors.list.hasOwnProperty(1)) {
            this.dsCreateSensor('Daylight');

            /*var id = this.dsCreateSensor('Daylight');
            var o  = this.dsGetSensor(id);

            if (o !== false) {
                o.name                  = "Daylight";
                o.type                  = "Daylight";
                o.modelid               = "PHDL00";
                o.manufacturername      = "Philips";
                o.swversion             = "1.0";
                o.state.daylight        = false;
                o.state.lastupdated     = "none";
                o.config.on             = true;
                o.config.long           = "none";
                o.config.lat            = "none";
                o.config.configured     = false;
                o.config.sunriseoffset  = 30;
                o.config.sunsetoffset   = -30;

                this.dsUpdateSensor(id, o);
            }*/
        }
    }
    dsGetNewSensorId(clientid) {
        if (typeof clientid === 'undefined') {
            var newId = this.dsSensors.nodelist.nextfree;
            this.dsSensors.nodelist.nextfree++;

            return newId;
        } else if (typeof clientid === 'string') {
            if (this.dsSensors.nodelist.nodes.hasOwnProperty(clientid)) {
                // client already exists
                this.debug("Datastore::dsGetNewSensorId(): client already exists; clientid: " + clientid);
    
                return this.dsSensors.nodelist.nodes[clientid];
            } else {
                // client does not exist
                this.debug("Datastore::dsGetNewSensorId(): client does not already exist; clientid: " + clientid);
    
                var newId = this.dsSensors.nodelist.nextfree;
                this.dsSensors.nodelist.nextfree++;
    
                this.dsSensors.nodelist.nodes[clientid] = newId;
    
                return newId;
            }    
        } else {
            this.debug("Datastore::dsNewSensorId(): 'clientid' must be a string");
            return false;            
        }
    }
    dsCreateSensor(typ, clientid, name) {
        if (typeof clientid === 'string' && this.dsSensors.nodelist.nodes.hasOwnProperty(clientid)) {
            // client already exists
            this.debug("Datastore::dsCreateSensor(): client already exists; clientid: " + clientid);

            return this.dsSensors.nodelist.nodes[clientid];
        }
        
        var s = {
            name: "",
            type: "",
            modelid: "",
            manufacturername: "Node-RED",
            uniqueid: this.dsUuidGenerate('s'),
            swversion: "1.0",
            state: {
                lastupdated: "none"
            },
            config: {
                on: false,
                reachable: true
            },
            recycle: false
        }

        if (typeof typ !== 'undefined') {
            var zll  = false;
            var clip = false;

            switch (typ) {
                case 'ZGPSwitch':                       // ZGP Switch (Hue Tap)
                    zll                     = true; 
                    s.name                  = "ZGPSwitch";
                    s.type                  = "ZGPSwitch";
                    s.modelid               = "ZGPSWITCH";
                    s.manufacturername      = "Philips";
                    s.state.buttonevent     = null;
                    break;

                case 'ZLLSwitch':                       // ZLL Switch (Hue Wireless Dimmer Switch)
                    zll                     = true; 
                    s.name                  = "ZLLSwitch";
                    s.type                  = "ZLLSwitch";
                    s.modelid               = "RWL021";
                    s.manufacturername      = "Philips";
                    s.state.buttonevent     = null;
                    break;

                case 'ZLLPresence':                     // ZLL Presence (Hue Motion Sensor)
                    zll                     = true; 
                    s.uniqueid              = "00:17:88:01:02:00:d0:5b-02-0406";
                    s.name                  = "ZLLPresence";
                    s.type                  = "ZLLPresence";
                    s.modelid               = "SML001";
                    s.manufacturername      = "Philips";
                    s.swversion             = "6.1.0.18912",
                    s.state.presence        = null;
                    s.config.sensitivity    = 2;
                    s.config.sensitivitymax = 2;
                    break;

                case 'ZLLTemperature':                  // ZLL Temperature
                    zll                     = true; 
                    s.uniqueid              = "00:17:88:01:02:00:d0:5b-02-0402";
                    s.name                  = "ZLLTemperature";
                    s.type                  = "ZLLTemperature";
                    s.modelid               = "SML001";
                    s.manufacturername      = "Philips";
                    s.swversion             = "6.1.0.18912",
                    s.state.temperature     = null;     // Current temperature in 0.01 degrees Celsius. (3000 is 30.00 degree) Bridge does not verify the range of the value.
                    break;

                case 'ZLLLightlevel':                   // ZLL Lightlevel
                    zll                     = true; 
                    s.uniqueid              = "00:17:88:01:02:00:d0:5b-02-0400";
                    s.name                  = "ZLLLightlevel";
                    s.type                  = "ZLLLightlevel";
                    s.modelid               = "SML001";
                    s.manufacturername      = "Philips";
                    s.swversion             = "6.1.0.18912",
                    s.state.lightlevel      = null;     // Light level in 10000 log10 (lux) +1 measured by sensor. 
                    s.state.dark            = null;
                    s.state.daylight        = null;
                    s.config.tholddark      = 16000;
                    s.config.tholdoffset    = 7000;
                    break;

                case 'Daylight':
                    s.name                  = "Daylight";
                    s.type                  = "Daylight";
                    s.modelid               = "PHDL00";
                    s.manufacturername      = "Philips";
                    s.state.daylight        = false;
                    s.config.long           = "none";
                    s.config.lat            = "none";
                    s.config.configured     = false;
                    s.config.sunriseoffset  = 30;
                    s.config.sunsetoffset   = -30;
                    break;

                case 'CLIPGenericStatus':
                    clip                    = true; 
                    s.name                  = "CLIPGenericStatus";
                    s.type                  = "CLIPGenericStatus";
                    s.modelid               = "PHA_STATE";
                    s.manufacturername      = "Philips";
                    s.state.status          = 0;
                    break;

                case 'CLIPTemperature':
                    clip                    = true; 
                    s.name                  = "CLIPTemperature";
                    s.type                  = "CLIPTemperature";
                    s.modelid               = "XXX";
                    s.manufacturername      = "Philips";
                    s.state.temperature     = null;     // Current temperature in 0.01 degrees Celsius. (3000 is 30.00 degree) Bridge does not verify the range of the value.
                    break;

                default:
                    return false;
            }

            if (zll) {
                if (typeof name !== 'undefined') {
                    s.name = name;
                }
        
                s.config.battery        =  100;
                s.config.alert          = "none";
                s.config.ledindication  = false;
                s.config.usertest       = false;
                s.config.pending        = [];

                var id = this.dsGetNewSensorId(clientid);

                this.dsSensors.list[id]    = s;
                this.dsSensors.clients[id] = clientid;      // save the clientid so that we can find it later on
        
                storage.setItemSync('dsSensors', this.dsSensors);
        
                return id;
            } else if (clip) {
                if (typeof name !== 'undefined') {
                    s.name = name;
                }
        
                //s.config.battery        =  100;
                //s.config.alert          = "none";
                //s.config.ledindication  = false;
                //s.config.usertest       = false;
                //s.config.pending        = [];

                var id = this.dsGetNewSensorId(clientid);

                this.dsSensors.list[id]    = s;
                this.dsSensors.clients[id] = clientid;      // save the clientid so that we can find it later on
        
                storage.setItemSync('dsSensors', this.dsSensors);
        
                return id;
            }
        }

        var id                    = this.dsGetNewSensorId();
        this.dsSensors.list[id]   = s;
        storage.setItemSync('dsSensors', this.dsSensors);

        return id;
    }
    dsDeleteSensor(id) {
        if (this.dsSensors.list.hasOwnProperty(id)) {
            var clientid = this.dsSensors.clients[id];

            if (typeof clientid !== 'undefined') {
                delete this.dsSensors.nodelist.nodes[clientid];
                delete this.dsSensors.clients[id];
            }

            delete this.dsSensors.list[id];

            storage.setItemSync('dsSensors', this.dsSensors);
            return true;
        } else {
            this.debug("Datastore::dsDeleteSensor() sensor does not exists; id = " + id);
            return false;
        }
    }
    dsGetSensor(id) {
        if (this.dsSensors.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsSensors.list[id]));
        } else {
            this.debug("Datastore::dsGetSensor() sensor does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateSensor(id, o) {
        if (this.dsSensors.list.hasOwnProperty(id)) {
            o.state.lastupdated     = this.dsDateString();
            this.dsSensors.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsSensors', this.dsSensors);
            return true;
        } else {
            this.debug("Datastore::dsUpdateSensor() sensor does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateSensorState(id, state) {
        if (this.dsSensors.list.hasOwnProperty(id)) {
            state.lastupdated             = this.dsDateString();
            this.dsSensors.list[id].state = JSON.parse(JSON.stringify(state));
            return true;
        } else {
            this.debug("Datastore::dsUpdateSensor() sensor does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllSensors() {
        return this.dsSensors.list;
    }
    dsGetAllSensorIDs() {
        var result = [];

        var all = Object.keys(this.dsSensors.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    /******************************************************************************************************************
     * rules
     *
     */
    dsInitRules(clear, obj) {
        this.dsRules = storage.getItemSync('dsRules');
        if (typeof this.dsRules === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsRules = {
                    list:       {},
                    nextfree:   1
                };
            } else {
                this.dsRules = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };
            }
            storage.setItemSync('dsRules', this.dsRules);
        }
    }
    dsGetNewRuleId() {
        var newId = this.dsRules.nextfree;
        this.dsRules.nextfree++;

        return newId;
    }
    dsCreateRule(owner) {
        var r = {
            name: "",
            owner: owner,
            created: this.dsDateString(),
            lasttriggered: "none",
            timestriggered: 0,
            status: "enabled",
            recycle: true,
            conditions: [],
            actions: []
        };

        var id                    = this.dsGetNewRuleId();
        this.dsRules.list[id]   = r;
        storage.setItemSync('dsRules', this.dsRules);

        return id;
    }
    dsDeleteRule(id) {
        if (this.dsRules.list.hasOwnProperty(id)) {
            delete this.dsRules.list[id];
            storage.setItemSync('dsRules', this.dsRules);
            return true;
        } else {
            this.debug("Datastore::dsDeleteRule() rule does not exists; id = " + id);
            return false;
        }
    }
    dsGetRule(id) {
        if (this.dsRules.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsRules.list[id]));
        } else {
            this.debug("Datastore::dsGetRule() rule does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateRule(id, o) {
        if (this.dsRules.list.hasOwnProperty(id)) {
            this.dsRules.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsRules', this.dsRules);
            return true;
        } else {
            this.debug("Datastore::dsUpdateRule() rule does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllRules() {
        return this.dsRules.list;
    }
    dsGetAllRuleIDs() {
        var result = [];

        var all = Object.keys(this.dsRules.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsRemoveLightFromRule(id, lightid) {
        this.debug("Datastore::dsRemoveLightFromRule() id = " + id + ", lightid = " + lightid);

        for (var idx in this.dsRules.list[id].actions) {
            this.debug("  Datastore::dsRemoveLightFromRule() idx    = " + idx);
            this.debug("  Datastore::dsRemoveLightFromRule() action = " + JSON.stringify(this.dsRules.list[id].actions[idx]));

            var address = this.dsRules.list[id].actions[idx].address;
            var path    = address.split('/');

            if (path[1] === 'lights' && path[2] === lightid) {
                this.debug("    Datastore::dsRemoveLightFromRule() found light!");
                delete this.dsRules.list[id].actions[idx];

                storage.setItemSync('dsRules', this.dsRules);
            }
        }
    }
    /******************************************************************************************************************
     * resourcelinks
     *
     */
    dsInitResourcelinks(clear, obj) {
        this.dsResourcelinks = storage.getItemSync('dsResourcelinks');
        if (typeof this.dsResourcelinks === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsResourcelinks = {
                    list:       {},
                    nextfree:   1
                };
            } else {
                this.dsResourcelinks = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };
            }
            storage.setItemSync('dsResourcelinks', this.dsResourcelinks);
        }
    }
    dsGetNewResourcelinksId() {
        var newId = this.dsResourcelinks.nextfree;
        this.dsResourcelinks.nextfree++;

        return newId;
    }
    dsCreateResourcelinks(owner) {
        var r = {
            name: "",
            description: "",
            type: "Link",       // read-only
            classid: 1,
            owner: owner,
            recycle: true,
            links: []
        };

        var id                        = this.dsGetNewResourcelinksId();
        this.dsResourcelinks.list[id] = r;
        storage.setItemSync('dsResourcelinks', this.dsResourcelinks);

        return id;
    }
    dsDeleteResourcelinks(id) {
        if (this.dsResourcelinks.list.hasOwnProperty(id)) {
            delete this.dsResourcelinks.list[id];
            storage.setItemSync('dsResourcelinks', this.dsResourcelinks);
            return true;
        } else {
            this.debug("Datastore::dsDeleteResourcelinks() resourcelinks does not exists; id = " + id);
            return false;
        }
    }
    dsGetResourcelinks(id) {
        if (this.dsResourcelinks.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsResourcelinks.list[id]));
        } else {
            this.debug("Datastore::dsGetResourcelinks() resourcelinks does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateResourcelinks(id, o) {
        if (this.dsResourcelinks.list.hasOwnProperty(id)) {
            this.dsResourcelinks.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsResourcelinks', this.dsResourcelinks);
            return true;
        } else {
            this.debug("Datastore::dsUpdateResourcelinks() resourcelinks does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllResourcelinks() {
        return this.dsResourcelinks.list;
    }
    dsGetAllResourcelinkIDs() {
        var result = [];

        var all = Object.keys(this.dsResourcelinks.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsRemoveLightFromResourcelinks(id, lightid) {
        this.debug("Datastore::dsRemoveLightResourcelinks() id = " + id + ", lightid = " + lightid);

        for (var idx in this.dsResourcelinks.list[id].links) {
            this.debug("  Datastore::dsRemoveLightFromResourcelinks() idx  = " + idx);
            this.debug("  Datastore::dsRemoveLightFromResourcelinks() link = " + JSON.stringify(this.dsResourcelinks.list[id].links[idx]));

            var address = this.dsResourcelinks.list[id].links[idx];
            var path    = address.split('/');
            
            if (path[1] === 'lights' && path[2] === lightid) {
                this.debug("    Datastore::dsRemoveLightFromResourcelinks() found light!");
                delete this.dsResourcelinks.list[id].links[idx];

                storage.setItemSync('dsResourcelinks', this.dsResourcelinks);
            }
        }
    }
    /******************************************************************************************************************
     * schedules
     *
     */
    dsInitSchedules(clear, obj) {
        this.dsSchedules = storage.getItemSync('dsSchedules');
        if (typeof this.dsSchedules === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsSchedules = {
                    list:       {},
                    nextfree:   1
                };
            } else {
                this.dsSchedules = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };
            }
            storage.setItemSync('dsSchedules', this.dsSchedules);
        }
    }
    dsGetNewScheduleId() {
        var newId = this.dsSchedules.nextfree;
        this.dsSchedules.nextfree++;

        return newId;
    }
    dsCreateSchedule() {
        var s = {
            name: "",
            description: "",
            command: {},
            localtime: "",
            time: "",           // "DEPRECATED  This attribute will be removed in the future. Please use localtime instead."
            created: this.dsDateString(),
            status: "enabled",  // "disabled"
            autodelete: true,
            recycle: true
        }

        var id                    = this.dsGetNewScheduleId();
        this.dsSchedules.list[id] = s;
        storage.setItemSync('dsSchedules', this.dsSchedules);

        return id;
    }
    dsDeleteSchedule(id) {
        if (this.dsSchedules.list.hasOwnProperty(id)) {
            delete this.dsSchedules.list[id];
            storage.setItemSync('dsSchedules', this.dsSchedules);
            return true;
        } else {
            this.debug("Datastore::dsDeleteSchedule() schedule does not exists; id = " + id);
            return false;
        }
    }
    dsGetSchedule(id) {
        if (this.dsSchedules.list.hasOwnProperty(id)) {
            return JSON.parse(JSON.stringify(this.dsSchedules.list[id]));
        } else {
            this.debug("Datastore::dsGetSchedule() schedule does not exists; id = " + id);
            return false;
        }
    }
    dsUpdateSchedule(id, o) {
        if (this.dsSchedules.list.hasOwnProperty(id)) {
            this.dsSchedules.list[id] = JSON.parse(JSON.stringify(o));
            storage.setItemSync('dsSchedules', this.dsSchedules);
            return true;
        } else {
            this.debug("Datastore::dsUpdateSchedules() schedule does not exists; id = " + id);
            return false;
        }
    }
    dsGetAllSchedules() {
        return this.dsSchedules.list;
    }
    dsGetAllScheduleIDs() {
        var result = [];

        var all = Object.keys(this.dsSchedules.list).map(function (id) {
            result.push(id);
        });

        return result;
    }
    dsRemoveLightFromSchedule(id, lightid) {
        this.debug("Datastore::dsRemoveLightFromSchedule() id = " + id + ", lightid = " + lightid);

        if (this.dsSchedules.list[id].command.hasOwnProperty('address')) {
            var address = this.dsSchedules.list[id].command.address;
            var path    = address.split('/');
            
            if (path[3] === 'lights' && path[4] === lightid) {
                this.debug("  Datastore::dsRemoveLightFromSchedule() found light in address field!");
                this.dsSchedules.list[id].command = {};

                storage.setItemSync('dsSchedules', this.dsSchedules);
            }
        }
    }
    /******************************************************************************************************************
     * capabilities
     *
     */
    dsInitCapabilities(clear, obj) {

    }
    dsGetAllCapabilities() {
        var tz = [];

        try {
            var file = fs.readFileSync(__dirname + '/timezones.txt');
            file     = file.toString();
            tz       = JSON.parse(file);
        } catch (err) {
            this.debug("Datastore::() error; err = " + err);
        }

        var c = {
            lights: {
                available: 64           // max 64
            },
            sensors: {
                available: 63,          // max 64
                clip: {
                    available: 63,
                },
                zll: {
                    available: 63,
                },
                zgp: {
                    available: 63,
                }
            },
            groups: {
                available: 63           // max 64
            },
            scenes: {
                available: 200,         // max 200
                lightstates: {
                    available: 2048     // max 2048
                }
            },
            rules: {
                available: 250,         // max 250
                actions: {
                    available: 1000     // max 1000
                },
                conditions: {
                    available: 1500     // max 1500
                }
            },
            schedules: {
                available: 100          // max 100
            },
            resourcelinks: {
                available: 64           // max 64
            },
            streaming: {
                available: 1,
                total: 1,
                channels: 10
            },
            timezones: {
                values: tz
            }
        }

        return JSON.parse(JSON.stringify(c));
    }
    /******************************************************************************************************************
     * network info
     *
     */
    dsSetNetwork(address, netmask, gateway, mac) {
        // build bridge ID
        var m  = mac.split(':');
        var id = m[0] + m[1] + m[2] + "FFFE" + m[3] + m[4] + m[5];

        this.dsBridgeID = id.toUpperCase();
        
        this.dsAddress  = address;
        this.dsNetmask  = netmask;
        this.dsGateway  = gateway;
        this.dsMac      = mac;
    }
    dsGetAddress() {
        return this.dsAddress;
    }
    dsGetMAC() {
        return this.dsMac;
    }
    dsSetHttpPort(port) {
        this.dsHttpPort = port;
    }
    dsGetHttpPort() {
        return this.dsHttpPort;
    }
    dsGetBridgeID() {
        return this.dsBridgeID;
    }
    /******************************************************************************************************************
     * whitelist
     *
     */
    dsInitConfiguration(clear, obj) {
        this.dsConfig = storage.getItemSync('dsConfig');
        if (typeof this.dsConfig === 'undefined' || clear) {
            if (typeof obj === 'undefined') {
                this.dsConfig = {
                    name:           "NodeRED",
                    timezone:       "Europe/Copenhagen",
                    portalservices: false,
                    zigbeechannel:  25,
                    linkbutton:     false,
                    whitelist:      {}
                };
            } else {
                this.dsConfig = {
                    name:           obj.name,
                    timezone:       obj.timezone,
                    portalservices: obj.portalservices,
                    zigbeechannel:  obj.zigbeechannel,
                    linkbutton:     obj.linkbutton,
                    whitelist:      JSON.parse(JSON.stringify(obj.whitelist))
                };
            }
            storage.setItemSync('dsConfig', this.dsConfig);
        }
    }
    dsNewUsername(deviceType) {
        const username = this.dsUuidGenerate("U");

        var now = new Date();

        var u = {
            "last use date": this.dsDateString(),
            "create date": this.dsDateString(),
            "name": deviceType,
            "_clientkey": ""
        };

        this.dsConfig.whitelist[username] = u;
        storage.setItemSync('dsConfig', this.dsConfig);

        this.debug("Datastore::dsNewUsername(): dsWhitelist = " + JSON.stringify(this.dsConfig.whitelist));

        return username;
    }
    dsDeleteUsername(username) {
        if (typeof username === 'undefined') {
            return false;
        }

        if (this.dsConfig.whitelist.hasOwnProperty(username)) {
            delete this.dsConfig.whitelist[username];
            storage.setItemSync('dsConfig', this.dsConfig);
            return true;
        } else {
            return false;
        }
    }
    dsNewClientkey(username) {
        if (typeof username === 'undefined') {
            return "";
        }

        if (this.dsConfig.whitelist.hasOwnProperty(username)) {
            this.dsConfig.whitelist[username]._clientkey = this.dsClientkeyGenerate();
            storage.setItemSync('dsConfig', this.dsConfig);
            return this.dsConfig.whitelist[username]._clientkey;
        } else {
            return "";
        }
    }
    dsIsUsernameValid(username) {
        if (typeof username === 'undefined') {
            return false;
        }

        if (this.dsConfig.whitelist.hasOwnProperty(username)) {
            return true;
        } else {
            return false;
        }
    }
    dsUpdatUsernameActivity(username) {
        if (typeof username === 'undefined') {
            return false;
        }

        if (this.dsConfig.whitelist.hasOwnProperty(username)) {
            this.dsConfig.whitelist.username['last use date'] = this.dsDateString();
            return true;
        } else {
            return false;
        }
    }
    dsSaveConfiguration() {
        storage.setItemSync('dsConfig', this.dsConfig);
    }
    /******************************************************************************************************************
     * configuration
     *
     */
    dsSetName(name) {
        this.dsConfig.name = name;
        storage.setItemSync('dsConfig', this.dsConfig);
    }
    dsSetPortalservice(portalservices) {
        this.dsConfig.portalservices = portalservices;
        storage.setItemSync('dsConfig', this.dsConfig);
    }
    dsSetTimezone(timezone) {
        this.dsConfig.timezone = timezone;
        storage.setItemSync('dsConfig', this.dsConfig);
    }
    dsSetZigbeechannel(zigbeechannel) {
        this.dsConfig.zigbeechannel = zigbeechannel;
        storage.setItemSync('dsConfig', this.dsConfig);
    }
    dsSetLinkbutton(state) {
        this.dsConfig.linkbutton = state;
        this.emit('datastore-linkbutton', state);
    }
    //
    //
    //
    dsGetLinkbutton() {
        return this.dsConfig.linkbutton;
    }
    dsGetConfig() {
        var config = {
            name: this.dsConfig.name,
            bridgeid: this.dsBridgeID,
            modelid: "BSB002",
            datastoreversion: "70",
            mac: this.dsMac,
            zigbeechannel: this.dsConfig.zigbeechannel,
            dhcp: false,
            ipaddress: this.dsAddress,
            netmask: this.dsNetmask,
            gateway: this.dsGateway,
            proxyaddress: "none",
            proxyport: 0,
            UTC: this.dsDateString(true),
            localtime: this.dsDateString(),
            timezone: this.dsConfig.timezone,
            whitelist: this.dsConfig.whitelist,
            apiversion: "1.24.0",
            swversion: "99999999",
            linkbutton: this.dsConfig.linkbutton,
            portalservices: this.dsConfig.portalservices,
            factorynew: false,
            replacesbridgeid: null,
            backup: {
                status: "idle",
                errorcode: 0
            },
            starterkitid: "",
            swupdate: {
                updatestate: 0,
                checkforupdate: false,
                devicetypes: {
                    bridge: false,
                    lights: [],
                    sensors: []
                },
                url: "",
                text: "",
                notify: false
            },
            swupdate2: {
                checkforupdate: false,
                state: "noupdates",
                install: false,
                autoinstall: false,
                bridge: {
                    state: "noupdates",
                    lastinstall: "2018-02-02T00:00:00"
                },
                autoinstall: {
                    updatetime: "T00:00:00",
                    on: false
                },
                lastchange: "2018-02-02T00:00:00"
            }
        };
        
        return JSON.parse(JSON.stringify(config));
    }
    dsGetMinimalConfig() {
        var config = {
            name: this.dsConfig.name,
            datastoreversion: "70",
            swversion: "99999999",
            apiversion: "1.24.0",
            mac: this.dsMac,
            bridgeid: this.dsBridgeID,
            factorynew: false,
            replacesbridgeid: null,
            modelid: "BSB002",
            starterkitid: ""
        };
        
        return JSON.parse(JSON.stringify(config));
    }
    dsGetFullConfig() {
        var full = {
            lights:         this.dsLights.list,
            groups:         this.dsGroups.list,
            schedules:      this.dsSchedules.list,
            scenes:         this.dsScenes.list,
            sensors:        this.dsSensors.list,
            rules:          this.dsRules.list,
            resourcelinks:  this.dsResourcelinks.list,
            config:         this.dsGetConfig()
        }

        return JSON.parse(JSON.stringify(full));
    }
    /******************************************************************************************************************
     * utilities
     *
     */
    dsDateString(utc) {
        var ts_hms = new Date()
        
        if (typeof utc !== 'undefined' && utc === true) {
            // get UTC
            var nowText =   ts_hms.getUTCFullYear() + '-' + 
                            ("0" + (ts_hms.getUTCMonth() + 1)).slice(-2) + '-' + 
                            ("0" + (ts_hms.getUTCDate())).slice(-2) + 'T' +
                            ("0" + ts_hms.getUTCHours()).slice(-2) + ':' +
                            ("0" + ts_hms.getUTCMinutes()).slice(-2) + ':' +
                            ("0" + ts_hms.getUTCSeconds()).slice(-2)
    
            return nowText;
        } else {
            // get local time
            var nowText =   ts_hms.getFullYear() + '-' + 
                            ("0" + (ts_hms.getMonth() + 1)).slice(-2) + '-' + 
                            ("0" + (ts_hms.getDate())).slice(-2) + 'T' +
                            ("0" + ts_hms.getHours()).slice(-2) + ':' +
                            ("0" + ts_hms.getMinutes()).slice(-2) + ':' +
                            ("0" + ts_hms.getSeconds()).slice(-2)
    
            return nowText;
        }
    }
    /**
    * Fast UUID generator.
    * @author Jeff Ward (jcward.com).
    * @license MIT license
    * @link http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
    **/
    dsUuidGenerate(prefix) {
        var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

        var d0 = Math.random()*0xffffffff|0;
        var d1 = Math.random()*0xffffffff|0;
        var d2 = Math.random()*0xffffffff|0;
        //var d3 = Math.random()*0xffffffff|0;
        return  prefix+lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+
                lut[d1&0xff]+lut[d1>>8&0xff]+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+
                lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+lut[d2>>16&0xff]+lut[d2>>24&0xff]; //+
                //lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];
    }
    dsClientkeyGenerate() {
        var lut = []; for (var i=0; i<256; i++) { lut[i] = (i<16?'0':'')+(i).toString(16); }

        var d0 = Math.random()*0xffffffff|0;
        var d1 = Math.random()*0xffffffff|0;
        var d2 = Math.random()*0xffffffff|0;
        var d3 = Math.random()*0xffffffff|0;
        var r  = lut[d0&0xff]+lut[d0>>8&0xff]+lut[d0>>16&0xff]+lut[d0>>24&0xff]+
                lut[d1&0xff]+lut[d1>>8&0xff]+lut[d1>>16&0x0f|0x40]+lut[d1>>24&0xff]+
                lut[d2&0x3f|0x80]+lut[d2>>8&0xff]+lut[d2>>16&0xff]+lut[d2>>24&0xff]+
                lut[d3&0xff]+lut[d3>>8&0xff]+lut[d3>>16&0xff]+lut[d3>>24&0xff];

        return r.toUpperCase();
    }
};

module.exports = Datastore;
