'use strict';

const net = require('net');
const Homey = require('homey');
const Modbus = require('jsmodbus');

// Dru Modbus TCP holding registers (Honeywell gateway, unit id 2)
const UNIT_ID = 2;
const REG_ACTION = 40200; // write-only command register
const REG_FLAME = 40201; // flame height 0..100, reads 254 when off or right after ignition
const REG_STATUS = 40203; // bitmask, see STATUS
const REG_FAULT = 40204;
const REG_RSSI = 40206; // fireplace signal, dBm = -raw / 2
const REG_TEMP = 40207; // room temperature * 10

const ACTION = {
  IGNITE: 101, // verified: starts with both burners
  OFF: 3, // verified: main burner off
  FULL_OFF: 1, // also puts out the pilot flame
  BURNER2_ON: 102,
  BURNER2_OFF: 4,
  ECO_ON: 105,
  ECO_OFF: 7,
};
const STATUS = { PILOT: 2, MAIN: 4, BURNER2: 8, ECO_WAVE: 512 };

const TIMEOUT_MS = 5000;
const RECONNECT_MS = 30000;
const ARM_MS = 15000;
const SETTLE_MS = 3000; // quiet time after a command before reading again

class DruDevice extends Homey.Device {

  async onInit() {
    if (this.hasCapability('ignition_busy')) await this.removeCapability('ignition_busy'); // bit 15 turned out to be set while burning too
    if (this.getCapabilityValue('ignite_armed')) await this.setCapabilityValue('ignite_armed', false);

    this.registerCapabilityListener('onoff', async (on) => {
      if (!on) return this.turnOff();
      if (!this.getCapabilityValue('ignite_armed')) {
        throw new Error(this.homey.__('error.locked'));
      }
      return this.ignite();
    });
    this.registerCapabilityListener('ignite_armed', async (armed) => {
      this.homey.clearTimeout(this.armTimer);
      if (armed) {
        this.armTimer = this.homey.setTimeout(() => {
          this.setCapabilityValue('ignite_armed', false).catch(this.error);
        }, ARM_MS);
      }
    });
    this.registerCapabilityListener('dim', (dim) => this.setFlame(Math.round(dim * 100)));
    this.registerCapabilityListener('burner2', (on) => this.setBurner2(on));
    this.registerCapabilityListener('eco_wave', (on) => this.setEcoWave(on));
    this.registerCapabilityListener('button.full_off', () => this.fullOff());

    this.connect(this.getSettings());
  }

  async onSettings({ newSettings, changedKeys }) {
    if (changedKeys.some((k) => ['address', 'port', 'polling'].includes(k))) this.connect(newSettings);
  }

  async onUninit() {
    this.homey.clearTimeout(this.armTimer);
    this.disconnect();
  }

  async onDeleted() {
    this.onUninit();
  }

  // Commands. ignite() skips the unlock step: the widget slide and Flow cards are their own confirmation.

  async ignite() {
    this.homey.clearTimeout(this.armTimer);
    await this.setCapabilityValue('ignite_armed', false);
    await this.write(REG_ACTION, ACTION.IGNITE);
    this.restoreFlame = true; // the fireplace starts at minimum flame, see poll()
    // Poll every 2 s until the main burner is on, so the flame height is restored right away (max 60 s).
    this.homey.clearInterval(this.fastTimer);
    const until = Date.now() + 60000;
    this.fastTimer = this.homey.setInterval(() => {
      if (!this.restoreFlame || Date.now() > until) return this.homey.clearInterval(this.fastTimer);
      this.poll();
    }, 2000);
  }

  async turnOff() {
    this.restoreFlame = false;
    await this.write(REG_ACTION, ACTION.OFF);
  }

  async fullOff() {
    this.restoreFlame = false;
    await this.write(REG_ACTION, ACTION.FULL_OFF);
  }

  async setFlame(height) {
    if (!this.getCapabilityValue('onoff')) throw new Error(this.homey.__('error.notOn'));
    await this.write(REG_FLAME, height);
  }

  async setBurner2(on) {
    if (on && !this.getCapabilityValue('onoff')) throw new Error(this.homey.__('error.notOn'));
    await this.write(REG_ACTION, on ? ACTION.BURNER2_ON : ACTION.BURNER2_OFF);
  }

