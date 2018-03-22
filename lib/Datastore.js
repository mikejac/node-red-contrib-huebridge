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
    dsCreateLight(clientid, name, type) {
        if (typeof clientid !== 'string') {
            this.debug("Datastore::dsCreateLight(): 'clientid' must be a string");
            return false;
        }

        var _typ       = 0xFFFF;
        var devicetype = "";
        var modelid    = "";
        var state      = {
            colormode: "hs",                // “hs” for Hue and Saturation, “xy” for XY and “ct” for Color Temperature
            effect: "none",
            hue: 0,                         // uint16
            sat: 0,                         // uint8
            xy: [1.0000, 1.0000],           // [x, y], both x and y must be between 0.0000 and 1.0000
            bri: 254,                       // uint8, 0 to 255
            ct: 500,                        // uint16, Mirek color temperature; 153 (6500K) to 500 (2000K).
            on: false,
            transitiontime: 4,              // multiple of 100ms, defaults to 4 (400ms)
            alert: "none",
            reachable: true
        };

        // https://developers.meethue.com/documentation/supported-lights
        if (type === "0x0000") {          // On/off Light
            _typ            = 0x0000;
            devicetype      = "On/off Light";
            modelid         = "XX001";
        } else if (type === "0x0100") {   // Dimmable Light
            _typ            = 0x0100;
            devicetype      = "Dimmable Light";
            modelid         = "LWB010";
        } else if (type === "0x0200") {   // Color Light
            _typ            = 0x0200;
            devicetype      = "Color Light";
            modelid         = "LST001";
        } else if (type === "0x0210") {   // Extended Color Light
            _typ            = 0x0210;
            devicetype      = "Extended Color Light";
            modelid         = "LCT001";
        } else if (type === "0x0220") {   // Color Temperature Light
            _typ            =  0x0220;
            devicetype      = "Color Temperature Light";
            modelid         = "LTW011";
            state.colormode = "ct";
        } else {
            this.warn("Invalid light type '" + type + "'");
            return false;
        }

        var capabilities = {
            certified: true,    // oh well
            streaming: {
                renderer: true,
                proxy: false
            }
        };

        var swupdate = {
            state: "notupdatable",
            lastinstall: "2018-02-02T00:00:00"
        };

        var l = {
            _typ: _typ,
            state: state,
            capabilities: capabilities,
            swupdate: swupdate,
            type: devicetype,
            name: name,
            modelid: modelid,
            manufacturername: "Node-RED",
            uniqueid: clientid,
            swversion: "99999999",
            productid: "node-red-contrib-huebridge"
        };

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
            xy: [1.0000, 1.0000],           // [x, y], both x and y must be between 0.0000 and 1.0000
            bri: 254,                       // uint8, 1 to 254
            ct: 500,                        // uint16, Mirek color temperature; 153 (6500K) to 500 (2000K).
            on: false,
            transitiontime: 4,              // multiple of 100ms, defaults to 4 (400ms)
            alert: "none",
            reachable: true
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
                delete this.dsGroups.list[id].lights[idx];

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
                    nextfree:   1
                };
            } else {
                this.dsSensors = {
                    list:       JSON.parse(JSON.stringify(obj.list)),
                    nextfree:   obj.nextfree
                };
            }
            storage.setItemSync('dsSensors', this.dsSensors);
        }

        /*
        ** A sensor indicating the switch between daylight and night for a given location.
        ** This sensor is implemented in the bridge and is always available.
        */
        if (!this.dsSensors.list.hasOwnProperty(1)) {
            var id = this.dsCreateSensor();
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
            }
        }
    }
    dsGetNewSensorId() {
        var newId = this.dsSensors.nextfree;
        this.dsSensors.nextfree++;

        return newId;
    }
    dsCreateSensor() {
        var s = {
            name: "",
            type: "",
            modelid: "",
            manufacturername: "Node-RED",
            productname: "Node-RED Sensor",
            uniqueid: "",
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

        var id                    = this.dsGetNewSensorId();
        this.dsSensors.list[id]   = s;
        storage.setItemSync('dsSensors', this.dsSensors);

        return id;
    }
    dsDeleteSensor(id) {
        if (this.dsSensors.list.hasOwnProperty(id)) {
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
            "name": deviceType            
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
            datastoreversion: "68",
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
            apiversion: "1.23.0",
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
            swversion: "99999999",
            apiversion: "1.23.0",
            mac: this.dsMac,
            bridgeid: this.dsBridgeID,
            factorynew: false,
            replacesbridgeid: null,
            modelid: "BSB002"
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
};

module.exports = Datastore;
