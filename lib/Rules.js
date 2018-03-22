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

class Rules {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/rules-api
    //
    rulesDispatcher(response, method, url, urlParts, obj) {
        //this.debug("Rules::rulesDispatcher(): url = " + url);

        /*
         6.1. Get all rules - GET,  /api/<username>/rules
         6.2. Get Rule      - GET,  /api/<username>/rules/<id>
         6.3. Create Rule   - POST, /api/<username>/rules
         6.4. Update Rule   - PUT,  /api/<username>/rules/<id>
         6.5. Delete Rule   - DEL,  /api/<username>/rules/<id>
        */

        var api1 = /^\/api\/(\w+)\/rules$/.exec(url);
        var api2 = /^\/api\/(\w+)\/rules\/(\w+)$/.exec(url);

        if (api1 && method === 'get') {              // 6.1
            this.debug("Rules::rulesDispatcher(): Get all rules");
            this.rulesGetAll(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {       // 6.2
            this.debug("Rules::rulesDispatcher(): Get Rule");
            this.rulesGet(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {      // 6.3
            this.debug("Rules::rulesDispatcher(): Create Rule");
            this.rulesCreate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'put') {       // 6.4
            this.debug("Rules::rulesDispatcher(): Update Rule");
            this.rulesUpdate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'delete') {    // 6.5
            this.debug("Rules::rulesDispatcher(): Delete Rule");
            this.rulesDelete(response, method, url, urlParts, obj);
        } else {
            //this.debug("Rules::rulesDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    rulesGetAll(response, method, url, urlParts, obj) {
        this.debug("Rules::rulesGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllRules());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    rulesGet(response, method, url, urlParts, obj) {
        this.debug("Rules::rulesGet(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetRule(id);

            if (o === false) {
                this.responseError(response, 3, '/rules/' + id);
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
    rulesCreate(response, method, url, urlParts, obj) {
        this.debug("Rules::rulesCreate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = this.dsCreateRule(urlParts[2]);
            var o  = this.dsGetRule(id);

            if (o === false) {
                this.responseError(response, 3, '/rules/' + id);
                return;
            }

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
            }
            if (obj.hasOwnProperty('status')) {
                o.status = obj.status;
            }
            if (obj.hasOwnProperty('conditions')) {
                for (var idx in obj.conditions) {
                    var condition = obj.conditions[idx];
                    this.debug("Rules::rulesCreate(): idx = " + idx + ", condition = " + JSON.stringify(condition));
                    
                    var c = {
                        address: "",
                        operator: "",
                        value: "",
                        _sensorid: 0,       // make life easier for the rule engine
                        _key: ""            // do.
                    };

                    if (condition.hasOwnProperty('address')) {
                        c.address = condition.address;

                        var path    = condition.address.split('/');
                        c._sensorid = path[2];
                        c._key      = path[4];

                        if (path[1] != 'sensors' || path[3] != 'state') {
                            throw "Rules::rulesCreate(): not 'sensors' or not 'state'";
                        }
                    }
                    if (condition.hasOwnProperty('operator')) {
                        c.operator = condition.operator;
                    }
                    if (condition.hasOwnProperty('value')) {
                        c.value = condition.value;
                    }

                    o.conditions.push(c);
                }
            }
            if (obj.hasOwnProperty('actions')) {
                for (var idx in obj.actions) {
                    var action = obj.actions[idx];
                    this.debug("Rules::rulesCreate(): idx = " + idx + ", action = " + JSON.stringify(action));
                    
                    var a = {
                        address: "",
                        method: "",
                        body: {}
                    };

                    if (action.hasOwnProperty('address')) {
                        a.address = action.address;
                    }
                    if (action.hasOwnProperty('method')) {
                        a.method = action.method;
                    }
                    if (action.hasOwnProperty('body')) {
                        a.body = action.body;               // JSON object
                    }

                    o.actions.push(a);
                }
            }

            this.debug("Rules::rulesCreate(): o = " + JSON.stringify(o));
            this.dsUpdateRule(id, o);

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "id", id); this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('rule-created', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    rulesUpdate(response, method, url, urlParts, obj) {
        this.debug("Rules::rulesUpdate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetRule(id);

            this.debug("Rules::rulesUpdate(): id = " + id);
            this.debug("Rules::rulesUpdate(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/rules/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/rules/' + id + '/name', o.name); 
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
                this.responseMultiAddSuccess(arr, '/rules/' + id + '/recycle', o.recycle); 
            }
            if (obj.hasOwnProperty('status')) {
                o.status = obj.status;
                this.responseMultiAddSuccess(arr, '/rules/' + id + '/status', o.status); 
            }
            if (obj.hasOwnProperty('conditions')) {
                o.conditions = [];

                for (var idx in obj.conditions) {
                    var condition = obj.conditions[idx];
                    this.debug("Rules::rulesUpdate(): idx = " + idx + ", condition = " + JSON.stringify(condition));
                    
                    var c = {
                        address: "",
                        operator: "",
                        value: ""
                    };

                    if (condition.hasOwnProperty('address')) {
                        c.address = condition.address;

                        var path    = condition.address.split('/');
                        c._sensorid = path[2];
                        c._key      = path[4];

                        if (path[1] != 'sensors' || path[3] != 'state') {
                            throw "Rules::rulesUpdate(): not 'sensors' or not 'state'";
                        }
                    }
                    if (condition.hasOwnProperty('operator')) {
                        c.operator = condition.operator;
                    }
                    if (condition.hasOwnProperty('value')) {
                        c.value = condition.value;
                    }

                    o.conditions.push(c);
                }

                this.responseMultiAddSuccess(arr, '/rules/' + id + '/conditions', o.conditions); 
            }
            if (obj.hasOwnProperty('actions')) {
                o.actions = [];
                for (var idx in obj.actions) {
                    var action = obj.actions[idx];
                    this.debug("Rules::rulesUpdate(): idx = " + idx + ", action = " + JSON.stringify(action));
                    
                    var a = {
                        address: "",
                        method: "",
                        body: {}
                    };

                    if (action.hasOwnProperty('address')) {
                        a.address = action.address;
                    }
                    if (action.hasOwnProperty('method')) {
                        a.method = action.method;
                    }
                    if (action.hasOwnProperty('body')) {
                        a.body = action.body;               // JSON object
                    }

                    o.actions.push(a);
                }

                this.responseMultiAddSuccess(arr, '/rules/' + id + '/actions', o.actions); 
            }

            this.responseMultiEnd(arr, response);
            
            this.dsUpdateRule(id, o);

            process.nextTick(() => {
                this.emit('rule-modified', id, o);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    rulesDelete(response, method, url, urlParts, obj) {
        this.debug("Rules::rulesDelete(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            if (this.dsDeleteRule(id)) {
                var resp = [{success: '/rules/' + id + ' deleted.'}];

                this.responseJSON(response, resp);

                process.nextTick(() => {
                    this.emit('rule-deleted', id);
                });
            } else {
                this.responseError(response, 3, '/rules/' + id);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
};

module.exports = Rules;