  async setEcoWave(on) {
    if (on && !this.getCapabilityValue('onoff')) throw new Error(this.homey.__('error.notOn'));
    await this.write(REG_ACTION, on ? ACTION.ECO_ON : ACTION.ECO_OFF);
  }

  // Connection

  connect({ address, port, polling }) {
    this.disconnect();
    this.log(`Connecting to ${address}:${port}`);

    const socket = new net.Socket();
    this.socket = socket;
    this.client = new Modbus.client.TCP(socket, UNIT_ID, TIMEOUT_MS);

    socket.on('connect', () => {
      this.log('Connected');
      this.setAvailable().catch(this.error);
      this.poll();
      this.pollTimer = this.homey.setInterval(() => this.poll(), polling * 1000);
    });
    socket.on('error', (err) => this.error('Socket error:', err.message));
    socket.on('close', () => {
      if (this.socket !== socket) return; // replaced by a newer connection
      this.setUnavailable(this.homey.__('error.unreachable', { address, port })).catch(this.error);
      this.disconnect();
      this.reconnectTimer = this.homey.setTimeout(() => this.connect(this.getSettings()), RECONNECT_MS);
    });

    socket.connect({ host: address, port });
  }

  disconnect() {
    this.homey.clearInterval(this.pollTimer);
    this.homey.clearInterval(this.fastTimer);
    this.homey.clearTimeout(this.reconnectTimer);
    this.homey.clearTimeout(this.settleTimer);
    const { socket } = this;
    this.socket = null;
    this.client = null;
    if (socket) socket.destroy();
  }

  async read(register) {
    const { response } = await this.client.readHoldingRegisters(register, 1);
    return response.body.valuesAsArray[0];
  }

  async write(register, value) {
    if (!this.client) throw new Error(this.homey.__('error.notConnected'));
    this.log('Write', register, value);
    await this.client.writeSingleRegister(register, value);
    // Give the fireplace a moment before reading again, one read after the command.
    this.quietUntil = Date.now() + SETTLE_MS;
    this.homey.clearTimeout(this.settleTimer);
    this.settleTimer = this.homey.setTimeout(() => { this.quietUntil = 0; this.poll(); }, SETTLE_MS);
  }

  async poll() {
    if (!this.client || this.polling || Date.now() < (this.quietUntil || 0)) return;
    this.polling = true;
    try {
      // One register per request: the gateway resets on reads that touch unknown registers.
      const status = await this.read(REG_STATUS);
      const fault = await this.read(REG_FAULT);
      const temp = await this.read(REG_TEMP);
      const flame = await this.read(REG_FLAME);
      const rssi = await this.read(REG_RSSI);

      if (status !== this.getCapabilityValue('status_raw') || flame !== this.lastFlame) this.log('Status', status, 'flame', flame, 'fault', fault);
      this.lastFlame = flame;
      const main = Boolean(status & STATUS.MAIN);
      await this.setCapabilityValue('onoff', main);
      await this.setCapabilityValue('burner2', Boolean(status & STATUS.BURNER2));
      await this.setCapabilityValue('pilot_flame', Boolean(status & STATUS.PILOT));
      await this.setCapabilityValue('eco_wave', Boolean(status & STATUS.ECO_WAVE));
      await this.setCapabilityValue('status_raw', status);
      await this.setCapabilityValue('fault_code', fault);
      await this.setCapabilityValue('alarm_generic', fault !== 0);
      await this.setCapabilityValue('measure_temperature', temp / 10);
      if (flame <= 100) await this.setCapabilityValue('dim', flame / 100); // 254 = no height set (e.g. just ignited), keep last value
      if (this.restoreFlame && main) {
        // After ignition the fireplace burns at minimum (reads 254): send the last flame height like the Dru app does.
        this.restoreFlame = false;
        if (flame > 100) await this.write(REG_FLAME, Math.round(this.getCapabilityValue('dim') * 100) || 100);
      }
      await this.setCapabilityValue('signal_strength', Math.round(-rssi / 2));
    } catch (err) {
      this.error('Poll failed:', err.message || err.err || err);
      // Modbus exceptions mean the link is fine; anything else (timeout, closed) forces a reconnect.
      if (err.err !== 'ModbusException' && this.socket) this.socket.destroy();
    } finally {
      this.polling = false;
    }
  }

}

module.exports = DruDevice;
