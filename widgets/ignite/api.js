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
  async set({ homey, body }) {
    const d = homey.app.fireplace;
    if (typeof body.flame === 'number') await d.setFlame(Math.max(0, Math.min(100, Math.round(body.flame))));
    if (typeof body.burner2 === 'boolean') await d.setBurner2(body.burner2);
    if (typeof body.eco === 'boolean') await d.setEcoWave(body.eco);
  },
};
