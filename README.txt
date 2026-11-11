Control your Dru gas fireplace from Homey: ignite, turn off, flame height, second burner and Eco wave, with room temperature and status information.

Tested with a Dru Maestro gas fireplace with two burners. Other Dru gas fireplaces that use the same Dru Modbus gateway (the box the Dru app connects to, Honeywell BRDG-03EM01) will probably work too, but have not been tested. Electric fireplaces are not supported.

Getting started
1. Find the IP address of the Dru gateway in your router.
2. Add a device in Homey: Dru > Dru fireplace, and enter the IP address.
3. Put the Fireplace widget on a dashboard: edit a dashboard, add a widget and choose Dru > Fireplace.
4. Turn on: in the widget, slide the flame up and hold for 2 seconds. Turn off: tap Off.

Safe ignition
A gas fireplace should never switch on by accident. That's why ignition always takes a deliberate step:
- Fireplace widget on the dashboard: slide up and hold for 2 seconds, just like the Dru app.
- Device page: first tap "Unlock ignition", then turn the fireplace on within 15 seconds.
- Flow: the "Ignite the fireplace" card, for automations you set up yourself.
This also stops zone-wide "all on" commands, moods and voice assistants from lighting the fire. Turning off always works with one tap.

Features
- Ignite, turn off (pilot flame stays on) and turn completely off (pilot flame out)
- Flame height
- Second burner on/off
- Eco wave on/off
- Room temperature, pilot flame, fault code with alarm, and signal strength
- Flow cards for all of the above

Requirements
- The Dru Modbus gateway on your network (port 502). Find its IP address in your router.
- The gateway accepts one connection at a time. Use a polling interval of 10 seconds or more so the Dru app keeps working alongside Homey.

Based on the original Homey app by Arno van Beek. This app is not made by or affiliated with Dru.
