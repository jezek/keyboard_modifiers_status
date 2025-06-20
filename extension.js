/*
    Keyboard Modifiers Status for gnome-shell
    Copyright (C) 2015  Abdellah Chelli

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

//
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import * as ExtensionUtils from 'resource:///org/gnome/shell/misc/extensionUtils.js';

//
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const tag = 'KMS-Ext:';

// Print GNOME Shell and Clutter version to debug output.
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import GIRepository from 'gi://GIRepository';
console.debug(`${tag} Shell version: ${Config.PACKAGE_VERSION}`);
console.debug(`${tag} Clutter API: ${GIRepository.Repository.get_default().get_version('Clutter')}`);  

const MODIFIER_ENUM = {
    SHIFT: Clutter.ModifierType.SHIFT_MASK,
    LOCK: Clutter.ModifierType.LOCK_MASK,
    CONTROL: Clutter.ModifierType.CONTROL_MASK,
    MOD1: Clutter.ModifierType.MOD1_MASK,
    MOD2: Clutter.ModifierType.MOD2_MASK,
    MOD3: Clutter.ModifierType.MOD3_MASK,
    MOD4: Clutter.ModifierType.MOD4_MASK,
    MOD5: Clutter.ModifierType.MOD5_MASK,
};

// Gnome-shell extension interface
// constructor, enable, disable
export default class KMS extends Extension {

    constructor(metadata) {
        super(metadata);
        // Don't create or initialize anything here. Use enable() method for initialization.
        // Follow the guidelines: https://gjs.guide/extensions/review-guidelines/review-guidelines.html
        console.debug(`${tag} constructor() ... done ${this.metadata.name}`);
    }

    enable() {
        console.debug(`${tag} enable() ... in`);

        this._state = 0;
        this._prev_state = null;
        this._latch = 0;
        this._prev_latch = null;
        this._lock = 0;
        this._prev_lock = null;

        this._symModifiers = [];
        this._symLatch = '';
        this._symLock = '';
        this._symIcon = ''; //'⌨ ';
        this._symOpening = ''; //'_';
        this._symClosing = ''; //'_';


        this._settings = this.getSettings();
        this._loadSettings();
        this._settingsChangedId = this._settings.connect('changed', () => {
            this._loadSettings();
            // Force indicator refresh on next _update (every 200ms).
            this._prev_state = null;
        });

        this.settings = this.getSettings();
        this._loadSettings();
        this.settingsChangedId = this.settings.connect('changed', () => {
            this._loadSettings();
            // Force indicator refresh on next _update (every 200ms).
            this.prev_state = null;
        });

        // Create UI elements
        this._indicator = new St.Bin({ style_class: 'panel-button',
            reactive: false,
            can_focus: false,
            x_expand: true,
            y_expand: false,
            track_hover: false });
        this._indicatorText = '';
        this._label = new St.Label({ style_class: 'state-label', text: this._indicatorText });
        this._indicator.set_child(this._label);
        Main.panel._rightBox.insert_child_at_index(this._indicator, 0);

        //console.debug(`${tag} Running Wayland: ` + Meta.is_wayland_compositor());

        try {
            this._seat = Clutter.get_default_backend().get_default_seat();
        } catch (e) {
            this._seat = Clutter.DeviceManager.get_default();
        };

        if (this._seat) {
            this._mods_update_id = this._seat.connect('kbd-a11y-mods-state-changed', this._a11y_mods_update.bind(this));
        };

        this._timeout_id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 200, this._update.bind(this));

        console.debug(`${tag} enable() ... out`);
    }


    disable() {
        console.debug(`${tag} disable() ... in`);

        if (this._timeout_id) {
            GLib.source_remove(this._timeout_id);
            this._timeout_id = null;
        }

        if (this._seat) {
            if (this._mods_update_id) {
                this._seat.disconnect(this._mods_update_id);
                this._mods_update_id = null;
            }
            this._seat = null;
        };

        if (this._indicator) {
            Main.panel._rightBox.remove_child(this._indicator);
            this._indicator.destroy_all_children();
            this._indicator.destroy();
            this._indicator = null;
            this._label = null;
            this._indicatorText = '';
        }

        if (this._settings) {
            if (this._settingsChangedId) {
                this._settings.disconnect(this._settingsChangedId);
                this._settingsChangedId = null;
            }
            this._settings = null;
        }
        this._symModifiers = [];
        this._symLatch = '';
        this._symLock = '';
        this._symIcon = '';
        this._symOpening = '';
        this._symClosing = '';


        this._state = 0;
        this._prev_state = null;
        this._latch = 0;
        this._prev_latch = null;
        this._lock = 0;
        this._prev_lock = null;

        console.debug(`${tag} disable() ... out`);
    }

    _loadSettings() {
        console.debug(`${tag} _loadSettings() ... in`);

        if (!this._settings) {
            console.warning(`${tag} this._settings is null`);
            return;
        }

        this._symModifiers = [
            [MODIFIER_ENUM.SHIFT, this._settings.get_string('shift-symbol')],
            [MODIFIER_ENUM.LOCK, this._settings.get_string('caps-symbol')],
            [MODIFIER_ENUM.CONTROL, this._settings.get_string('control-symbol')],
            [MODIFIER_ENUM.MOD1, this._settings.get_string('mod1-symbol')],
            [MODIFIER_ENUM.MOD2, this._settings.get_string('mod2-symbol')],
            [MODIFIER_ENUM.MOD3, this._settings.get_string('mod3-symbol')],
            [MODIFIER_ENUM.MOD4, this._settings.get_string('mod4-symbol')],
            [MODIFIER_ENUM.MOD5, this._settings.get_string('mod5-symbol')],
        ];
        this._symLatch = this._settings.get_string('latch-symbol');
        this._symLock = this._settings.get_string('lock-symbol');
        this._symIcon = this._settings.get_string('icon');
        this._symOpening = this._settings.get_string('opening');
        this._symClosing = this._settings.get_string('closing');

        console.debug(`${tag} _loadSettings() ... out`);
    }

    //
    _update() {
        console.debug(`${tag} _update() ... in`);
        // `global` is provided by GNOME Shell and exposes Meta.Display APIs.
        // See GNOME Shell architecture overview:
        // https://gjs.guide/extensions/overview/architecture.html#shell
        //Note: modifiers state from get_pointer is the base not the effective
        // On latch active, it is on too. but on lock active, it is off
        // Not the case, using Gdk.Keymap.get_default().get_modifier_state() which
        // is the effective

        const [x, y, m] = global.get_pointer();

        if (typeof m !== 'undefined') {
            this._state = m;
        };

        if (this._state != this._prev_state || this._latch != this._prev_latch || this._lock != this._prev_lock) {
            console.debug(`${tag} State ${this._prev_state}->${this._state}, latch ${this._prev_latch}->${this._latch} or lock ${this._prev_lock}->${this._lock} changed`);
            this._indicatorText = this._symIcon + this._symOpening;
            // Iterate using the predefined modifier masks
            for (const [mask, sym] of this._symModifiers) {
                if ((this._state & mask) || (this._latch & mask) || (this._lock & mask))
                    this._indicatorText += sym;
                if (this._latch & mask)
                    this._indicatorText += this._symLatch;
                if (this._lock & mask)
                    this._indicatorText += this._symLock;
            }
            this._indicatorText += this._symClosing;

            this._label.text = this._indicatorText;

            this._prev_state = this._state;
            this._prev_latch = this._latch;
            this._prev_lock = this._lock;
        }

        console.debug(`${tag} _update() ... out`);
        //return true;
        return GLib.SOURCE_CONTINUE;
    }


    // The callback receives the Clutter.Seat that emitted the signal and the latched and locked modifier mask from stickykeys.
    _a11y_mods_update(_seat, latch_new, lock_new) {
        console.debug(`${tag} _a11y_mods_update() ... in`);
        if (typeof latch_new !== 'undefined') {
            this._latch = latch_new;
        };
        if (typeof lock_new !== 'undefined') {
            this._lock = lock_new;
        };
        console.debug(`${tag} latch: ${this._latch}, lock: ${this._lock}`);
        console.debug(`${tag} _a11y_mods_update() ... out`);
        //return true;
        return GLib.SOURCE_CONTINUE;
    }

}
