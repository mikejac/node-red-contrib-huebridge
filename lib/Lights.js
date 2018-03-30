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

class Lights {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/lights-api
    //
    lightsDispatcher(response, method, url, urlParts, obj) {
        //this.debug("Lights::lightsDispatcher(): url = " + url);

        /*
         1.1. Get all lights                    - GET,  /api/<username>/lights
         1.2. Get new lights                    - GET,  /api/<username>/lights/new
         1.3. Search for new lights             - POST, /api/<username>/lights
         1.4. Get light attributes and state    - GET,  /api/<username>/lights/<id>
         1.5. Set light attributes (rename)     - PUT,  /api/<username>/lights/<id>
         1.6. Set light state                   - PUT,  /api/<username>/lights/<id>/state
         1.7. Delete lights                     - DEL,  /api/<username>/lights/<id>
        */

        var api1 = /^\/api\/(\w+)\/lights$/.exec(url);
        var api2 = /^\/api\/(\w+)\/lights\/new$/.exec(url);
        var api3 = /^\/api\/(\w+)\/lights\/(\w+)$/.exec(url);
        var api4 = /^\/api\/(\w+)\/lights\/(\w+)\/state$/.exec(url);

        if (api1 && method === 'get') {            // 1.1
            this.debug("Lights::lightsDispatcher(): Get all lights");
            this.lightsGetAll(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {     // 1.2
            this.debug("Lights::lightsDispatcher(): Get new lights");
            this.lightsGetNew(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {    // 1.3
            this.debug("Lights::lightsDispatcher(): Search for new lights");
            this.lightsSearchForNew(response, method, url, urlParts, obj);
        } else if (api3 && method === 'get') {    // 1.4
            this.debug("Lights::lightsDispatcher(): Get light attributes and state");
            this.lightsGetAttributesAndState(response, method, url, urlParts, obj);
        } else if (api3 && method === 'put') {    // 1.5
            this.debug("Lights::lightsDispatcher(): Set light attributes (rename)");
            this.lightsSetAttributes(response, method, url, urlParts, obj);
        } else if (api4 && method === 'put') {    // 1.6
            this.debug("Lights::lightsDispatcher(): Set light state");
            this.lightsSetState(response, method, url, urlParts, obj);
        } else if (api3 && method === 'delete') { // 1.7
            this.debug("Lights::lightsDispatcher(): Delete lights");
            this.lightsDelete(response, method, url, urlParts, obj);
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
    lightsGetAll(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllLights());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    lightsGetNew(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsGetNew(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllLights());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    lightsSearchForNew(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsGetNew(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "/lights", "Searching for new devices"); this.responseMultiEnd(arr, response);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    lightsGetAttributesAndState(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsGetAttributesAndState(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetLight(id);

            if (o === false) {
                this.responseError(response, 3, '/lights/' + id);
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
    lightsSetAttributes(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsSetAttributes(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetLight(id);

            if (o === false) {
                this.responseError(response, 3, '/lights/' + id);
                return;
            }

            this.debug("Lights::lightsSetAttributes(): o = " + JSON.stringify(o));

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty("name")) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/name', o.name); 
            }

            this.dsUpdateLight(id, o);

            this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('light-modified', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    lightsSetState(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsSetState(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetLight(id);

            if (o === false) {
                this.responseError(response, 3, '/lights/' + id);
                return;
            }

            this.debug("Lights::lightsSetState(): o = " + JSON.stringify(o));

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty("on")) {
                o.state.on = obj.on;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/on', o.state.on); 
            }
            if (obj.hasOwnProperty('bri')) {
                o.state.bri = obj.bri;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/bri', o.state.bri); 
            } else if (obj.hasOwnProperty('bri_inc')) {
                o.state.bri += obj.bri_inc;
                if (o.state.bri > 254) {
                    o.state.bri = 254;
                } else if (o.state.bri < 1) {
                    o.state.bri = 1;
                }
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/bri', o.state.bri); 
            }
            if (obj.hasOwnProperty('hue')) {
                o.state.hue   = obj.hue;
                obj.colormode = 'hs';
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/hue', o.state.hue); 
            } else if (obj.hasOwnProperty('hue_inc')) {
                obj.colormode = 'hs';
                if (o.state.hue + obj.hue_inc < 0) {
                    // 0 , -2 = 65534
                    o.state.hue = (o.state.hue + 65536) + obj.hue_inc;
                } else if(o.state.hue + obj.hue_inc > 65535) {
                    // 65535 , 1 = 0
                    o.state.hue = (o.state.hue - 65536) + obj.hue_inc;
                } else {
                    o.state.hue = o.state.hue + obj.hue_inc;
                }
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/hue', o.state.hue); 
            }
            if (obj.hasOwnProperty('sat')) {
                o.state.sat   = obj.sat;
                obj.colormode = 'hs';
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/sat', o.state.sat); 
            } else if (obj.hasOwnProperty('sat_inc')) {
                obj.colormode = 'hs';
                o.state.sat  += obj.sat_inc;
                if (o.state.sat > 254) {
                    o.state.sat = 254;
                } else if (o.state.sat < 0) {
                    o.state.sat = 0;
                }
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/sat', o.state.sat); 
            }
            if (obj.hasOwnProperty('ct')) {
                o.state.ct    = obj.ct;
                obj.colormode = 'ct';
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/ct', o.state.ct); 
            } else if (obj.hasOwnProperty('ct_inc')) {
                o.state.ct   += obj.ct_inc;
                obj.colormode = 'ct';
                if (o.state.ct > 500) {
                    o.state.ct = 500;
                } else if (o.state.ct < 153) {
                    o.state.ct = 153;
                }
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/ct', o.state.ct); 
            }
            if (obj.hasOwnProperty('xy')) {
                o.state.xy    = obj.xy;
                obj.colormode = 'xy';
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/xy', o.state.xy); 
            } else if (obj.hasOwnProperty('xy_inc')) {
                var x = o.state.xy[0] + obj.xy_inc[0];
                var y = o.state.xy[1] + obj.xy_inc[1];
                if (x > 1) { x = 1; } else if (x < 0) { x = 0; }
                if (y > 1) { y = 1; } else if (y < 0) { y = 0; }
                o.state.xy[0] = x;
                o.state.xy[1] = y;
                obj.colormode = 'xy';
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/xy', o.state.xy); 
            }
            if (obj.hasOwnProperty('colormode')) {
                o.state.colormode = obj.colormode;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/colormode', o.state.colormode); 
            }
            if (obj.hasOwnProperty('effect')) {
                o.state.effect = obj.effect;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/effect', o.state.effect); 
            }
            if (obj.hasOwnProperty('alert')) {
                o.state.alert = obj.alert;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/alert', o.state.alert); 
            }
            if (obj.hasOwnProperty('transitiontime')) {
                o.state.transitiontime = obj.transitiontime;
                this.responseMultiAddSuccess(arr, '/lights/' + id + '/state/transitiontime', o.state.transitiontime); 
            }

            this.dsUpdateLightState(id, o.state);

            this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('light-state-modified', id, obj);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    lightsDelete(response, method, url, urlParts, obj) {
        this.debug("Lights::lightsDelete(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            // we don't permit deletion of lights
            this.responseError(response, 901, '/lights/' + id);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
};

module.exports = Lights;
