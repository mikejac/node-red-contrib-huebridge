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

class Sensors {
    constructor() {
        this.sensorDaylightJob = null;
    }
    //
    // https://developers.meethue.com/documentation/sensors-api
    //
    sensorsDispatcher(response, method, url, urlParts, obj) {
        //this.debug("Sensors::sensorsDispatcher(): method = " + method);
        //this.debug("Sensors::sensorsDispatcher(): url = '" + url + "'");
        //this.debug("Sensors::sensorsDispatcher(): urlParts = " + urlParts);
        //this.debug("Sensors::sensorsDispatcher(): obj = " + JSON.stringify(obj));

        /*
         5.1. Get all sensors       - GET,  /api/<username>/sensors
         5.2. Create sensor         - POST, /api/<username>/sensors
         5.3. Find new sensors      - POST, /api/<username>/sensors/new ?????
         5.4. Get New Sensors       - GET,  /api/<username>/sensors/new
         5.5. Get Sensor            - GET,  /api/<username>/sensors/<id>
         5.6. Update Sensor         - PUT,  /api/<username>/sensors/<id>
         5.7. Delete Sensor         - DEL,  /api/<username>/sensors/<id>
         5.8. Change Sensor Config  - PUT,  /api/<username>/sensors/<id>/config
         5.9. Change Sensor State   - PUT,  /api/<username>/sensors/<id>/state
        */

        var api1 = /^\/api\/(\w+)\/sensors$/.exec(url);
        var api2 = /^\/api\/(\w+)\/sensors\/new$/.exec(url);
        var api3 = /^\/api\/(\w+)\/sensors\/(\w+)$/.exec(url);
        var api4 = /^\/api\/(\w+)\/sensors\/(\w+)\/config$/.exec(url);
        var api5 = /^\/api\/(\w+)\/sensors\/(\w+)\/state$/.exec(url);

        if (api1 && method === 'get') {             // 5.1
            this.debug("Sensors::sensorsDispatcher(): Get all sensors");
            this.sensorsGetAll(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {     // 5.2
            this.debug("Sensors::sensorsDispatcher(): Create sensor");
            this.sensorsCreate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'post') {     // 5.3
            this.debug("Sensors::sensorsDispatcher(): Find new sensors");
            this.sensorsSearchForNew(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {      // 5.4
            this.debug("Sensors::sensorsDispatcher(): Get New Sensors");
            this.sensorsGetNew(response, method, url, urlParts, obj);
        } else if (api3 && method === 'get') {      // 5.5
            this.debug("Sensors::sensorsDispatcher(): Get Sensor");
            this.sensorsGet(response, method, url, urlParts, obj);
        } else if (api3 && method === 'put') {      // 5.6
            this.debug("Sensors::sensorsDispatcher(): Update Sensor");
            this.sensorsUpdate(response, method, url, urlParts, obj);
        } else if (api3 && method === 'delete') {   // 5.7
            this.debug("Sensors::sensorsDispatcher(): Delete Sensor");
            this.sensorsDelete(response, method, url, urlParts, obj);
        } else if (api4 && method === 'put') {      // 5.8
            this.debug("Sensors::sensorsDispatcher(): Change Sensor Config");
            this.sensorsChangeConfig(response, method, url, urlParts, obj);
        } else if (api5 && method === 'put') {      // 5.9
            this.debug("Sensors::sensorsDispatcher(): Change Sensor State");
            this.sensorsChangeState(response, method, url, urlParts, obj);
        } else {
            //this.debug("Lights::lightsDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    sensorsGetAll(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllSensors());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsCreate(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsCreate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = this.dsCreateSensor();
            var o  = this.dsGetSensor(id);

            if (o === false) {
                this.responseError(response, 3, '/sensors/' + id);
                return;
            }

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
            }
            if (obj.hasOwnProperty('modelid')) {
                o.modelid = obj.modelid;
            }
            if (obj.hasOwnProperty('swversion')) {
                o.swversion = obj.swversion;
            }
            if (obj.hasOwnProperty('type')) {
                o.type = obj.type;
            }
            if (obj.hasOwnProperty('uniqueid')) {
                o.uniqueid = obj.uniqueid;
            }
            if (obj.hasOwnProperty('manufacturername')) {
                o.manufacturername = obj.manufacturername;
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
            }
            if (obj.hasOwnProperty('config')) { // object
                for (var key in obj.config) {
                    if (obj.config.hasOwnProperty(key)) {
                       this.debug("Sensors::sensorsCreate(config): key = '" + key + "', value = '" + obj.config[key] + "'");
                       o.config[key] = obj.config[key];
                    }
                }
            }
            if (obj.hasOwnProperty('state')) {  // object
                for (var key in obj.state) {
                    if (obj.state.hasOwnProperty(key)) {
                       this.debug("Sensors::sensorsCreate(state): key = '" + key + "', value = '" + obj.state[key] + "'");
                       o.state[key] = obj.state[key];
                    }
                }
            }

            this.dsUpdateSensor(id, o);

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "id", id); this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('sensor-created', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsSearchForNew(response, method, url, urlParts, obj) {
        this.debug("Sensors::SearchForNew(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "/sensors", "Searching for new devices"); this.responseMultiEnd(arr, response);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsGetNew(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsGetNew(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllSensors());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsGet(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsGet(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSensor(id);

            if (o === false) {
                this.responseError(response, 3, '/sensors/' + id);
                return;
            }

            this.responseJSON(response, o);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsUpdate(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsUpdate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSensor(id);

            this.debug("Sensors::sensorsUpdate(): id = " + id);
            this.debug("Sensors::sensorsUpdate(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/sensors/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/name', o.name); 
            }
            if (obj.hasOwnProperty('modelid')) {
                o.modelid = obj.modelid;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/modelid', o.modelid); 
            }
            if (obj.hasOwnProperty('swversion')) {
                o.swversion = obj.swversion;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/swversion', o.swversion); 
            }
            if (obj.hasOwnProperty('type')) {
                o.type = obj.type;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/type', o.type); 
            }
            if (obj.hasOwnProperty('uniqueid')) {
                o.uniqueid = obj.uniqueid;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/uniqueid', o.uniqueid); 
            }
            if (obj.hasOwnProperty('manufacturername')) {
                o.manufacturername = obj.manufacturername;
                this.responseMultiAddSuccess(arr, '/sensors/' + id + '/manufacturername', o.manufacturername); 
            }
            if (obj.hasOwnProperty('config')) { // object
                for (var key in obj.config) {
                    if (obj.config.hasOwnProperty(key)) {
                       this.debug("Sensors::sensorsUpdate(config): key = '" + key + "', value = '" + obj.config[key] + "'");
    
                       o.config[key] = obj.config[key];
                       this.responseMultiAddSuccess(arr, '/sensors/' + id + '/' + key, obj.config[key]);
                    }
                }
            }
            if (obj.hasOwnProperty('state')) {  // object
                for (var key in obj.state) {
                    if (obj.state.hasOwnProperty(key)) {
                       this.debug("Sensors::sensorsUpdate(state): key = '" + key + "', value = '" + obj.state[key] + "'");
    
                       o.state[key] = obj.state[key];
                       this.responseMultiAddSuccess(arr, '/sensors/' + id + '/' + key, obj.state[key]);
                    }
                }
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateSensor(id, o);

            process.nextTick(() => {
                this.emit('sensor-modified', id, o);
            });            
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsDelete(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsDelete(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            if (this.dsDeleteSensor(id)) {
                var resp = [{success: '/sensors/' + id + ' deleted.'}];

                this.responseJSON(response, resp);

                process.nextTick(() => {
                    this.emit('sensor-deleted', id);
                });            
            } else {
                this.responseError(response, 3, '/sensors/' + id);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsChangeConfig(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsChangeConfig(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSensor(id);

            this.debug("Sensors::sensorsChangeConfig(): id = " + id);
            this.debug("Sensors::sensorsChangeConfig(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/sensors/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                   this.debug("Sensors::sensorsChangeConfig(): key = '" + key + "', value = '" + obj[key] + "'");

                   o.config[key] = obj[key];
                   this.responseMultiAddSuccess(arr, '/sensors/' + id + '/config/' + key, obj[key]);
                }
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateSensor(id, o);

            process.nextTick(() => {
                this.emit('sensor-config-modified', id, o);
            });            
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    sensorsChangeState(response, method, url, urlParts, obj) {
        this.debug("Sensors::sensorsChangeState(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSensor(id);

            this.debug("Sensors::sensorsChangeState(): id = " + id);
            this.debug("Sensors::sensorsChangeState(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/sensors/' + id);
                return;
            }

            var stateName  = "";
            var stateValue = null;

            var arr = this.responseMultiBegin(); 

            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    this.debug("Sensors::sensorsChangeState(): key = '" + key + "', value = '" + obj[key] + "'");

                    o.state[key] = obj[key];
                    this.responseMultiAddSuccess(arr, '/sensors/' + id + '/state/' + key, obj[key]);

                    process.nextTick(() => {
                        //this.emit('sensor-state-modified', id, o, key, obj[key]);
                        this.emit('sensor-state-modified', id, o, '/sensors/' + id + '/state/' + key, obj[key]);
                    });            
                    //stateName  = key;
                    //stateValue = obj[key];
                }
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateSensor(id, o);
            //this.emit('sensor-state-modified', id, o);
            //process.nextTick(() => {
            //    this.emit('sensor-state-modified', id, o, stateName, stateValue);
            //});            
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
};

module.exports = Sensors;
