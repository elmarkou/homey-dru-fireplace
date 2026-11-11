'use strict';

// Self-check: runs DruDevice against a local jsmodbus server with a stub Homey. Run: npm test
const assert = require('assert');
const net = require('net');
const Module = require('module');
const Modbus = require('jsmodbus');

class StubDevice {
  constructor(settings) {
    this.caps = {};
    this.listeners = {};
    this.settings = settings;
    this.homey = { setInterval, clearInterval, setTimeout, clearTimeout, __: (k) => k };
  }
  log() {}
  error(...a) { console.error(...a); }
  hasCapability() { return false; }
  getSettings() { return this.settings; }
  getCapabilityValue(c) { return this.caps[c]; }
  async setCapabilityValue(c, v) { this.caps[c] = v; }
  async setAvailable() {}
  async setUnavailable() {}
  registerCapabilityListener(c, fn) { this.listeners[c] = fn; }
}
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  return req === 'homey' ? { Device: StubDevice } : origLoad.call(this, req, ...rest);
};
const DruDevice = require('../drivers/dru/device');

const holding = Buffer.alloc(40210 * 2);
const reg = (r, v) => (v === undefined ? holding.readUInt16BE(r * 2) : holding.writeUInt16BE(v, r * 2));
reg(40203, 2 | 4 | 8); // pilot, main, burner 2
reg(40207, 215); // 21.5 °C
reg(40201, 60);
reg(40206, 145); // -72.5 dBm

const tcp = new net.Server();
new Modbus.server.TCP(tcp, { holding });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rejects = (p, msg) => assert.rejects(p, { message: msg });

tcp.listen(0, async () => {
  const dev = new DruDevice({ address: '127.0.0.1', port: tcp.address().port, polling: 60 });
  await dev.onInit();
  await wait(300);
  assert.deepStrictEqual(dev.caps, {
    onoff: true, burner2: true, pilot_flame: true, eco_wave: false,
    status_raw: 14, fault_code: 0, alarm_generic: false, measure_temperature: 21.5, dim: 0.6, signal_strength: -72,
  });

  await dev.listeners.dim(0.35);
  assert.strictEqual(reg(40201), 35);
  await dev.listeners.burner2(false);
  assert.strictEqual(reg(40200), 4);
  await dev.listeners.eco_wave(true);
  assert.strictEqual(reg(40200), 105);
  await dev.listeners.onoff(false);
  assert.strictEqual(reg(40200), 3);
  await dev.listeners['button.full_off']();
  assert.strictEqual(reg(40200), 1);

  // Ignition is locked until armed.
  reg(40200, 0);
  dev.caps.onoff = false;
  await rejects(dev.listeners.onoff(true), 'error.locked');
  assert.strictEqual(reg(40200), 0);
  await rejects(dev.listeners.burner2(true), 'error.notOn');
  dev.caps.ignite_armed = true;
  await dev.listeners.onoff(true);
  assert.strictEqual(reg(40200), 101);
  assert.strictEqual(dev.caps.ignite_armed, false);

  // Polling stays quiet right after a command, then resumes.
  reg(40203, 4 | 512);
  await dev.poll();
  assert.strictEqual(dev.caps.status_raw, 14);
  await wait(3300);
  assert.strictEqual(dev.caps.status_raw, 516);
  assert.strictEqual(dev.caps.eco_wave, true);
  assert.strictEqual(dev.caps.pilot_flame, false);

  await dev.onUninit();
  tcp.close();
  console.log('OK');
});
