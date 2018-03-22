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

const schedule = require('node-schedule');

class Schedules {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/schedules-api-0
    //
    schedulesDispatcher(response, method, url, urlParts, obj) {
        //console.log("Schedules::schedulesDispatcher(): url = " + url);

        /*
         3.1. Get all schedules         - GET,  /api/<username>/schedules
         3.2. Create schedule           - POST, /api/<username>/schedules
         3.3. Get schedule attributes   - GET,  /api/<username>/schedules/<id>
         3.4. Set schedule attributes   - PUT,  /api/<username>/schedules/<id>
         3.5. Delete schedule           - DEL,  /api/<username>/schedules/<id>
        */

        var api1 = /^\/api\/(\w+)\/schedules$/.exec(url);
        var api2 = /^\/api\/(\w+)\/schedules\/(\w+)$/.exec(url);

        if (api1 && method === 'get') {              // 3.1
            this.debug("Schedules::schedulesDispatcher(): Get all schedules");
            this.schedulesGetAll(response, method, url, urlParts, obj);
        } else if (api1 && method === 'post') {      // 3.2
            this.debug("Schedules::schedulesDispatcher(): Create schedule");
            this.schedulesCreate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {       // 3.3
            this.debug("Schedules::schedulesDispatcher(): Get schedule attributes");
            this.schedulesGet(response, method, url, urlParts, obj);
        } else if (api2 && method === 'put') {       // 3.4
            this.debug("Schedules::schedulesDispatcher(): Set schedule attributes");
            this.schedulesUpdate(response, method, url, urlParts, obj);
        } else if (api2 && method === 'delete') {    // 3.5
            this.debug("Schedules::schedulesDispatcher(): Delete schedule");
            this.schedulesDelete(response, method, url, urlParts, obj);
        } else {
            //this.debug("Schedules::schedulesDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    schedulesGetAll(response, method, url, urlParts, obj) {
        this.debug("Schedules::schedulesGetAll()");
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllSchedules());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    schedulesGet(response, method, url, urlParts, obj) {
        this.debug("Schedules::schedulesGet(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSchedule(id);

            if (o === false) {
                this.responseError(response, 3, '/schedules/' + id);
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
    schedulesCreate(response, method, url, urlParts, obj) {
        this.debug("Schedules::schedulesCreate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = this.dsCreateSchedule(urlParts[2]);
            var o  = this.dsGetSchedule(id);

            if (o === false) {
                this.responseError(response, 3, '/schedules/' + id);
                return;
            }

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
            }
            if (obj.hasOwnProperty('description')) {
                o.description = obj.description;
            }
            if (obj.hasOwnProperty('localtime')) {
                o.localtime = obj.localtime;
            }
            if (obj.hasOwnProperty('status')) {
                o.status = obj.status;
            }
            if (obj.hasOwnProperty('autodelete')) {
                o.autodelete = obj.autodelete;
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
            }
            if (obj.hasOwnProperty('command')) {
                var cmd = this._validateCommand(obj.command);
                if (cmd !== false) {
                    o.command = cmd;
                } else {
                    this.debug("Schedules::schedulesCreate(): invalid command");
                }
            }

            var t = this.schedulesParseTime(o.localtime);

            this.debug("Schedules::schedulesCreate(): o = " + JSON.stringify(o));
            this.dsUpdateSchedule(id, o, t);

            var arr = this.responseMultiBegin(); this.responseMultiAddSuccess(arr, "id", id); this.responseMultiEnd(arr, response);

            process.nextTick(() => {
                this.emit('schedule-created', id, o, t);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    schedulesUpdate(response, method, url, urlParts, obj) {
        this.debug("Schedules::schedulesUpdate(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];
            var o  = this.dsGetSchedule(id);

            this.debug("Schedules::schedulesUpdate(): id = " + id);
            this.debug("Schedules::schedulesUpdate(): o = " + JSON.stringify(o));

            if (o === false) {
                this.responseError(response, 3, '/schedules/' + id);
                return;
            }

            var arr = this.responseMultiBegin(); 

            if (obj.hasOwnProperty('name')) {
                o.name = obj.name;
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/name', o.name); 
            }
            if (obj.hasOwnProperty('description')) {
                o.description = obj.description;
                this.responseMultiAddSuccess(arr, 'schedules/' + id + '/description', o.description); 
            }
            if (obj.hasOwnProperty('localtime')) {
                o.localtime = obj.localtime;
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/localtime', o.localtime); 
            }
            if (obj.hasOwnProperty('status')) {
                o.status = obj.status;
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/status', o.status); 
            }
            if (obj.hasOwnProperty('autodelete')) {
                o.autodelete = obj.autodelete;
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/autodelete', o.autodelete); 
            }
            if (obj.hasOwnProperty('recycle')) {
                o.recycle = obj.recycle;
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/recycle', o.recycle); 
            }
            if (obj.hasOwnProperty('command')) {
                var cmd = this._validateCommand(obj.command);
                if (cmd !== false) {
                    o.command = cmd;
                } else {
                    this.debug("Schedules::schedulesCreate(): invalid command");
                }
                this.responseMultiAddSuccess(arr, '/schedules/' + id + '/command', o.command); 
            }

            this.responseMultiEnd(arr, response);

            var t = this.schedulesParseTime(o.localtime);

            this.dsUpdateSchedule(id, o);

            process.nextTick(() => {
                this.emit('schedule-modified', id, o, t);
            });
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    schedulesDelete(response, method, url, urlParts, obj) {
        this.debug("Schedules::schedulesDelete(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var id = urlParts[4];

            if (this.dsDeleteSchedule(id)) {
                var resp = [{success: '/schedules/' + id + ' deleted.'}];

                this.responseJSON(response, resp);

                process.nextTick(() => {
                    this.emit('schedule-deleted', id);
                });
            } else {
                this.responseError(response, 3, '/schedules/' + id);
            }
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    /******************************************************************************************************************
     * internal
     *
     */

    // https://developers.meethue.com/documentation/datatypes-and-time-patterns#16_time_patterns
    schedulesParseTime(localtime) {
        this.debug("Schedules::schedulesParseTime(): localtime = " + localtime); 

        // W3/T13:42:00A00:30:00

        // absolute time
        var absTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // randomized time
        var randTime = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})A(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring times
        var recurTime = /^W(\d{1,3})\/T(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring randomized times
        var recurRandTime = /^W(\d{1,3})\/T(\d{2}):(\d{2}):(\d{2})A(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // time intervals - every day from left time to right time (maximal interval length is 23 hours)
        var intervalTime = /^T(\d{2}):(\d{2}):(\d{2})\/T(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // time intervals - every weekday given by bbb from left side time to right side time 
        var dayTime = /^W(\d{1,3})\/T(\d{2}):(\d{2}):(\d{2})\/T(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // timer, expiring after given time
        var timer1 = /^PT(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // timer with random element
        var timer2 = /^PT(\d{2}):(\d{2}):(\d{2})A(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring timer
        var timer3 = /^R(\d{2})\/PT(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring timer
        var timer4 = /^R\/PT(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring timer with random element
        var timer5 = /^R(\d{2})\/PT(\d{2}):(\d{2}):(\d{2})A(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);
        // recurring timer with random element
        var timer6 = /^R\/PT(\d{2}):(\d{2}):(\d{2})A(\d{2}):(\d{2}):(\d{2})$/.exec(localtime);

        var t = {
            type: "none"
        };

        if (absTime) {
            t.type  = "abs";
            t.year  = parseInt(absTime[1]);
            t.month = parseInt(absTime[2]);
            t.day   = parseInt(absTime[3]);
            t.h     = parseInt(absTime[4]);
            t.m     = parseInt(absTime[5]);
            t.s     = parseInt(absTime[6]);
            this.debug("Schedules::schedulesParseTime(absTime)");
        } else if (randTime) {
            t.type  = "rand";
            t.year  = parseInt(absTime[1]);
            t.month = parseInt(absTime[2]);
            t.day   = parseInt(absTime[3]);
            t.h     = parseInt(absTime[4]);
            t.m     = parseInt(absTime[5]);
            t.s     = parseInt(absTime[6]);
            t.a_h   = parseInt(absTime[7]);
            t.a_m   = parseInt(absTime[8]);
            t.a_s   = parseInt(absTime[9]);
            this.debug("Schedules::schedulesParseTime(randTime)");
        } else if (recurTime) {
            t.type      = "recur";
            t.monday    = (parseInt(recurTime[1]) & 0b01000000) ? true : false;
            t.tuesday   = (parseInt(recurTime[1]) & 0b00100000) ? true : false;
            t.wednesday = (parseInt(recurTime[1]) & 0b00010000) ? true : false;
            t.thursday  = (parseInt(recurTime[1]) & 0b00001000) ? true : false;
            t.friday    = (parseInt(recurTime[1]) & 0b00000100) ? true : false;
            t.saturday  = (parseInt(recurTime[1]) & 0b00000010) ? true : false;
            t.sunday    = (parseInt(recurTime[1]) & 0b00000001) ? true : false;
            t.h         = parseInt(recurTime[2]);
            t.m         = parseInt(recurTime[3]);
            t.s         = parseInt(recurTime[4]);
            this.debug("Schedules::schedulesParseTime(recurTime)");
        } else if (recurRandTime) {
            t.type      = "recurRand";
            t.monday    = (parseInt(recurRandTime[1]) & 0b01000000) ? true : false;
            t.tuesday   = (parseInt(recurRandTime[1]) & 0b00100000) ? true : false;
            t.wednesday = (parseInt(recurRandTime[1]) & 0b00010000) ? true : false;
            t.thursday  = (parseInt(recurRandTime[1]) & 0b00001000) ? true : false;
            t.friday    = (parseInt(recurRandTime[1]) & 0b00000100) ? true : false;
            t.saturday  = (parseInt(recurRandTime[1]) & 0b00000010) ? true : false;
            t.sunday    = (parseInt(recurRandTime[1]) & 0b00000001) ? true : false;
            t.h         = parseInt(recurRandTime[2]);
            t.m         = parseInt(recurRandTime[3]);
            t.s         = parseInt(recurRandTime[4]);
            t.a_h       = parseInt(recurRandTime[5]);
            t.a_m       = parseInt(recurRandTime[6]);
            t.a_s       = parseInt(recurRandTime[7]);
            this.debug("Schedules::schedulesParseTime(recurRand)");
        } else if (intervalTime) {
            t.type = "interval";
            t.h     = parseInt(intervalTime[1]);
            t.m     = parseInt(intervalTime[2]);
            t.s     = parseInt(intervalTime[3]);
            t.t_h   = parseInt(intervalTime[4]);
            t.t_m   = parseInt(intervalTime[5]);
            t.t_s   = parseInt(intervalTime[6]);
            this.debug("Schedules::schedulesParseTime(intervalTime)");
        } else if (dayTime) {
            t.type = "day";
            t.monday    = (parseInt(dayTime[1]) & 0b01000000) ? true : false;
            t.tuesday   = (parseInt(dayTime[1]) & 0b00100000) ? true : false;
            t.wednesday = (parseInt(dayTime[1]) & 0b00010000) ? true : false;
            t.thursday  = (parseInt(dayTime[1]) & 0b00001000) ? true : false;
            t.friday    = (parseInt(dayTime[1]) & 0b00000100) ? true : false;
            t.saturday  = (parseInt(dayTime[1]) & 0b00000010) ? true : false;
            t.sunday    = (parseInt(dayTime[1]) & 0b00000001) ? true : false;
            t.h         = parseInt(dayTime[2]);
            t.m         = parseInt(dayTime[3]);
            t.s         = parseInt(dayTime[4]);
            t.t_h       = parseInt(dayTime[5]);
            t.t_m       = parseInt(dayTime[6]);
            t.t_s       = parseInt(dayTime[7]);
            this.debug("Schedules::schedulesParseTime(dayTime)");
        } else if (timer1) {
            t.type  = "t1";
            t.h     = parseInt(timer1[1]);
            t.m     = parseInt(timer1[2]);
            t.s     = parseInt(timer1[3]);
            this.debug("Schedules::schedulesParseTime(timer1)");
        } else if (timer2) {
            t.type = "t2";
            t.h     = parseInt(timer2[1]);
            t.m     = parseInt(timer2[2]);
            t.s     = parseInt(timer2[3]);
            t.a_h   = parseInt(timer2[4]);
            t.a_m   = parseInt(timer2[5]);
            t.a_s   = parseInt(timer2[6]);
            this.debug("Schedules::schedulesParseTime(timer2)");
        } else if (timer3) {
            t.type          = "t3";
            t.recurrences   = parseInt(timer3[1]);
            t.h             = parseInt(timer3[2]);
            t.m             = parseInt(timer3[3]);
            t.s             = parseInt(timer3[4]);
            this.debug("Schedules::schedulesParseTime(timer3)");
        } else if (timer4) {
            t.type  = "t4";
            t.h     = parseInt(timer3[1]);
            t.m     = parseInt(timer3[2]);
            t.s     = parseInt(timer3[3]);
            this.debug("Schedules::schedulesParseTime(timer4)");
        } else if (timer5) {
            t.type          = "t5";
            t.recurrences   = parseInt(timer5[1]);
            t.h             = parseInt(timer5[2]);
            t.m             = parseInt(timer5[3]);
            t.s             = parseInt(timer5[4]);
            t.a_h           = parseInt(timer5[5]);
            t.a_m           = parseInt(timer5[6]);
            t.a_s           = parseInt(timer5[7]);
            this.debug("Schedules::schedulesParseTime(timer5)");
        } else if (timer6) {
            t.type          = "t6";
            t.h             = parseInt(timer5[1]);
            t.m             = parseInt(timer5[2]);
            t.s             = parseInt(timer5[3]);
            t.a_h           = parseInt(timer5[4]);
            t.a_m           = parseInt(timer5[5]);
            t.a_s           = parseInt(timer5[6]);
            this.debug("Schedules::schedulesParseTime(timer6)");
        } else {
            this.debug("Schedules::schedulesParseTime(): no valid time found");
            return false;
        }

        this.debug("Schedules::schedulesParseTime(): t = " + JSON.stringify(t));

        return t;
    }    
    /******************************************************************************************************************
     * private
     *
     */
    _validateCommand(command) {
        /*
            {
                "method":"PUT",
                "address":"/api/Ua5a0be45785e48549109a965c6c8d2f3/lights/1/state",
                "body":{
                    "bri":1
                }
            }
        */
       
        // check if light id is valid
        // dsGetLight(id)

        // ....

        // ....

        return command;
    }
};

module.exports = Schedules;
