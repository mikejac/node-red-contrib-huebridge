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

class Scenes {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/scenes-api
    //
    scenesDispatcher(response, method, url, urlParts, obj) {
        //console.log("Scenes::scenesDispatcher(): url = " + url);

        /*
         4.1. Get all scenes    - GET,  /api/<username>/scenes
         4.2. Create Scene      - POST, /api/<username>/scenes
         4.3. Modify Scene      - PUT,  /api/<username>/scenes/<id>/lightstates/<id>
         4.4. Recall a scene    - done via groups
         4.5. Delete scene      - DEL,  /api/<username>/scenes/<id>
         4.6. Get Scene         - GET,  /api/<username>/scenes/<id>
        */

        var api1 = /^\/api\/(\w+)\/scenes$/.exec(url);
        var api2 = /^\/api\/(\w+)\/scenes\/(\w+)$/.exec(url);
        var api3 = /^\/api\/(\w+)\/scenes\/(\w+)\/lightstates\/(\w+)$/.exec(url);

        if (api1 && method === 'get') {              // 4.1
            this.debug("Scenes::scenesDispatcher(): Get all scenes");
            this.scenesGetAll(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {      // 4.2
            this.debug("Scenes::scenesDispatcher(): Create Scene");
            this.scenesCreate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'put') {       // 4.3
            this.debug("Scenes::scenesDispatcher(): Modify Scene");
            this.scenesModify(response, method, url, urlParts, obj);
        } else if (api3 && method === 'put') {       // 4.3
            this.debug("Scenes::scenesDispatcher(): Modify Scene");
            this.scenesModifyLightstate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'delete') {    // 4.5
            this.debug("Scenes::scenesDispatcher(): Delete scene");
            this.scenesDelete(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {       // 4.6
            this.debug("Scenes::scenesDispatcher(): Get Scene");
            this.scenesGet(response, method, url, urlParts, obj);
        } else {
            //this.debug("Scenes::scenesDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    scenesGetAll(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllScenes());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    scenesCreate(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesCreate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = this.dsCreateScene(urlParts[2]);
            var o  = this.dsGetScene(id);

            if (o === false) {
                this.responseError(response, 3, '/scenes/' + id);
                return;
            }

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
            }
            if (obj.hasOwnProperty('lights')) {
                o.lights = obj.lights;
            }
            if (obj.hasOwnProperty('owner')) {
                o.owner = obj.owner;
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
            }
            if (obj.hasOwnProperty('appdata')) {
                o.appdata = obj.appdata;
            }
            if (obj.hasOwnProperty('picture')) {
                o.picture = obj.picture;
            }
            if (obj.hasOwnProperty('effect')) {
                o.effect = obj.effect;
            }
            if (obj.hasOwnProperty('transitiontime')) {
                o.transitiontime = obj.transitiontime;
            }
            if (obj.hasOwnProperty('version')) {
                o.version = obj.version;
            }

            this.dsUpdateScene(id, o);

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "id", id); this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('scene-created', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    scenesModify(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesModify(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id      = urlParts[4];
            var o       = this.dsGetScene(id);

            this.debug("Scenes::scenesModify(): id = " + id);
            this.debug("Scenes::scenesModify(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/scenes/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/name', o.name); 
            }
            if (obj.hasOwnProperty('lights')) {
                o.lights = obj.lights;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lights', o.lights); 
            }
            if (obj.hasOwnProperty('storelightstate')) {
                // get current values from all the lights in this scene and store those values in this scene
                for (var idx in o.lights) {
                    var lightid = o.lights[idx];
                    this.debug("Scenes::scenesModify(): idx = " + idx + ", lightid = " + lightid);
                    
                    var l = this.dsGetLight(lightid);

                    if (l !== false) {
                        o.lightstate[lightid] = l.state;
                    }
                }

                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/storelightstate', true); 
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateScene(id, o);

            process.nextTick(() => {
                this.emit('scene-modified', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    scenesModifyLightstate(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesModifyLightstate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id      = urlParts[4];
            var lightid = urlParts[6];
            var o       = this.dsGetScene(id);

            this.debug("Scenes::scenesModifyLightstate(): id = " + id);
            this.debug("Scenes::scenesModifyLightstate(): lightid = " + lightid);
            this.debug("Scenes::scenesModifyLightstate(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/scenes/' + id);
                return;
            }

            if (!o.lightstates.hasOwnProperty(lightid)) {
                this.debug("Scenes::scenesModifyLightstate(): creating lightstate");
                o.lightstates[lightid] = this.dsCreateLightState();
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('on')) {
                o.lightstates[lightid].on = obj.on;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/on', obj.on); 
            }
            if (obj.hasOwnProperty('bri')) {
                o.lightstates[lightid].bri = obj.bri;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/bri', obj.bri); 
            }
            if (obj.hasOwnProperty('hue')) {
                o.lightstates[lightid].hue = obj.hue;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/hue', obj.hue); 
            }
            if (obj.hasOwnProperty('sat')) {
                o.lightstates[lightid].sat = obj.sat;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/sat', obj.sat); 
            }
            if (obj.hasOwnProperty('xy')) {
                o.lightstates[lightid].xy = obj.xy;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/xy', obj.xy); 
            }
            if (obj.hasOwnProperty('ct')) {
                o.lightstates[lightid].ct = obj.ct;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/ct', obj.ct); 
            }
            if (obj.hasOwnProperty('effect')) {
                o.lightstates[lightid].effect = obj.effect;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/effect', obj.effect); 
            }
            if (obj.hasOwnProperty('transitiontime')) {
                o.lightstates[lightid].transitiontime = obj.transitiontime;
                this.responseMultiAddSuccess(arr, '/scenes/' + id + '/lightstates/' + lightid + '/transitiontime', obj.transitiontime); 
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateScene(id, o);

            process.nextTick(() => {
                this.emit('scene-lightstate-modified', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    scenesDelete(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesDelete()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            if (this.dsDeleteScene(id)) {
                var resp = [{success: '/scenes/' + id + ' deleted.'}];

                this.responseJSON(response, resp);

                process.nextTick(() => {
                    this.emit('scene-deleted', id);
                });
            } else {
                this.responseError(response, 3, '/scenes/' + id);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    scenesGet(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesGet()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            this.responseJSON(response, this.dsGetScene(id));
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    /******************************************************************************************************************
     * internal
     *
     */
    scenesRecall(response, method, url, urlParts, obj) {
        this.debug("Scenes::scenesRecall(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            if (!obj.hasOwnProperty('scene')) {
                this.responseError(response, 2, '/groups/' + groupid + '/action/scene", "value":"scene missing"}]');
                return;
            }

            var groupid = urlParts[4];
            var scene   = this.dsGetScene(obj.scene);

            this.debug("Scenes::scenesRecall(): groupid = " + groupid);
            this.debug("Scenes::scenesRecall(): o = " + JSON.stringify(scene));

            if (scene === false) {
                this.responseError(response, 3, '/groups/' + groupid + '/action/scene", "value":"' + obj.scene + '"}]');
                return;
            }

            for (var idx in scene.lights) {
                var lightid = scene.lights[idx];
                this.debug("Scenes::scenesRecall(): idx = " + idx + ", lightid = " + lightid);
                
                this._lightsUpdateState("n/a", lightid, scene.lightstates[lightid], null);
            }

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, '/groups/' + groupid + '/action/scene', obj.scene); this.responseMultiEnd(arr, response);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
};

module.exports = Scenes;
