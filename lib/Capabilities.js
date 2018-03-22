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

class Capabilities {
    constructor() {
    }
    //
    // https://developers.meethue.com/documentation/capabilities-api
    //
    capabilitiesDispatcher(response, method, url, urlParts, obj) {
        //this.debug("Capabilities::capabilitiesDispatcher(): url = " + url);

        /*
         10.1. Get all Capabilities - GET, /api/<username>/capabilities
        */

        var api1 = /^\/api\/(\w+)\/capabilities$/.exec(url);
        var api2 = /^\/api\/(\w+)\/capabilities\/timezones$/.exec(url);
        
        if (api1 && method === 'get') {              // 10.1
            this.debug("Capabilities::capabilitiesDispatcher(): Get all Capabilities");
            this.capabilitiesGetAll(response, method, url, urlParts, obj);
        } else if (api2 && method === 'get') {
            this.debug("Capabilities::capabilitiesDispatcher(): Get timezones");
            this.capabilitiesGetTimezones(response, method, url, urlParts, obj);
        } else {
            //this.debug("Capabilities::capabilitiesDispatcher(): nothing here ...");
            return false;
        }

        return true;
    }
    /******************************************************************************************************************
     * webhooks
     *
     */
    capabilitiesGetAll(response, method, url, urlParts, obj) {
        this.debug("Capabilities::capabilitiesGetAll(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            this.responseJSON(response, this.dsGetAllCapabilities());
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
    //
    //
    //
    capabilitiesGetTimezones(response, method, url, urlParts, obj) {
        this.debug("Capabilities::capabilitiesGetTimezones(): obj = " + JSON.stringify(obj));
        
        if (this.dsIsUsernameValid(urlParts[2])) {
            var c = this.dsGetAllCapabilities();

            this.responseJSON(response, c.timezones.values);
        } else {
            this.responseError(response, 1, '/config/whitelist/' + urlParts[2]);
        }
    }
};

module.exports = Capabilities;
