import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// Preferences dialog for the Keyboard Modifiers Status extension.  It exposes
// customizable symbols grouped into Modifier, Accessibility and Wrapper
// categories.

const tag = 'KMS-Ext-Prefs:';

export default class Prefs extends ExtensionPreferences {

        fillPreferencesWindow(window) {
                console.debug(`${tag} fillPreferencesWindow() ... in`);

		this._settings = this.getSettings();
		this._schema = this._settings.settings_schema;
		this._window = window;

                // Keys grouped by their meaning in the settings schema.
                const modifiersKeys = ['shift-symbol', 'caps-symbol', 'control-symbol', 'alt-symbol', 'num-symbol', 'scroll-symbol', 'super-symbol', 'altgr-symbol'];
                const accessibilityKeys = ['latch-symbol', 'lock-symbol'];
                const wrapperKeys = ['icon-symbol', 'opening-symbol', 'closing-symbol'];

                // Cache current values from GSettings and previously saved preset.
                this._currentSymbols = this._getSchemaModifierSymbols([].concat(modifiersKeys, accessibilityKeys, wrapperKeys));
                this._savedSymbols = this._settings.get_value('saved-symbols').deep_unpack();
		console.debug(`${tag} this._currentSymbols: ${JSON.stringify(this._currentSymbols)}`);
		console.debug(`${tag} this._savedSymbols: ${JSON.stringify(this._savedSymbols)}`);

                // Keep references to entry widgets for each key to sync changes.
                this._groupEntries = {};
                this._page = new Adw.PreferencesPage();


		this._addGroup(
			_('Modifier symbols' ),
			_('Modifier symbols show which modifier keys are currently pressed.'),
			modifiersKeys,
			new Map([
				[_('Mac    '), this._getSchemaDefaults(modifiersKeys)], // ['⇧', '⇬', '⋀', '⌥', '①', '◆', '⌘', '⎇']
				[_('PC     '),  ['⇧', '⇪', '⌃', '⎇', '⇭', '⇳', '❖', '⎈']],
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

        // Returns true when the current values diverge from the last saved preset.
        _currentDifferSaved(keys) {
                return keys.some(k => this._currentSymbols[k] !== (this._savedSymbols[k] ?? ''));
        }

        // Helper to build a preference group with a presets drop-down and entry fields.
        _addGroup(title, description, keys, presets) {
                console.debug(`${tag} _addGroup() ... in`);
		const group = new Adw.PreferencesGroup({title: title, description: description});

		const headerBox = new Gtk.Box({spacing: 6});
		const presetsDropDown = Gtk.DropDown.new_from_strings([_('Custom')].concat(Array.from(presets.keys()), [_('Saved')]));
		presetsDropDown.valign = Gtk.Align.CENTER;
                // Allows persisting the current custom symbols.
                const saveButton = Gtk.Button.new_with_label(_('Save'));
                saveButton.add_css_class('suggested-action');
                saveButton.valign      = Gtk.Align.CENTER;
                saveButton.visible = false;
		headerBox.append(new Gtk.Label({label: _('Presets')}));
		headerBox.append(presetsDropDown);
		headerBox.append(saveButton);
		group.set_header_suffix(headerBox);

		const savedIndex = presets.size + 1;
		let currentPresetIdx = 0;
		const refreshSaveButton = () => {
			console.debug(`${tag} refreshSaveButton: selected: ${presetsDropDown.selected}, differ: ${this._currentDifferSaved(keys)}`);
			saveButton.visible = presetsDropDown.selected === 0 && this._currentDifferSaved(keys);
		};

		const updatePresetsBox = (dropdownNotifyId) => {
			console.debug(`${tag} _addGroup: updatePresetsBox(${dropdownNotifyId})`);

			let foundIdx = 0;
			if (!this._currentDifferSaved(keys)) {
				foundIdx = savedIndex;
			} else {
				foundIdx = Array.from(presets).findIndex(([_title, preset]) => keys.every((k, i) => this._currentSymbols[k] == preset[i])) + 1;
			}

			if (presetsDropDown.selected != foundIdx) {
				presetsDropDown.block_signal_handler(dropdownNotifyId);
				console.debug(`${tag} updatePresetsBox: set dropdown selected: ${foundIdx}`);
				presetsDropDown.selected = foundIdx;
				GLib.idle_add(null, () => {
					presetsDropDown.unblock_signal_handler(dropdownNotifyId);
					return GLib.SOURCE_REMOVE;
				});
			}

			currentPresetIdx = foundIdx;
			refreshSaveButton();
		};

		const dropdownNotifyId = presetsDropDown.connect('notify::selected', () => {
			const idx = presetsDropDown.selected;
			console.debug(`${tag} presetsDropDown.notify::selected current: ${currentPresetIdx}, selected: ${idx}`);

			if (idx === 0) {
				currentPresetIdx = 0;
				updatePresetsBox(dropdownNotifyId);
				return;
			}

			const applyPreset = () => {
				const values = idx === savedIndex
					? keys.map(k => this._savedSymbols[k] ?? '')
					: Array.from(presets.values())[idx - 1];
				console.debug(`${tag} presetsDropDown.notify::selected: applyPreset ${idx}: ${values}`);

				keys.forEach((k, i) => {
					const val = values[i];
					if (this._groupEntries[k] && this._currentSymbols[k] !== val) {
						this._currentSymbols[k] = val;

						const { entry, changedId } = this._groupEntries[k];
						if (entry) {
							entry.block_signal_handler(changedId);
							console.debug(`${tag} presetsDropDown.notify::selected: applyPreset: change entry text: ${entry.text} -> ${val}`);
							entry.text = val;
							GLib.idle_add(null, () => {
								entry.unblock_signal_handler(changedId);
								return GLib.SOURCE_REMOVE;
							});
						}

						console.debug(`${tag} presetsDropDown.notify::selected: applyPreset: set ${k} to ${val}`);
						this._settings.set_string(k, val);
					}
				});

				currentPresetIdx = idx;
				refreshSaveButton();
			};

			if (currentPresetIdx === 0 && this._currentDifferSaved(keys)) {
				console.debug(`${tag} presetsDropDown.notify::selected: message dialog`);
				const dialog = new Adw.MessageDialog({
					transient_for: this._window,
					modal: true,
					heading: _('Unsaved custom symbols'),
					body: _('Switching presets will discard your custom symbols.'),
				});
				dialog.add_response('cancel', _('Cancel'));
				dialog.add_response('save', _('Save'));
				dialog.add_response('switch', _('Switch'));
				dialog.set_response_appearance('save', Adw.ResponseAppearance.SUGGESTED);
				dialog.set_response_appearance('switch', Adw.ResponseAppearance.DESTRUCTIVE);
				dialog.set_default_response('cancel');
				dialog.set_close_response('cancel');
				dialog.connect('response', (d, resp) => {
					console.debug(`${tag} presetsDropDown.notify::selected: dialog:response: ${resp}`);
					if (resp === 'cancel') {
						presetsDropDown.block_signal_handler(dropdownNotifyId);
						presetsDropDown.selected = currentPresetIdx;
						GLib.idle_add(null, () => {
							presetsDropDown.unblock_signal_handler(dropdownNotifyId);
							return GLib.SOURCE_REMOVE;
						});
					} else {
						if (resp === 'save') {
							keys.forEach(k => {
								this._savedSymbols[k] = this._currentSymbols[k];
							});
							this._settings.set_value('saved-symbols', new GLib.Variant('a{ss}', this._savedSymbols));
						}
						applyPreset();
					}
					d.destroy();
				});
				dialog.show();
				return;
			}
			applyPreset();
		});

		saveButton.connect('clicked', () => {
			console.debug(`${tag} saveButton:clicked`);
			keys.forEach(k => {
				this._savedSymbols[k] = this._currentSymbols[k];
			});
			console.debug(`${tag} saveButton:clicked: set saved symbols to: ${JSON.stringify(this._savedSymbols)}`);
			this._settings.set_value('saved-symbols', new GLib.Variant('a{ss}', this._savedSymbols));
			updatePresetsBox(dropdownNotifyId);
		});

		this._settings.connect('changed::saved-symbols', () => {
			console.debug(`${tag} settings:changed::saved-symbols`);
			const newSavedSymbols = this._settings.get_value('saved-symbols').deep_unpack();
			const equal = this._symbolsObjectsEqual(this._savedSymbols, newSavedSymbols);
			console.debug(`${tag} settings:changed::saved-symbols: new ${JSON.stringify(newSavedSymbols)}, equal:${equal}`);
			if (!equal) {
				updatePresetsBox(dropdownNotifyId);
			}
		});

		updatePresetsBox(dropdownNotifyId);

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

					updatePresetsBox(dropdownNotifyId);
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
					GLib.idle_add(null, () => {
						entry.unblock_signal_handler(entry_changed_id);
						return GLib.SOURCE_REMOVE;
					});

					updatePresetsBox(dropdownNotifyId);
				}
				console.debug(`${tag} _addGroup: setting::changed::${key}() ... out`);
			});
		});

		this._page.add(group);
		console.debug(`${tag} _addGroup() ... out`);
	}

        // Convenience helpers for manipulating GSettings values.
        _getSchemaDefaults(keys) {
                return keys.map(k => this._settings.get_default_value(k).deep_unpack());
        }
        _getSchemaModifierSymbols(keys) {
                return Object.fromEntries(keys.map(k => [k, this._settings.get_string(k)]));
        }
        _symbolsObjectsEqual(a, b) {
                return Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(k => (b[k] ?? '') === (a[k] ?? ''));
        }
}

export function init() {
	return new Prefs();
}
