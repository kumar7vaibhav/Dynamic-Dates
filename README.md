# Dynamic Relative Dates

An Obsidian plugin to insert natural language dates that dynamically render relative to today's date (e.g., `@Tomorrow`, `@Next Monday`).

## Features
- Provides easy insertion of dates using natural language.
- Relative rendering: Dates stay relative to the current day, so `@Tomorrow` will update to `@Today` on the next day!
- Seamlessly fits into your Obsidian workflow.

## Installation

### Community Plugins (Recommended)
1. Open Obsidian **Settings**.
2. Go to **Community plugins** and ensure "Safe mode" is turned off.
3. Click **Browse** and search for "Dynamic Relative Dates".
4. Install and enable the plugin.

### Manual Installation
1. Go to the [Releases](https://github.com/) page of this repository.
2. Download `main.js` and `manifest.json` from the latest release.
3. Create a folder named `dynamic-dates` in your vault's `.obsidian/plugins/` directory.
4. Place the downloaded files into that folder.
5. Reload Obsidian and enable the plugin in **Settings -> Community plugins**.

## Development
To build the plugin locally:
1. Clone the repository into your `.obsidian/plugins/` directory.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start a development build in watch mode.
4. Reload Obsidian to see your changes.

## License
Provided under the MIT License.
