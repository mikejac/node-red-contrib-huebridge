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

class Groups {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/groups-api
    //
    groupsDispatcher(response, method, url, urlParts, obj) {
        //this.debug("Groups::groupsDispatcher(): url = " + url);

        /*
         2.1. Get all groups        - GET,  /api/<username>/groups
         2.2. Create group          - POST, /api/<username>/groups
         2.3. Get group attributes  - GET,  /api/<username>/groups/<id>
         2.4. Set group attributes  - PUT,  /api/<username>/groups/<id>
         2.5. Set group state       - PUT,  /api/<username>/groups/<id>/action
         2.6. Delete Group          - DEL,  /api/<username>/groups/<id>
        */

        var api1 = /^\/api\/(\w+)\/groups$/.exec(url);
        var api2 = /^\/api\/(\w+)\/groups\/(\w+)$/.exec(url);
        var api3 = /^\/api\/(\w+)\/groups\/(\w+)\/action$/.exec(url);

        if (api1 && method === 'get') {              // 2.1
            this.debug("Groups::groupsDispatcher(): Get all groups");
            this.groupsGetAll(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {      // 2.2
            this.debug("Groups::groupsDispatcher(): Create group");
            this.groupsCreate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {       // 2.3
            this.debug("Groups::groupsDispatcher(): Get group attributes");
            this.groupsGetAttributes(response, method, url, urlParts, obj);
        } else if (api2 && method === 'put') {       // 2.4
            this.debug("Groups::groupsDispatcher(): Set group attributes");
            this.groupsSetAttributes(response, method, url, urlParts, obj);
        } else if (api3 && method === 'put') {       // 2.5
            this.debug("Groups::groupsDispatcher(): Set group state");
            this.groupsSetState(response, method, url, urlParts, obj);
        } else if (api2 && method === 'delete') {    // 2.7
            this.debug("Groups::groupsDispatcher(): Delete Group");
            this.groupsDelete(response, method, url, urlParts, obj);
        } else {
            //this.debug("Groups::groupsDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    groupsGetAll(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllGroups());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    groupsCreate(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsCreate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = this.dsCreateGroup("");
            var o  = this.dsGetGroup(id);

            if (o === false) {
                this.responseError(response, 3, '/groups/' + id);
                return;
            }

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
            }
            if (obj.hasOwnProperty('lights')) {
                o.lights = obj.lights;
            }
            if (obj.hasOwnProperty('type')) {
                o.type = obj.type;
            }
            if (obj.hasOwnProperty('state')) {
                if (obj.state.hasOwnProperty('all_on')) {
                    o.state.all_on = obj.state.all_on;
                }
                if (obj.state.hasOwnProperty('any_on')) {
                    o.state.any_on = obj.state.any_on;
                }                
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
            }
            if (obj.hasOwnProperty('class')) {
                o.class = obj.class;
            }
            if (obj.hasOwnProperty('action')) {
                o.action = obj.action;
            }

            this.dsUpdateGroup(id, o);

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "id", id); this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('group-created', id, o);
            });
    } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    groupsGetAttributes(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsGetAttributes(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetGroup(id);

            if (o === false) {
                this.responseError(response, 3, '/groups/' + id);
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
    groupsSetAttributes(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsSetAttributes(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetGroup(id);

            this.debug("Groups::groupsSetAttributes(): id = " + id);
            this.debug("Groups::groupsSetState(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/groups/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/name', o.name); 
            }
            if (obj.hasOwnProperty('lights')) {
                o.lights = obj.lights;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/lights', o.lights); 
            }
            if (obj.hasOwnProperty('type')) {
                o.type = obj.type;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/type', o.type); 
            }
            if (obj.hasOwnProperty('state')) {
                if (obj.state.hasOwnProperty('all_on')) {
                    o.state.all_on = obj.state.all_on;
                }
                if (obj.state.hasOwnProperty('any_on')) {
                    o.state.any_on = obj.state.any_on;
                }                
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/state', o.state); 
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/recycle', o.recycle); 
            }
            if (obj.hasOwnProperty('class')) {
                o.class = obj.class;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/class', o.class); 
            }
            if (obj.hasOwnProperty('action')) {
                o.action = obj.action;
                this.responseMultiAddSuccess(arr, '/groups/' + id + '/action', o.action); 
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateGroup(id, o);

            process.nextTick(() => {
                this.emit('group-modified', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    groupsSetState(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsSetState(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            this.debug("Groups::groupsSetState(): id = " + id);

            if (obj.hasOwnProperty('scene')) {
                this.debug("Groups::groupsSetState(): recall scene; scene = " + obj.scene);
                this.scenesRecall(response, method, url, urlParts, obj);
            } else if (id === "0") {
                // get all lights
                this.debug("Groups::groupsSetState(): group 0 (aka all lights)");
                var lightlist = this.dsGetAllLightIDs();

                var arr = this.responseMultiBegin(); 

                for (var idx in lightlist) {
                    var lightid = lightlist[idx];
                    this.debug("Groups::groupsSetState(): idx = " + idx + ", lightid = " + JSON.stringify(lightid));
                    
                    if (idx == 0) {
                        this._lightsUpdateState(id, lightid, obj, arr);
                    } else {
                        this._lightsUpdateState(id, lightid, obj, null);
                    }
                }
    
                this.responseMultiEnd(arr, response);
            } else {
                var o = this.dsGetGroup(id);
                this.debug("Groups::groupsSetState(): o = " + JSON.stringify(o));

                if (o === false) {
                    this.responseError(response, 3, '/groups/' + id);
                    return;
                }

                var arr = this.responseMultiBegin(); 

                for (var idx in o.lights) {
                    var lightid = o.lights[idx];
                    this.debug("Groups::groupsSetState(): idx = " + idx + ", lightid = " + lightid);
                    
                    if (idx == 0) {
                        this._lightsUpdateState(id, lightid, obj, arr);
                    } else {
                        this._lightsUpdateState(id, lightid, obj, null);
                    }
                }
    
                this.responseMultiEnd(arr, response);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    groupsDelete(response, method, url, urlParts, obj) {
        this.debug("Groups::groupsDelete(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            if (this.dsDeleteGroup(id)) {
                var resp = [{success: '/groups/' + id + ' deleted.'}];

                this.responseJSON(response, resp);

                process.nextTick(() => {
                    this.emit('group-deleted', id);
                });
            } else {
                this.responseError(response, 3, '/groups/' + id);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    /******************************************************************************************************************
     * private
     *
     */
    _lightsUpdateState(id, lightid, obj, arr) {
        var o = this.dsGetLight(lightid);   // get the light

        if (o === false) {
            this.debug("Groups::_lightsUpdateState(): invalid lightid; lightid = " + lightid);
            //this.responseError(response, 3, '/lights/' + id);
            return;
        }

        this.debug("Groups::_lightsUpdateState(): obj = " + JSON.stringify(obj));
        this.debug("Groups::_lightsUpdateState(): o   = " + JSON.stringify(o));

        if (obj.hasOwnProperty("on")) {
            o.state.on = obj.on;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/on', o.state.on); 
        }
        if (obj.hasOwnProperty('bri')) {
            o.state.bri = obj.bri;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/bri', o.state.bri); 
        } else if (obj.hasOwnProperty('bri_inc')) {
            o.state.bri += obj.bri_inc;
            if (o.state.bri > 254) {
                o.state.bri = 254;
            } else if (o.state.bri < 1) {
                o.state.bri = 1;
            }
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/bri', o.state.bri); 
        }
        if (obj.hasOwnProperty('hue')) {
            o.state.hue = obj.hue;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/hue', o.state.hue); 
        } else if (obj.hasOwnProperty('hue_inc')) {
            if (o.state.hue + obj.hue_inc < 0) {
                // 0 , -2 = 65534
                o.state.hue = (o.state.hue + 65536) + obj.hue_inc;
            } else if(o.state.hue + obj.hue_inc > 65535) {
                // 65535 , 1 = 0
                o.state.hue = (o.state.hue - 65536) + obj.hue_inc;
            } else {
                o.state.hue = o.state.hue + obj.hue_inc;
            }
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/hue', o.state.hue); 
        }
        if (obj.hasOwnProperty('sat')) {
            o.state.sat = obj.sat;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/sat', o.state.sat); 
        } else if (obj.hasOwnProperty('sat_inc')) {
            o.state.sat += obj.sat_inc;
            if (o.state.sat > 254) {
                o.state.sat = 254;
            } else if (o.state.sat < 0) {
                o.state.sat = 0;
            }
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/sat', o.state.sat); 
        }
        if (obj.hasOwnProperty('ct')) {
            o.state.ct = obj.ct;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/ct', o.state.ct); 
        } else if (obj.hasOwnProperty('ct_inc')) {
            o.state.ct += obj.ct_inc;
            if (o.state.ct > 500) {
                o.state.ct = 500;
            } else if (o.state.ct < 153) {
                o.state.ct = 153;
            }
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/ct', o.state.ct); 
        }
        if (obj.hasOwnProperty('xy')) {
            o.state.xy = obj.xy;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/xy', o.state.xy); 
        } else if (obj.hasOwnProperty('xy_inc')) {
            var x = o.state.xy[0] + obj.xy_inc[0];
            var y = o.state.xy[1] + obj.xy_inc[1];
            if (x > 1) { x = 1; } else if (x < 0) { x = 0; }
            if (y > 1) { y = 1; } else if (y < 0) { y = 0; }
            o.state.xy[0] = x;
            o.state.xy[1] = y;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/xy', o.state.xy); 
        }
        if (obj.hasOwnProperty('colormode')) {
            o.state.colormode = obj.colormode;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/colormode', o.state.colormode); 
        }
        if (obj.hasOwnProperty('effect')) {
            o.state.effect = obj.effect;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/effect', o.state.effect); 
        }
        if (obj.hasOwnProperty('alert')) {
            o.state.alert = obj.alert;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/alert', o.state.alert); 
        }
        if (obj.hasOwnProperty('transitiontime')) {
            o.state.transitiontime = obj.transitiontime;
            if (arr !== null) this.responseMultiAddSuccess(arr, '/groups/' + id + '/action/transitiontime', o.state.transitiontime); 
        }

        this.dsUpdateLightState(lightid, o.state);

        process.nextTick(() => {
            this.emit('light-state-modified', lightid, obj);
        });
    }
};

module.exports = Groups;
