/*
 *  ++++++++++++++++++++++
 *  Add to Calendar Button
 *  ++++++++++++++++++++++
 *
 *  Version: 2.4.3
 *  Creator: Jens Kuerschner (https://jenskuerschner.de)
 *  Project: https://github.com/add2cal/add-to-calendar-button
 *  License: Elastic License 2.0 (ELv2) (https://github.com/add2cal/add-to-calendar-button/blob/main/LICENSE.txt)
 *  Note:    DO NOT REMOVE THE COPYRIGHT NOTICE ABOVE!
 *
 */

import { atcb_generate_dropdown_list, atcb_generate_bg_overlay, atcb_generate_overlay_dom, atcb_create_atcbl, atcb_generate_modal_host } from './atcb-generate.js';
import { atcb_position_list, atcb_position_shadow_button_listener, atcb_manage_body_scroll, atcb_set_fullsize, atcb_set_sizes } from './atcb-util.js';
import { atcbStates } from './atcb-globals.js';
import { atcb_log_event } from './atcb-event.js';

// FUNCTIONS TO CONTROL THE INTERACTION
function atcb_toggle(host, action, data = '', button = null, keyboardTrigger = false, generatedButton = false) {
  // check for state and adjust accordingly
  // action can be 'open', 'close', or 'auto'
  if (action == 'open') {
    atcb_open(host, data, button, keyboardTrigger, generatedButton);
  } else if (action == 'close' || button.classList.contains('atcb-active') || host.querySelector('.atcb-active-modal')) {
    atcb_close(host, keyboardTrigger);
  } else {
    atcb_open(host, data, button, keyboardTrigger, generatedButton);
  }
}

// show the dropdown list + background overlay
function atcb_open(host, data, button = null, keyboardTrigger = false, generatedButton = false) {
  // abort early if an add to calendar dropdown or modal already opened
  if (host.querySelector('.atcb-list') || host.querySelector('.atcb-modal')) return;
  // log event
  atcb_log_event('openList', data.identifier, data.identifier);
  // generate list and prepare wrapper
  atcbStates['active'] = data.identifier;
  const list = atcb_generate_dropdown_list(host, data);
  const listWrapper = document.createElement('div');
  listWrapper.classList.add('atcb-list-wrapper');
  if (data.hideTextLabelList) {
    listWrapper.classList.add('atcb-no-text');
  }
  // set list styles, set button to atcb-active and force modal as listStyle if no button is set
  if (button) {
    button.classList.add('atcb-active');
    button.setAttribute('aria-expanded', true);
    if (data.listStyle === 'modal') {
      button.classList.add('atcb-modal-style');
      list.classList.add('atcb-modal');
    } else {
      listWrapper.append(list);
      listWrapper.classList.add('atcb-dropdown');
      if (data.listStyle === 'overlay') {
        listWrapper.classList.add('atcb-dropoverlay');
      }
    }
    if (generatedButton) {
      list.classList.add('atcb-generated-button'); // if the button has been generated by the script, we add some more specifics
    }
  } else {
    list.classList.add('atcb-modal');
  }
  // render the items depending on the liststyle
  const bgOverlay = atcb_generate_bg_overlay(host, data.trigger, data.listStyle === 'modal', !data.hideBackground);
  if (data.listStyle === 'modal') {
    // define background overlay in its own new modal shadowDOM
    const modalHost = atcb_generate_modal_host(host, data);
    // append background overlay and list to the modal shadowDOM; and init helper functions
    modalHost.querySelector('.atcb-modal-host-initialized').append(bgOverlay);
    bgOverlay.append(list);
    if (!data.hideBranding) {
      atcb_create_atcbl(modalHost, false);
    }
    atcb_set_sizes(list, data.sizes);
    atcb_manage_body_scroll(modalHost);
    // set overlay size just to be sure
    atcb_set_fullsize(bgOverlay);
  } else {
    if (data.forceOverlay) {
      host = atcb_generate_overlay_dom(host, data);
      button = host.querySelector('button.atcb-button');
    }
    host.querySelector('.atcb-initialized').append(listWrapper);
    listWrapper.append(list);
    if (data.buttonStyle != 'default') {
      listWrapper.classList.add('atcb-style-' + data.buttonStyle);
    }
    if (!data.hideBranding) {
      atcb_create_atcbl(host);
    }
    // add background overlay to the main shadowDOM
    host.append(bgOverlay);
    atcb_set_sizes(list, data.sizes);
    // setting the position with a tiny timeout to prevent any edge case situations, where the order gets mixed up
    listWrapper.style.display = 'none';
    setTimeout(function () {
      listWrapper.style.display = 'block';
      if (data.listStyle === 'dropdown-static') {
        // in the dropdown-static case, we do not dynamically adjust whether we show the dropdown upwards
        atcb_position_list(host, button, listWrapper, true);
      } else if (data.listStyle === 'dropup-static') {
        // in the dropup-static case, we also do not dynamically adjust, but always show on top
        atcb_position_list(host, button, listWrapper, false, true);
      } else {
        atcb_position_list(host, button, listWrapper);
      }
    }, 5);
    // set overlay size just to be sure
    atcb_set_fullsize(bgOverlay);
  }
  // give keyboard focus to first item in list, if possible
  const focusEl = (function () {
    const hostEl = host.querySelector('.atcb-list-item');
    if (hostEl) {
      return hostEl;
    }
    const modalHost = document.getElementById(data.identifier + '-modal-host');
    if (!modalHost) {
      return;
    }
    return modalHost.shadowRoot.querySelector('.atcb-list-item');
  })();
  if (focusEl) {
    if (keyboardTrigger) {
      focusEl.focus();
    } else {
      focusEl.focus({ preventScroll: true });
      focusEl.blur();
    }
  }
}

