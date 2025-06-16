import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const tag = 'KMS-Ext-Prefs:';

export default class Prefs extends ExtensionPreferences {
    constructor(metadata) {
        super(metadata);

        this.settings = this.getSettings();
        this.settingsSchema = this.settings.settings_schema;

        this.groupEntries = {};
    }

    fillPreferencesWindow(window) {
        console.debug(`${tag} fillPreferencesWindow() ... in`);
        const page = new Adw.PreferencesPage();

        const modifiersGroup = new Adw.PreferencesGroup({ title: 'Modifier Mapping' });
        const symbolsGroup = new Adw.PreferencesGroup({ title: 'Symbols' });

        const modifiersKeys = ['shift-symbol', 'caps-symbol', 'control-symbol', 'mod1-symbol', 'mod2-symbol', 'mod3-symbol', 'mod4-symbol', 'mod5-symbol'];
        modifiersKeys.forEach(k => {
            const schemaKey = this.settingsSchema.get_key(k);
            if (!schemaKey) {
                console.warn(`${tag} modifier key "${k}" doesn't exist in schema`);
                return;
            }

            this.addGroupEntry(modifiersGroup, k, schemaKey.get_summary());
        });

        const symbolsKeys = ['latch-symbol', 'lock-symbol', 'icon', 'opening', 'closing'];
        symbolsKeys.forEach(k => {
            const schemaKey = this.settingsSchema.get_key(k);
            if (!schemaKey) {
                console.warn(`${tag} symbol key "${k}" doesn't exist in schema`);
                return;
            }

            this.addGroupEntry(symbolsGroup, k, schemaKey.get_summary());
        });

        const macDefaults = {
            'shift-symbol': '⇧',
            'caps-symbol': '⇬',
            'control-symbol': '⋀',
            'mod1-symbol': '⌥',
            'mod2-symbol': '①',
            'mod3-symbol': '◆',
            'mod4-symbol': '⌘',
            'mod5-symbol': '⎇',
        };
        const pcDefaults = {
            'shift-symbol': '⇧',
            'caps-symbol': '⇪',
            'control-symbol': '⌃',
            'mod1-symbol': '⎇',
            'mod2-symbol': '⇭',
            'mod3-symbol': '⇳',
            'mod4-symbol': '❖',
            'mod5-symbol': '⎈',
        };

        const presetsDropDown = Gtk.DropDown.new_from_strings(['Mac', 'PC', 'Custom']);

        const headerBox = new Gtk.Box({ spacing: 6 });
        headerBox.append(new Gtk.Label({ label: 'Presets' }));
        headerBox.append(presetsDropDown);
        modifiersGroup.set_header_suffix(headerBox);

        const resetModifiers = defaults => {
            modifiersKeys.forEach(k => {
                const val = defaults[k];
                if (val !== undefined && this.groupEntries[k]) {
                    this.groupEntries[k].text = val;
                    this.settings.set_string(k, val);
                }
            });
        };

        presetsDropDown.connect('notify::selected', w => {
            const idx = w.selected;
            if (idx === 0) {
                resetModifiers(macDefaults);
            } else if (idx === 1) {
                resetModifiers(pcDefaults);
            }
        });

        const updateDropdown = () => {
            const isMac = modifiersKeys.every(k =>
                this.settings.get_string(k) === macDefaults[k]);
            const isPc = modifiersKeys.every(k =>
                this.settings.get_string(k) === pcDefaults[k]);
            if (isMac)
                presetsDropDown.selected = 0;
            else if (isPc)
                presetsDropDown.selected = 1;
            else
                presetsDropDown.selected = 2;
        };
        updateDropdown();
        this.settings.connect('changed', updateDropdown);

        page.add(modifiersGroup);
        page.add(symbolsGroup);

        window.add(page);
        window.show();

        console.debug(`${tag} fillPreferencesWindow() ... out`);
    }

    addGroupEntry(group, key, title) {
        if (this.groupEntries[key]) {
            console.warn(`${tag} addGroupEntry: duplicate key: ${key}`);
            return;
        }
        const entry = new Gtk.Entry({ text: this.settings.get_string(key) });
        entry.connect('changed', () => {
            this.settings.set_string(key, entry.text);
        });
        this.settings.connect(`changed::${key}`, () => {
            const val = this.settings.get_string(key);
            if (entry.text !== val) entry.text = val;
        });
        this.groupEntries[key] = entry;

        const row = new Adw.ActionRow({ title });
        row.add_suffix(entry);
        row.activatable_widget = entry;

        group.add(row);
    };
}

export function init() {
    return new Prefs();
}
