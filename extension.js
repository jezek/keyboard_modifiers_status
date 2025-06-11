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

//
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const tag = "KMS-Ext:";

// Print GNOME Shell and Clutter version to debug output.
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import GIRepository from 'gi://GIRepository';
console.debug(`${tag} Shell version: ${Config.PACKAGE_VERSION}`);
console.debug(`${tag} Clutter API: ${GIRepository.Repository.get_default().get_version('Clutter')}`);  

//TODO: convert into preferrence.
// Mapping of modifier masks to the displayed symbol
const MODIFIERS = [
    [Clutter.ModifierType.SHIFT_MASK, '⇧'],
    [Clutter.ModifierType.LOCK_MASK, '⇬'],
    [Clutter.ModifierType.CONTROL_MASK, '⋀'],
    [Clutter.ModifierType.MOD1_MASK, '⌥'],
    [Clutter.ModifierType.MOD2_MASK, '①'],
    [Clutter.ModifierType.MOD3_MASK, '◆'],
    [Clutter.ModifierType.MOD4_MASK, '⌘'],
    [Clutter.ModifierType.MOD5_MASK, '⎇'],
];
const latch_sym = "'";
const lock_sym = "◦";
const icon = ""; //"⌨ ";
const opening = ""; //"_";
const closing = ""; //"_";


// Gnome-shell extension interface
// constructor, enable, disable
export default class KMS extends Extension {

    seat = null;
    button = null;
    label = null;

    state = 0;
    prev_state = 0;
    latch = 0;
    prev_latch = 0;
    lock = 0;
    prev_lock = 0;

    indicator = null;

    mods_update_id = null;
    keySignal = null;


    constructor(metadata) {
        super(metadata);

        console.debug(`${tag} constructor() ... done ${this.metadata.name}`);
    }

    enable() {
        console.debug(`${tag} enable() ... in`);

        // Initialize properties
        this.seat = null;
        this.button = null;
        this.label = null;

        this.state = 0;
        this.prev_state = 0;
        this.latch = 0;
        this.prev_latch = 0;
        this.lock = 0;
        this.prev_lock = 0;

        this.indicator = null;

        this.mods_update_id = null;
        this.keySignal = null;

        // Create UI elements
        this.button = new St.Bin({ style_class: 'panel-button',
            reactive: false,
            can_focus: false,
            x_expand: true,
            y_expand: false,
            track_hover: false });
        this.label = new St.Label({ style_class: "state-label", text: "" });
        this.button.set_child(this.label);

        //console.debug(`${tag} Running Wayland: ` + Meta.is_wayland_compositor());

        try {
            this.seat = Clutter.get_default_backend().get_default_seat();
        } catch (e) {
            this.seat = Clutter.DeviceManager.get_default();
        };

        if (this.seat) {
            this.mods_update_id = this.seat.connect("kbd-a11y-mods-state-changed", this._a11y_mods_update.bind(this));
        };

        Main.panel._rightBox.insert_child_at_index(this.button, 0);

        // Instead of running `_update` at constant intervals, run it only on key up/down events.
        // `global` is provided by GNOME Shell and exposes Meta.Display APIs.
        // See GNOME Shell architecture overview:
        // https://gjs.guide/extensions/overview/architecture.html#shell
        this.keySignal = global.stage.connect(
            'captured-event',
            this._onCapturedEvent.bind(this)
        );
        this._update();

        console.debug(`${tag} enable() ... out`);
    }


    disable() {
        console.debug(`${tag} disable() ... in`);

        Main.panel._rightBox.remove_child(this.button);

        if (this.keySignal) {
            global.stage.disconnect(this.keySignal);
        }


        if (this.seat && this.mods_update_id) {
            this.seat.disconnect(this.mods_update_id);
        };

        this.button.destroy_all_children();
        this.button.destroy();

        this.seat = null;
        this.button = null;
        this.label = null;

        this.state = 0;
        this.prev_state = 0;
        this.latch = 0;
        this.prev_latch = 0;
        this.lock = 0;
        this.prev_lock = 0;

        this.indicator = null;

        this.mods_update_id = null;
        this.keySignal = null;

        console.debug(`${tag} disable() ... out`);
    }

    //
    _update() {
        console.debug(`${tag} _update() ... in`);
        //Note: modifiers state from get_pointer is the base not the effective
        // On latch active, it is on too. but on lock active, it is off
        // Not the case, using Gdk.Keymap.get_default().get_modifier_state() which
        // is the effective

        const [x, y, m] = global.get_pointer();

        if (typeof m !== 'undefined') {
            this.state = m;
        };

        console.debug(`${tag} pointer state: ${this.state}`);
        console.debug(`${tag} latch: ${this.latch}`);
        console.debug(`${tag} lock: ${this.lock}`);

        if ((this.state != this.prev_state) || this.latch != this.prev_latch || this.lock != this.prev_lock) {
            console.debug(`${tag} State changed... ${this.prev_state}, ${this.state}`);
            this.indicator = icon + opening + " ";
            // Iterate using the predefined modifier masks
            for (const [mask, sym] of MODIFIERS) {
                if ((this.state & mask) || (this.lock & mask))
                    this.indicator += sym;
                if (this.latch & mask)
                    this.indicator += latch_sym + ' ';
                if (this.lock & mask)
                    this.indicator += lock_sym + ' ';
            }
            this.indicator += " " + closing;

            this.label.text = this.indicator;

            this.prev_state = this.state;
            this.prev_latch = this.latch;
            this.prev_lock = this.lock;
        }

        console.debug(`${tag} _update() ... out`);
    }

    _onCapturedEvent(_actor, event) {
        //console.debug(`${tag} _onCapturedEvent() ... in`);
        const type = event.type();
        if (type === Clutter.EventType.KEY_PRESS || type === Clutter.EventType.KEY_RELEASE) {
            //this.state = event.get_state();
            console.debug(`${tag} key state: ${event.get_state()}`);
            //let pressed = 0;
            //let latched = 0;
            //let locked = 0;
            //event.get_key_state(&pressed, &latched, &locked);
            //console.debug(`${tag} key state (pr, la, lo): ${pressed}, ${latched}, ${locked}`);
            this._update();
        }
        //console.debug(`${tag} _onCapturedEvent() ... out`);
        return Clutter.EVENT_PROPAGATE;
    }


    // The callback receives the Clutter.Seat that emitted the signal and the latched and locked modifier mask from stickykeys.
    _a11y_mods_update(_seat, latch_new, lock_new) {
        console.debug(`${tag} _a11y_mods_update() ... in`);
        if (typeof latch_new !== 'undefined') {
            this.latch = latch_new;
        };
        if (typeof lock_new !== 'undefined') {
            this.lock = lock_new;
        };
        console.debug(`${tag} latch: ${this.latch}, lock: ${this.lock}`);
        this._update();
        console.debug(`${tag} _a11y_mods_update() ... out`);
        //return true;
        return GLib.SOURCE_CONTINUE;
    }

}
