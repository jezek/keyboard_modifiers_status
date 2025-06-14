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
        const entries = {};
        const addMapEntry = (key, title) => {
            const entry = new Gtk.Entry({ text: this.settings.get_string(key) });
            entry.connect('changed', () => {
                this.settings.set_string(key, entry.text);
            });
            this.settings.connect(`changed::${key}`, () => {
                const val = this.settings.get_string(key);
                if (entry.text !== val)
                    entry.text = val;
            });
            entries[key] = entry;
            const row = new Adw.ActionRow({ title });
            row.add_suffix(entry);
            row.activatable_widget = entry;
            group.add(row);
        };

        const schema = this.settings.settings_schema;
        const defaultsKeys = schema.list_keys().filter(k =>
            k.endsWith('-symbol') && !['latch-symbol', 'lock-symbol'].includes(k));

        defaultsKeys.forEach(k => {
            const summary = schema.get_key(k).get_summary();
            addMapEntry(k, summary);
        });

        const pcDefaults = ['⇧', '⇪', '⌃', '⎇', '⇭', '⇳', '❖', '⎈'];
        const macDefaults = ['⇧', '⇬', '⋀', '⌥', '①', '◆', '⌘', '⎇'];

        const resetRow = new Adw.ActionRow({ title: 'Reset defaults' });
        const pcButton = new Gtk.Button({ label: 'PC' });
        const macButton = new Gtk.Button({ label: 'Mac' });
        pcButton.connect('clicked', () => {
            defaultsKeys.forEach((k, i) => {
                this.settings.set_string(k, pcDefaults[i]);
                if (entries[k])
                    entries[k].text = pcDefaults[i];
            });
        });
        macButton.connect('clicked', () => {
            defaultsKeys.forEach((k, i) => {
                this.settings.set_string(k, macDefaults[i]);
                if (entries[k])
                    entries[k].text = macDefaults[i];
            });
        });
        resetRow.add_suffix(pcButton);
        resetRow.add_suffix(macButton);
        group.add(resetRow);

        page.add(group);

        const symbols = new Adw.PreferencesGroup({ title: 'Symbols' });
        const addEntry = (key, title) => {
            const entry = new Gtk.Entry({ text: this.settings.get_string(key) });
            entry.connect('changed', () => {
                this.settings.set_string(key, entry.text);
            });
            this.settings.connect(`changed::${key}`, () => {
                const val = this.settings.get_string(key);
                if (entry.text !== val)
                    entry.text = val;
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
