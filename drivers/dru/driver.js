'use strict';

const Homey = require('homey');

class DruDriver extends Homey.Driver {

  // Gateways are found by MAC address (Airios, maker of the Dru/Honeywell BRDG-03EM01), see "discovery" in app.json.
  // ponytail: no Modbus check while pairing, the gateway allows one client and Airios only makes these RF gateways.
  async onPairListDevices() {
    const results = this.homey.discovery.getStrategy('dru').getDiscoveryResults();
    return Object.values(results).map((result) => ({
      name: this.homey.__('pair.devicename'),
      data: { id: result.id },
      settings: { address: result.address },
    }));
  }

}

module.exports = DruDriver;
