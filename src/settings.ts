import { App, PluginSettingTab, Setting } from 'obsidian';
import DynamicDatesPlugin from './main';

export interface DynamicDatesSettings {
    dateFormat: string;
    pastDateBgColor: string;
    pastDateTextColor: string;
    currentDateBgColor: string;
    currentDateTextColor: string;
    futureDateBgColor: string;
    futureDateTextColor: string;
}

export const DEFAULT_SETTINGS: DynamicDatesSettings = {
    dateFormat: 'YYYY-MM-DD',
    pastDateBgColor: '#808080',
    pastDateTextColor: '#ffffff',
    currentDateBgColor: '#0066cc',
    currentDateTextColor: '#ffffff',
    futureDateBgColor: '#009933',
    futureDateTextColor: '#ffffff'
};

export class DynamicDatesSettingTab extends PluginSettingTab {
    plugin: DynamicDatesPlugin;

    constructor(app: App, plugin: DynamicDatesPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h3', { text: 'Dynamic Dates Settings' });

        new Setting(containerEl)
            .setName('Date Format')
            .setDesc('How the date part looks (e.g. YYYY-MM-DD, DD/MM/YYYY)')
            .addText(text => text
                .setPlaceholder('YYYY-MM-DD')
                .setValue(this.plugin.settings.dateFormat)
                .onChange(async (value) => {
                    this.plugin.settings.dateFormat = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h4', { text: 'Past Dates Colors' });
        new Setting(containerEl)
            .setName('Background Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.pastDateBgColor)
                .onChange(async (value) => {
                    this.plugin.settings.pastDateBgColor = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Text Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.pastDateTextColor)
                .onChange(async (value) => {
                    this.plugin.settings.pastDateTextColor = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h4', { text: 'Current Date Colors' });
        new Setting(containerEl)
            .setName('Background Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.currentDateBgColor)
                .onChange(async (value) => {
                    this.plugin.settings.currentDateBgColor = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Text Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.currentDateTextColor)
                .onChange(async (value) => {
                    this.plugin.settings.currentDateTextColor = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h4', { text: 'Future Dates Colors' });
        new Setting(containerEl)
            .setName('Background Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.futureDateBgColor)
                .onChange(async (value) => {
                    this.plugin.settings.futureDateBgColor = value;
                    await this.plugin.saveSettings();
                }));
        new Setting(containerEl)
            .setName('Text Color')
            .addColorPicker(color => color
                .setValue(this.plugin.settings.futureDateTextColor)
                .onChange(async (value) => {
                    this.plugin.settings.futureDateTextColor = value;
                    await this.plugin.saveSettings();
                }));
    }
}
