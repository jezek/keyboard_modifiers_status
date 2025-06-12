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

        const textView = new Gtk.TextView({ monospace: true });
        const buffer = textView.get_buffer();
        buffer.text = this.settings.get_strv('modifier-mapping').join('\n');
        buffer.connect('changed', () => {
            const text = buffer.text;
            const lines = text.split('\n').map(l => l.trim()).filter(l => l);
            this.settings.set_strv('modifier-mapping', lines);
        });

        const scrolled = new Gtk.ScrolledWindow({ hexpand: true, vexpand: true });
        scrolled.set_child(textView);

        const row = new Adw.ActionRow({ title: 'Mappings' });
        row.set_child(scrolled);
        group.add(row);
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
        window.set_child(page);
        window.show();
    }
}

export function init() {
    return new Prefs();
}
