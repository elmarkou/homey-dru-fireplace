Bedien je Dru gashaard vanuit Homey: ontsteken, uitzetten, vlamhoogte, tweede brander en Eco wave, met kamertemperatuur en statusinformatie.

Getest met een Dru Maestro gashaard met twee branders. Andere Dru gashaarden met dezelfde Dru Modbus gateway (het kastje waar de Dru app mee verbindt, Honeywell BRDG-03EM01) werken waarschijnlijk ook, maar zijn niet getest. Elektrische haarden worden niet ondersteund.

Aan de slag
1. Zoek het IP adres van de Dru gateway in je router.
2. Voeg in Homey een apparaat toe: Dru > Dru gashaard, en vul het IP adres in.
3. Zet de Haard widget op een dashboard: bewerk een dashboard, voeg een widget toe en kies Dru > Haard.
4. Aanzetten: schuif in de widget de vlam omhoog en houd 2 seconden vast. Uitzetten: tik op Uit.

Veilig ontsteken
Een gashaard mag nooit per ongeluk aangaan. Daarom vraagt ontsteken altijd een bewuste handeling:
- Haard widget op het dashboard: schuif omhoog en houd 2 seconden vast, net als in de Dru app.
- Apparaatpagina: tik eerst op "Ontsteken vrijgeven" en zet de haard binnen 15 seconden aan.
- Flow: de kaart "Haard ontsteken", voor automatiseringen die je zelf instelt.
Zo kunnen ook "alles aan" in een zone, moods en spraakassistenten de haard niet aansteken. Uitzetten kan altijd met één tik.

Functies
- Ontsteken, uitzetten (waakvlam blijft aan) en helemaal uitzetten (waakvlam uit)
- Vlamhoogte
- Tweede brander aan/uit
- Eco wave aan/uit
- Kamertemperatuur, waakvlam, storingscode met alarm en signaalsterkte
- Flowkaarten voor alles hierboven

Vereisten
- De Dru Modbus gateway in je netwerk (poort 502). Het IP adres vind je in je router.
- De gateway accepteert één verbinding tegelijk. Gebruik een polling interval van 10 seconden of meer, dan blijft de Dru app naast Homey werken.

Gebaseerd op de originele Homey app van Arno van Beek. Deze app is niet gemaakt door of verbonden aan Dru.
