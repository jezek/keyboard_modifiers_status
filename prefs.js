import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

const tag = 'KMS-Ext-Prefs:';

export default class Prefs extends ExtensionPreferences {

	fillPreferencesWindow(window) {
		console.debug(`${tag} fillPreferencesWindow() ... in`);

		this._settings = this.getSettings();
		this._schema = this._settings.settings_schema;

		const modifiersKeys = ['shift-symbol', 'caps-symbol', 'control-symbol', 'mod1-symbol', 'mod2-symbol', 'mod3-symbol', 'mod4-symbol', 'mod5-symbol'];
		const accessibilityKeys = ['latch-symbol', 'lock-symbol'];
		const wrapperKeys = ['icon', 'opening', 'closing'];
		this._currentSymbols = this._getSchemaModifierSymbols([].concat(modifiersKeys, accessibilityKeys, wrapperKeys));
		console.debug(`${tag} this._currentSymbols: ${this._currentSymbols}`);

		this._groupEntries = {};
		this._page = new Adw.PreferencesPage();

		
		this._addGroup(
			_('Modifier symbols' ),
			_('Modifier symbols show which modifier keys are currently pressed.'),
			modifiersKeys,
			new Map([
				[_('  Mac  '), this._getSchemaDefaults(modifiersKeys)], // ['⇧', '⇬', '⋀', '⌥', '①', '◆', '⌘', '⎇']
				[_('  PC   '),  ['⇧', '⇪', '⌃', '⎇', '⇭', '⇳', '❖', '⎈']],
			])
		);

		this._addGroup(
			_('Accesibility symbols' ),
			_('Accessibility symbols indicate latched or locked key states for assistive input.'),
			accessibilityKeys,
			new Map([
				[_('Degrees'), this._getSchemaDefaults(accessibilityKeys)], // ['\'', '°']
				[_('DotPair'),  ['.', ':']],
			])
		);

		this._addGroup(
			_('Wrapper symbols' ),
			_('Wrapper symbols visually enclose active modifiers to enhance clarity.'),
			wrapperKeys,
			new Map([
				[_('Keyboard'), ['⌨', '', '']],
				[_('Brackets'),  ['', '[', ']']],
			])
		);

		window.add(this._page);
		window.show();

		console.debug(`${tag} fillPreferencesWindow() ... out`);
	}

	_addGroup(title, description, keys, presets) {
		console.debug(`${tag} _addGroup() ... in`);
		const group= new Adw.PreferencesGroup({title: title, description: description});

		const dropdownStrings = [_('Custom')].concat(Array.from(presets.keys()));
		const presetsDropDown = Gtk.DropDown.new_from_strings(dropdownStrings);
		const headerBox = new Gtk.Box({spacing: 6});
		headerBox.append(new Gtk.Label({label: _('Presets')}));
		headerBox.append(presetsDropDown);
		group.set_header_suffix(headerBox);
		console.debug(`${tag} _addGroup: added presets dropdown: ${dropdownStrings}`);

		const updateDropdown = (dropdownNotifyId) => {
			console.debug(`${tag} _addGroup: updateDropdown()`);
			let pid = 0;
			let found = false;
			for (let [_title, preset] of presets) {
				pid = pid + 1;
				if (keys.every((k, i) => this._currentSymbols[k] === preset[i])) {
					presetsDropDown.block_signal_handler(dropdownNotifyId);
					console.debug(`${tag} updateDropdown: set dropdown selected: ${pid}`);
					presetsDropDown.selected = pid;
					presetsDropDown.unblock_signal_handler(dropdownNotifyId);
					found = true;
					break;
				}
			}

			if (!found) {
				presetsDropDown.block_signal_handler(dropdownNotifyId);
					console.debug(`${tag} updateDropdown: set dropdown selected: 0`);
				presetsDropDown.selected = 0;
				presetsDropDown.unblock_signal_handler(dropdownNotifyId);
			}
		};

		const dropdownNotifyId = presetsDropDown.connect('notify::selected', w => {
			const idx = w.selected;
			console.debug(`${tag} presetsDropDown.notify::selected ${idx}`);
			if (idx > 0) {
				const preset = Array.from(presets.values())[idx-1];
				keys.forEach((k, i) => {
					const val = preset[i];
					if (val !== undefined && this._groupEntries[k] && this._currentSymbols[k] !== val) {
						this._currentSymbols[k] = val;

						const entry = this._groupEntries[k]['entry'];
						if (entry) {
							entry.block_signal_handler(this._groupEntries[k]['changedId']);
							console.debug(`${tag} presetsDropDown.notify: change entry text: (${this._currentSymbols[k]}) = ${entry.text} -> ${val}`);
							entry.text = val;
							entry.unblock_signal_handler(this._groupEntries[k]['changedId']);
						}

						console.debug(`${tag} presetsDropDown.notify: setPreset: ${k}(${i}) to "${val}"`);
						this._settings.set_string(k, val);
					}
				});
			}
		});

		updateDropdown(dropdownNotifyId);

		keys.forEach(key => {
			const schemaKey = this._schema.get_key(key);
			if (!schemaKey) {
				console.warn(`${tag} schema doesn't contain modifier key: ${key}`);
				return;
			}
			if (this._groupEntries[key]) {
				console.warn(`${tag} addGroup: duplicate key: ${key}`);
				return;
			}

			const entry = new Gtk.Entry({text: _(this._currentSymbols[key])});
			const row = new Adw.ActionRow({title: _(schemaKey.get_summary())});
			row.add_suffix(entry);
			row.activatable_widget = entry;
			group.add(row);
			console.debug(`${tag} _addGroup: add entry ${key}: ${entry.text}`);

			const entry_changed_id = entry.connect('changed', () => {
				console.debug(`${tag} _addGroup: entry::changed ${key}: ${this._currentSymbols[key]} -> ${entry.text})`);
				if (this._currentSymbols[key] !== entry.text) {
					this._currentSymbols[key] = entry.text;
					
					console.debug(`${tag} _addGroup: entry::changed ${key}: set setings key: ${entry.text}`);
					this._settings.set_string(key, entry.text);

					updateDropdown(dropdownNotifyId);
				}
			});
			this._groupEntries[key] = {
				entry: entry,
				changedId: entry_changed_id
			};

			this._settings.connect(`changed::${key}`, () => {
				console.debug(`${tag} _addGroup: setting::changed::${key}() ... in`);
				const val = this._settings.get_string(key);
				if (this._currentSymbols[key] !== val) {
					console.debug(`${tag} _addGroup: setting::changed::${key} : ${this._currentSymbols[key]} -> ${val})`);
					this._currentSymbols[key] = val;

					entry.block_signal_handler(entry_changed_id);
					console.debug(`${tag} _addGroup: entry::changed ${key}: entry textset ${val}`);
					entry.text = val;
					entry.unblock_signal_handler(entry_changed_id);

					updateDropdown(dropdownNotifyId);
				}
				console.debug(`${tag} _addGroup: setting::changed::${key}() ... out`);
			});
		});

		this._page.add(group);
		console.debug(`${tag} _addGroup() ... out`);
	}

	_getSchemaDefaults(keys) {
		return keys.map(k => this._settings.get_default_value(k).deep_unpack());
	};
	_getSchemaModifierSymbols(keys) {
		return Object.fromEntries(keys.map(k => [k, this._settings.get_string(k)]));
	};
}

export function init() {
	return new Prefs();
}
