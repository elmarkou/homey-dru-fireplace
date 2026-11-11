'use strict';

const Homey = require('homey');

// ponytail: pairing happens entirely in pair/start.html via Homey.createDevice
class DruDriver extends Homey.Driver {}

module.exports = DruDriver;
