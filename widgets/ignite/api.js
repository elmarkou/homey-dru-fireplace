'use strict';

module.exports = {
  async state({ homey }) {
    const d = homey.app.fireplace;
    const v = (c) => d.getCapabilityValue(c);
    return {
      available: d.getAvailable(),
      on: v('onoff'),
      pilot: v('pilot_flame'),
      burner2: v('burner2'),
      eco: v('eco_wave'),
      flame: Math.round((v('dim') || 0) * 100),
      temp: v('measure_temperature'),
      fault: v('fault_code'),
    };
  },
  async ignite({ homey }) {
    await homey.app.fireplace.ignite();
  },
  async off({ homey }) {
    await homey.app.fireplace.turnOff();
  },
};