function atcb_close(host, keyboardTrigger = false) {
  // if we have a modal on a modal, close the latest first
  const existingModalHost = document.getElementById(host.host.getAttribute('atcb-button-id') + '-modal-host');
  const allModals = (function () {
    if (!existingModalHost || existingModalHost.length === 0) {
      return [];
    }
    return existingModalHost.shadowRoot.querySelectorAll('.atcb-modal[data-modal-nr]');
  })();
  if (allModals.length > 1) {
    existingModalHost.shadowRoot.querySelectorAll('.atcb-modal[data-modal-nr="' + allModals.length + '"]')[0].remove();
    const nextModal = existingModalHost.shadowRoot.querySelectorAll('.atcb-modal[data-modal-nr="' + (allModals.length - 1) + '"]')[0];
    nextModal.style.display = 'block';
    let focusEl = nextModal;
    const availableButtons = nextModal.getElementsByTagName('button');
    if (availableButtons.length > 0) {
      focusEl = availableButtons[0];
    }
    focusEl.focus();
    if (!keyboardTrigger) {
      focusEl.blur();
    }
  } else {
    // focus triggering button if available - especially relevant for keyboard navigation
    const newFocusEl = (function () {
      // find at host
      const hostEl = host.querySelector('.atcb-active, .atcb-active-modal');
      if (hostEl) {
        return hostEl;
      }
      // fallback to document (atcb_action case)
      return document.querySelector('.atcb-active, .atcb-active-modal');
    })();
    if (newFocusEl) {
      newFocusEl.focus({ preventScroll: true });
      if (!keyboardTrigger) {
        newFocusEl.blur();
      }
    }
    // inactivate all buttons at the host...
    Array.from(host.querySelectorAll('.atcb-active')).forEach((button) => {
      button.classList.remove('atcb-active');
      button.setAttribute('aria-expanded', false);
    });
    Array.from(host.querySelectorAll('.atcb-active-modal')).forEach((modal) => {
      modal.classList.remove('atcb-active-modal');
    });
    // ... as well as the document (case with atcb_action)
    Array.from(document.querySelectorAll('.atcb-active')).forEach((button) => {
      button.classList.remove('atcb-active');
      button.setAttribute('aria-expanded', false);
    });
    Array.from(document.querySelectorAll('.atcb-active-modal')).forEach((modal) => {
      modal.classList.remove('atcb-active-modal');
    });
    // remove any modal host
    if (existingModalHost) {
      existingModalHost.remove();
    }
    // make body scrollable again
    document.body.classList.remove('atcb-modal-no-scroll');
    document.documentElement.classList.remove('atcb-modal-no-scroll');
    // remove dropdowns, modals, and bg overlays (should only be one of each at max)
    Array.from(host.querySelectorAll('.atcb-list-wrapper'))
      .concat(Array.from(host.querySelectorAll('.atcb-list')))
      .concat(Array.from(host.querySelectorAll('#add-to-calendar-button-reference')))
      .concat(Array.from(host.querySelectorAll('#atcb-bgoverlay')))
      .forEach((el) => el.remove());
    // show original button again (forceOverlay case)
    const hiddenButton = document.querySelector('.atcb-shadow-hide');
    if (hiddenButton) {
      hiddenButton.shadowRoot.querySelector('.atcb-initialized').style.opacity = '1';
      hiddenButton.classList.remove('atcb-shadow-hide');
      // also remove the event listener
      window.removeEventListener('scroll', atcb_position_shadow_button_listener);
      window.removeEventListener('resize', atcb_position_shadow_button_listener);
    }
    // reset active state
    atcbStates['active'] = '';
  }
}

export { atcb_toggle, atcb_open, atcb_close };
