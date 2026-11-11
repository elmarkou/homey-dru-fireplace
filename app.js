'use strict';

const Homey = require('homey');

class DruApp extends Homey.App {

  async onInit() {
    const { flow } = this.homey;
    const action = (id, fn) => flow.getActionCard(id).registerRunListener(fn);
    const condition = (id, cap) => flow.getConditionCard(id)
      .registerRunListener(({ device }) => Boolean(device.getCapabilityValue(cap)));

    action('ignite', ({ device }) => device.ignite());
    action('turn_off', ({ device }) => device.turnOff());
    action('full_off', ({ device }) => device.fullOff());
    action('set_burner2', ({ device, state }) => device.setBurner2(state === 'on'));
    action('set_eco_wave', ({ device, state }) => device.setEcoWave(state === 'on'));
    action('set_flame', ({ device, height }) => device.setFlame(Math.round(height)));
    condition('burner2_on', 'burner2');
    condition('eco_wave_on', 'eco_wave');
    condition('pilot_on', 'pilot_flame');
  }

  // ponytail: widget controls the first fireplace; add a device picker when someone has two.
  get fireplace() {
    const [device] = this.homey.drivers.getDriver('dru').getDevices();
    if (!device) throw new Error(this.homey.__('error.noDevice'));
    return device;
  }

}

module.exports = DruApp;
