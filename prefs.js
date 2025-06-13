import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class Prefs extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);
        this.settings = this.getSettings();
    }

    fillPreferencesWindow(window) {
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({ title: 'Modifier Mapping' });
        const addMapEntry = (key, title) => {
            const entry = new Gtk.Entry({ text: this.settings.get_string(key) });
            entry.connect('changed', () => {
                this.settings.set_string(key, entry.text);
            });
            const row = new Adw.ActionRow({ title });
            row.add_suffix(entry);
            row.activatable_widget = entry;
            group.add(row);
        };

        addMapEntry('shift-symbol', 'Shift');
        addMapEntry('caps-symbol', 'Caps Lock');
        addMapEntry('control-symbol', 'Control');
        addMapEntry('mod1-symbol', 'Mod1 / Alt');
        addMapEntry('mod2-symbol', 'Mod2');
        addMapEntry('mod3-symbol', 'Mod3');
        addMapEntry('mod4-symbol', 'Mod4 / Super');
        addMapEntry('mod5-symbol', 'Mod5');

        page.add(group);

        const symbols = new Adw.PreferencesGroup({ title: 'Symbols' });
        const addEntry = (key, title) => {
            const entry = new Gtk.Entry({ text: this.settings.get_string(key) });
            entry.connect('changed', () => {
                this.settings.set_string(key, entry.text);
            });
            const r = new Adw.ActionRow({ title });
            r.add_suffix(entry);
            r.activatable_widget = entry;
            symbols.add(r);
        };

        addEntry('latch-symbol', 'Latch symbol');
        addEntry('lock-symbol', 'Lock symbol');
        addEntry('icon', 'Icon');
        addEntry('opening', 'Opening');
        addEntry('closing', 'Closing');

        page.add(symbols);
        window.add(page);
        window.show();
    }
}

export function init() {
    return new Prefs();
}
