# E3DC Solar Widget for KDE Plasma

A KDE Plasma widget that displays live power data from your E3DC S10 home power station.

## Features
- **Live Data**: Shows Solar Production, Battery Status (Power & SoC), Home Consumption, Grid Power, and Wallbox usage.
- **Visuals**: Color-coded progress bars (Green/Red for Charge/Discharge, Export/Import).
- **Auto-Refresh**: Configurable refresh interval.
- **Scalable**: Configurable system size to scale the visual bars correctly.

## Installation

### From Source
1.  Clone this repository.
2.  Open a terminal in the folder.
3.  Run the installation command:
    ```bash
    kpackagetool6 -t Plasma/Applet -i .
    ```
    *(Note: If upgrading, use `-u` instead of `-i`)*

4.  Restart Plasma to load the new widget:
    ```bash
    systemctl --user restart plasma-plasmashell.service
    ```

5.  Add the widget "E3DC Solar Widget" to your desktop or panel.

## Configuration
Right-click the widget and select **Configure**.
1.  **Username/Password**: Your E3DC Portal credentials.
2.  **Refresh Interval**: How often to fetch data (default: 60s).
3.  **System Size**: Your PV system size in Watts (e.g., 10000 for 10kWp). This scales the progress bars.

## Compatibility
This widget works with any E3DC S10 system that is accessible via the official E3DC Portal (s10.e3dc.com). It dynamically fetches your system's Serial Number, so no manual ID configuration is needed.

## Disclaimer
This is an unofficial widget and is not affiliated with E3DC. Use at your own risk.
