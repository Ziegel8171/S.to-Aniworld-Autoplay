// ==UserScript==
// @name             Aniworld.to & S.to Autoplay
// @name:de          Autoplay AniWorld & S.to
// @description      Autoplay for Aniworld.to and S.to
// @description:de   Autoplay für Aniworld.to und S.to
// @version          3.0.1
// @match            https://aniworld.to/*
// @match            https://s.to/*
// @match            https://186.2.175.5/
// @match            *://*/*
// @author           AniPlayer
// @namespace        https://greasyfork.org/users/1400386
// @license          GPL-3.0-or-later; https://spdx.org/licenses/GPL-3.0-or-later.html
// @icon             https://i.imgur.com/CEZGcX6.png
// @require          https://cdnjs.cloudflare.com/ajax/libs/keyboardjs/2.7.0/keyboard.min.js#sha512-UrxaOZAJw5p38NProL/UrffryqdMdXFcEdyLt6eU89pH0N7KnmAe8G3ghNbH1qW5cDYdnaoEw1TcbHn8wuqAvw==
// @require          https://cdn.jsdelivr.net/npm/tweakpane@3.1.10/dist/tweakpane.min.js#sha512-ugca4SpzfDh4VV8oj0yscIUlKxZhJd9LD5HOX4o7jOMlI/1iGYr7S4Q4Fnvx/GFXCwAivLrdHOo/7t4iYV4ehw==
// @grant            GM_addStyle
// @grant            GM_addValueChangeListener
// @grant            GM_deleteValue
// @grant            GM_getValue
// @grant            GM_listValues
// @grant            GM_removeValueChangeListener
// @grant            GM_setValue
// @grant            unsafeWindow
// @run-at           document-body
// ==/UserScript==

/**
 * Hi! Don't change (or even resave) anything here because
 * by doing this in Tampermonkey you will turn off updates
 * of the script (idk about other script managers).
 * This could be restored in settings but it might be hard to find,
 * so it's better to reinstall the script if you're not sure
*/

/* jshint esversion: 11 */
/* global Tweakpane, keyboardJS */

(async function() {
  'use strict';

  // Domains list the script should work for
  const TOP_SCOPE_DOMAINS = [
    'aniworld.to',
    's.to',
    '186.2.175.5',
  ];

  const VIDEO_PROVIDERS_LIST = {
    VOE: 'VOE',
    Vidoza: 'Vidoza',
    SpeedFiles: 'SpeedFiles',
  };

  // Providers supported by the script
  const VIDEO_PROVIDERS = [
    VIDEO_PROVIDERS_LIST.VOE,
    VIDEO_PROVIDERS_LIST.Vidoza,
    VIDEO_PROVIDERS_LIST.SpeedFiles,
  ];

  const CORE_SETTINGS_LIST = {
    corsProxy: 'corsProxy',
    commlinkPollingIntervalMs: 'commlinkPollingIntervalMs',
    debug: 'debug',
    largeSkipCooldownMs: 'largeSkipCooldownMs',
    playOnLargeSkip: 'playOnLargeSkip',
    isMuted: 'isMuted',
    persistentVolumeLvl: 'persistentVolumeLvl',
  };

  // Note that defaults are applied only on a very first run of the script
  const CORE_SETTINGS_DEFAULTS = {
    [CORE_SETTINGS_LIST.corsProxy]: 'https://aniworld-to-cors-proxy.fly.dev/',
    [CORE_SETTINGS_LIST.commlinkPollingIntervalMs]: 40,
    [CORE_SETTINGS_LIST.debug]: false,
    [CORE_SETTINGS_LIST.largeSkipCooldownMs]: 300,
    [CORE_SETTINGS_LIST.playOnLargeSkip]: true,
    [CORE_SETTINGS_LIST.isMuted]: false,
    [CORE_SETTINGS_LIST.persistentVolumeLvl]: 0.5,
  };

  const HOTKEYS_SETTINGS_LIST = {
    fastBackward: 'fastBackward',
    fastForward: 'fastForward',
    fullscreen: 'fullscreen',
    largeSkip: 'largeSkip',
  };

  // Note that defaults are applied only on a very first run of the script
  const HOTKEYS_SETTINGS_DEFAULTS = {
    [HOTKEYS_SETTINGS_LIST.fastBackward]: 'left',
    [HOTKEYS_SETTINGS_LIST.fastForward]: 'right',
    [HOTKEYS_SETTINGS_LIST.fullscreen]: 'f',
    [HOTKEYS_SETTINGS_LIST.largeSkip]: 'v',
  };

  const USER_SETTINGS_LIST = {
    fastForwardSizeS: 'fastForwardSizeS',
    isAutoplayEnabled: 'isAutoplayEnabled',
    largeSkipSizeS: 'largeSkipSizeS',
    markWatchedAfterS: 'markWatchedAfterS',
    outroSkipThresholdS: 'outroSkipThresholdS',
    outroSkipThresholdSpreadS: 'outroSkipThresholdSpreadS',
    providersPriority: 'providersPriority',
    shouldAutoplayMuted: 'shouldAutoplayMuted',
  };

  // Note that defaults are applied only on a very first run of the script
  const USER_SETTINGS_DEFAULTS = {
    [USER_SETTINGS_LIST.fastForwardSizeS]: 10,
    [USER_SETTINGS_LIST.isAutoplayEnabled]: false,
    [USER_SETTINGS_LIST.largeSkipSizeS]: 85,
    [USER_SETTINGS_LIST.markWatchedAfterS]: 2 * 60,
    [USER_SETTINGS_LIST.outroSkipThresholdS]: 90,
    [USER_SETTINGS_LIST.outroSkipThresholdSpreadS]: 0,
    [USER_SETTINGS_LIST.providersPriority]: (
      Array.from({ length: VIDEO_PROVIDERS.length }, (_, i) => i)
    ),
    [USER_SETTINGS_LIST.shouldAutoplayMuted]: true,
  };

  // Can not handle nested objects
  class DataStore {
    constructor(uuid, defaultStorage = {}) {
      if (typeof uuid !== 'string' && typeof uuid !== 'number') {
        throw new Error('Expected uuid when creating DataStore');
      }

      this.__uuid = uuid;
      this.__storage = defaultStorage;

      try {
        this.__storage = JSON.parse(GM_getValue(uuid));
      } catch {
        GM_setValue(uuid, JSON.stringify(defaultStorage));
      }

      return new Proxy(this, {
        get: (obj, prop) => {
          if (prop === 'destroy') return () => obj.__destroy();
          if (prop === 'update') return updates => obj.__update(updates);

          return obj.__storage[prop];
        },

        set: (obj, prop, value) => {
          obj.__storage[prop] = value;
          GM_setValue(obj.__uuid, JSON.stringify(obj.__storage));

          return true;
        }
      });
    }

    __update(updates) {
      if (updates) {
        Object.assign(this.__storage, updates);
        GM_setValue(this.__uuid, JSON.stringify(this.__storage));
      } else {
        try {
          this.__storage = JSON.parse(GM_getValue(this.__uuid)) || {};
        } catch {
          this.__storage = {};
        }
      }
    }

    __destroy() {
      GM_deleteValue(this.__uuid);
      this.__storage = {};
    }
  }

  const coreSettings = new DataStore('coreSettings', CORE_SETTINGS_DEFAULTS);
  const hotkeysSettings = new DataStore('hotkeysSettings', HOTKEYS_SETTINGS_DEFAULTS);
  const userSettings = new DataStore('userSettings', USER_SETTINGS_DEFAULTS);

  [
    [coreSettings, CORE_SETTINGS_DEFAULTS],
    [hotkeysSettings, HOTKEYS_SETTINGS_DEFAULTS],
    [userSettings, USER_SETTINGS_DEFAULTS]
  ].forEach(([settings, defaults]) => {
    Object.entries(defaults).forEach(([key, val]) => (settings[key] ??= val));
  });

  if (
    userSettings[USER_SETTINGS_LIST.providersPriority].length !== VIDEO_PROVIDERS.length
  ) {
    userSettings[USER_SETTINGS_LIST.providersPriority] = [
      ...USER_SETTINGS_DEFAULTS[USER_SETTINGS_LIST.providersPriority]
    ];
  }

  // -------------------------------------- /utils ---------------------------------------------

  function makeId(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';

    for (let i = 0; i < length; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return text;
  }

  async function sleep(ms = 0) {
    return new Promise(r => setTimeout(r, ms));
  }

  function waitForNode(query, {
    callbackOnTimeout = false,
    existing = false,
    onceOnly = false,
    rootNode = document.documentElement,
    timeout,

    observerOptions = {
      childList: true,
      subtree: true,
    },
  } = {}, callback) {
    if (!query) throw new Error('Query is needed');
    if (!callback) throw new Error('Callback is needed');

    observerOptions = Object.assign({}, observerOptions);

    const handledNodes = new WeakSet();
    const existingNodes = rootNode.querySelectorAll(query);
    let timeoutId = null;

    if (existingNodes.length) {
      // Mark all as handled for a proper work when `existing` is false
      // to ignore them later on
      for (const node of existingNodes) {
        handledNodes.add(node);
      }

      if (existing) {
        if (onceOnly) {
          try {
            callback(existingNodes[0]);
          } catch (e) {
            console.error(e);
          }

          return;
        } else {
          for (const node of existingNodes) {
            try {
              callback(node);
            } catch (e) {
              console.error(e);
            }
          }
        }
      }
    }

    const observer = new MutationObserver((mutations, observer) => {
      for (const node of rootNode.querySelectorAll(query)) {
        if (handledNodes.has(node)) continue;

        handledNodes.add(node);

        try {
          callback(node);
        } catch (e) {
          console.error(e);
        }

        if (onceOnly) {
          observer.disconnect();

          if (timeoutId) clearTimeout(timeoutId);

          return;
        }
      }
    });

    observer.observe(rootNode, observerOptions);

    if (timeout !== undefined) {
      timeoutId = setTimeout(() => {
        observer.disconnect();

        if (callbackOnTimeout) {
          try {
            callback(null);
          } catch (e) {
            console.error(e);
          }
        }
      }, timeout);
    }
  }

  async function waitForUserInteraction() {
    return new Promise((resolve) => {
      const handler = () => {
        document.removeEventListener('pointerdown', handler);
        document.removeEventListener('keydown', handler);

        resolve();
      };

      document.addEventListener('pointerdown', handler, { once: true });
      document.addEventListener('keydown', handler, { once: true });
    });
  }

  // -------------------------------------- utils\ ---------------------------------------------

  /* CommLink.js
  - Version: 1.0.1
  - Author: Haka
  - Description: A userscript library for cross-window communication via the userscript storage
  - GitHub: https://github.com/AugmentedWeb/CommLink
  */
  class CommLinkHandler {
    constructor(commlinkID, configObj) {
      this.commlinkID = commlinkID;
      this.singlePacketResponseWaitTime = configObj?.singlePacketResponseWaitTime || 1500;
      this.maxSendAttempts = configObj?.maxSendAttempts || 3;
      this.statusCheckInterval = configObj?.statusCheckInterval || 1;
      this.silentMode = configObj?.silentMode || false;

      this.commlinkValueIndicator = 'commlink-packet-';
      this.commands = {};
      this.listeners = [];

      const missingGrants = [
        'GM_getValue',
        'GM_setValue',
        'GM_deleteValue',
        'GM_listValues',
      ].filter(grant => !GM_info.script.grant.includes(grant));

      if (missingGrants.length > 0 && !this.silentMode) {
        alert(
          `[CommLink] The following userscript grants are missing: ${missingGrants.join(', ')}. CommLink will not work.`
        );
      }

      this.getStoredPackets()
        .filter(packet => Date.now() - packet.date > 2e4)
        .forEach(packet => this.removePacketByID(packet.id));
    }

    setIntervalAsync(callback, interval = this.statusCheckInterval) {
      let running = true;

      async function loop() {
        while (running) {
          try {
            await callback();
            await new Promise((resolve) => setTimeout(resolve, interval));
          } catch {
            continue;
          }
        }
      };

      loop();

      return {
        stop: () => {
          running = false;
          return false;
        }
      };
    }

    getUniqueID() {
      return ([1e7] + -1e3 + 4e3 + -8e3 + -1e11)
        .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
    }

    getCommKey(packetID) {
      return this.commlinkValueIndicator + packetID;
    }

    getStoredPackets() {
      return GM_listValues()
        .filter(key => key.includes(this.commlinkValueIndicator))
        .map(key => GM_getValue(key));
    }

    addPacket(packet) {
      GM_setValue(this.getCommKey(packet.id), packet);
    }

    removePacketByID(packetID) {
      GM_deleteValue(this.getCommKey(packetID));
    }

    findPacketByID(packetID) {
      return GM_getValue(this.getCommKey(packetID));
    }

    editPacket(newPacket) {
      GM_setValue(this.getCommKey(newPacket.id), newPacket);
    }

    send(platform, cmd, d) {
      return new Promise(async resolve => {
        const packetWaitTimeMs = this.singlePacketResponseWaitTime;
        const maxAttempts = this.maxSendAttempts;

        let attempts = 0;

        for (;;) {
          attempts++;

          const packetID = this.getUniqueID();
          const attemptStartDate = Date.now();

          const packet = {
            command: cmd,
            data: d,
            date: attemptStartDate,
            id: packetID,
            sender: platform,
          };

          if (!this.silentMode) {
            console.log(`[CommLink Sender] Sending packet! (#${attempts} attempt):`, packet);
          }

          this.addPacket(packet);

          for (;;) {
            const poolPacket = this.findPacketByID(packetID);
            const packetResult = poolPacket?.result;

            if (poolPacket && packetResult) {
              if (!this.silentMode) {
                console.log(`[CommLink Sender] Got result for a packet (${packetID}):`, packetResult);
              }

              resolve(poolPacket.result);

              attempts = maxAttempts; // stop main loop

              break;
            }

            if (!poolPacket || Date.now() - attemptStartDate > packetWaitTimeMs) {
              break;
            }

            await new Promise(res => setTimeout(res, this.statusCheckInterval));
          }

          this.removePacketByID(packetID);

          if (attempts === maxAttempts) break;
        }

        return resolve(null);
      });
    }

    registerSendCommand(name, obj) {
      this.commands[name] = async (data) => {
        return await this.send(obj?.commlinkID || this.commlinkID, name, obj?.data || data);
      };
    }

    registerListener(sender, commandHandler) {
      const listener = {
        sender,
        commandHandler,
        intervalObj: this.setIntervalAsync(this.receivePackets.bind(this), this.statusCheckInterval),
      };

      this.listeners.push(listener);
    }

    receivePackets() {
      this.getStoredPackets().forEach(packet => {
        this.listeners.forEach(listener => {
          if (packet.sender === listener.sender && !packet.hasOwnProperty('result')) {
            const result = listener.commandHandler(packet);

            packet.result = result;

            this.editPacket(packet);

            if (!this.silentMode) {
              if (packet.result === null) {
                console.log('[CommLink Receiver] Possibly failed to handle packet:', packet);
              } else {
                console.log('[CommLink Receiver] Successfully handled a packet:', packet);
              }
            }
          }
        });
      });
    }

    kill() {
      this.listeners.forEach(listener => listener.intervalObj.stop());
    }
  }

  class IframeMessenger {
    constructor() {
      this.commLink = null;
      this.topScopeId = null;
      this.isTimeupdateIntervalExists = false;
    }

    static messages = {
      AUTOPLAY_NEXT: 'AUTOPLAY_NEXT',
      GET_FULLSCREEN_STATE: 'GET_FULLSCREEN_STATE',
      MARK_CURRENT_VIDEO_SEEN: 'MARK_CURRENT_VIDEO_SEEN',
      OPEN_HOTKEYS_GUIDE: 'OPEN_HOTKEYS_GUIDE',
      TOGGLE_FULLSCREEN: 'TOGGLE_FULLSCREEN',
      UPDATE_SETTINGS: 'UPDATE_SETTINGS',
    };

    async initCrossFrameConnection() {
      const iframeId = makeId();
      const topScopeIdPromise = new Promise((resolve) => {
        // Top scope using GM_setValue will write its own id using iframeId as a key
        const valueChangeListenerId = GM_addValueChangeListener(iframeId, (
          _key,
          _oldValue,
          newValue,
        ) => {
          GM_removeValueChangeListener(valueChangeListenerId);
          GM_deleteValue(iframeId);

          resolve(newValue);
        });
      });

      // This should be almost immediately picked up by a top scope
      GM_setValue('unboundIframeData', {
        id: iframeId,
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const topScopeId = await topScopeIdPromise;

      if (!iframeId || !topScopeId) throw new Error('Something went wrong');

      this.topScopeId = topScopeId;
      this.commLink = new CommLinkHandler(iframeId, {
        silentMode: !coreSettings[CORE_SETTINGS_LIST.debug],
        statusCheckInterval: coreSettings[CORE_SETTINGS_LIST.commlinkPollingIntervalMs],
      });

      this.commLink.registerSendCommand(IframeMessenger.messages.AUTOPLAY_NEXT);
      this.commLink.registerSendCommand(IframeMessenger.messages.GET_FULLSCREEN_STATE);
      this.commLink.registerSendCommand(IframeMessenger.messages.MARK_CURRENT_VIDEO_SEEN);
      this.commLink.registerSendCommand(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
      this.commLink.registerSendCommand(IframeMessenger.messages.TOGGLE_FULLSCREEN);
      this.commLink.registerSendCommand(IframeMessenger.messages.UPDATE_SETTINGS);
    }

    registerConnectionListener(callback) {
      return this.commLink.registerListener(this.topScopeId, callback);
    }

    sendMessage(message, msgData) {
      this.commLink.commands[message](msgData);

      return;
    }
  }

  class IframeInterface {
    constructor(messenger) {
      this.commLink = null;
      this.isInFullscreen = null;
      this.messenger = messenger;
    }

    // It is better not to be async
    handleTopScopeMessages(packet) {
      (async function() {
        try {
          switch (packet.command) {
            case TopScopeInterface.messages.FULLSCREEN_STATE: {
              this.isInFullscreen = packet.data.isInFullscreen;
              this.updateFullscreenBtn({ isInFullscreen: this.isInFullscreen });

              break;
            }

            default: break;
          }
        } catch (e) {
          console.error(e);
        }
      }.bind(this)());

      return {
        status: `${this.constructor.name} received a message`,
      };
    }

    async init(player) {
      this.messenger.registerConnectionListener(this.handleTopScopeMessages.bind(this));
      await this.preparePlayer(player);
    }


    createAutoplayButton() {
      const button = document.createElement('button');
      const toggleContainer = document.createElement('div');
      const toggleDot = document.createElement('div');
      const isAutoplayEnabled = userSettings[USER_SETTINGS_LIST.isAutoplayEnabled];

      button.addEventListener('click', () => {
        const wasEnabled = userSettings[USER_SETTINGS_LIST.isAutoplayEnabled];

        userSettings[USER_SETTINGS_LIST.isAutoplayEnabled] = !wasEnabled;

        button.setAttribute('aria-checked', (!wasEnabled).toString());
        button.title = (
          !isAutoplayEnabled ? 'Autoplay is disabled' : 'Autoplay is enabled'
        );

        toggleDot.style.backgroundColor = wasEnabled ? '#e1e1e1' : '#fff';
        toggleDot.style.transform = wasEnabled ? 'translateX(0px)' : 'translateX(12px)';
      });

      button.type = 'button';
      button.title = (
        !isAutoplayEnabled ? 'Autoplay is disabled' : 'Autoplay is enabled'
      );
      button.appendChild(toggleContainer);
      button.setAttribute('aria-checked', (isAutoplayEnabled).toString());
      button.className = 'Autoplay-button';

      toggleContainer.className = 'Autoplay-button--toggle';
      toggleContainer.appendChild(toggleDot);

      toggleDot.className = 'Autoplay-button--toggle-dot';
      toggleDot.style.backgroundColor = !isAutoplayEnabled ? '#e1e1e1' : '#fff';
      toggleDot.style.transform = (
        !isAutoplayEnabled ? 'translateX(0px)' : 'translateX(12px)'
      );

      GM_addStyle([`
        .Autoplay-button {
          width: 36px !important;
          height: 36px;
          padding: 0 !important;
          border-radius: 50%;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
        }

        .Autoplay-button[aria-checked="true"] .Autoplay-button--toggle-dot {
          transform: translateX(12px);
        }

        .Autoplay-button--toggle {
          width: 24px;
          height: 12px;
          margin-bottom: 3px;
          background-color: rgba(221, 221, 221, 0.5);
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          display: inline-block;
        }

        .Autoplay-button--toggle-dot {
          width: 12px;
          height: 12px;
          background-color: #e1e1e1;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
        }
      `][0]);

      return button;
    }

    createSettingsPane() {
      const pane = new Tweakpane.Pane();

      pane.hidden = true;

      pane.on('change', () => {
        this.messenger.sendMessage(IframeMessenger.messages.UPDATE_SETTINGS);
      });

      GM_addStyle([
        // Main container
        `
          .tp-dfwv {
            --tp-font-family: sans-serif;
            min-width: 412px;
            top: 0;
            right: 0;
            z-index: 999;
          }
        `,

        // A container one level below the main one
        `
          .tp-rotv {
            max-height: 420px;
            font-size: 12px;
            overflow-y: scroll;
            scrollbar-width: thin;
            scrollbar-color: #6b6c73 #37383d;
          }
        `,

        // Any text input
        `
          .tp-txtv_i, .tp-sglv_i {
            font-size: 14px !important;
            padding: 0 8px !important;
            color: var(--in-fg) !important;
            background-color: var(--in-bg) !important;
            opacity: 1 !important;
          }
        `,
      ].join(' '));

      // Stop leaking events to the player
      (['keydown', 'keyup', 'keypress'].forEach(event =>
        pane.element.addEventListener(event, (e) => e.stopPropagation())
      ));

      const assignTooltip = (text, object) => (object.element.title = text);

      const tabs = pane.addTab({
        pages: [
          { title: 'Preferences' },
          { title: 'Advanced' },
        ],
      });

      const userTab = tabs.pages[0];
      const advancedTab = tabs.pages[1];

      const userTabApplyBtn = userTab.addButton({
        disabled: true,
        title: 'Apply',
      });

      const advancedTabApplyBtn = advancedTab.addButton({
        disabled: true,
        title: 'Apply',
      });

      for (const btn of [userTabApplyBtn, advancedTabApplyBtn]) {
        btn.on('click', () => {
          setTimeout(() => {
            userTabApplyBtn.disabled = true;
            advancedTabApplyBtn.disabled = true;
          });
        });
      }

      pane.element.addEventListener('click', () => {
        userTabApplyBtn.disabled = false;
        advancedTabApplyBtn.disabled = false;
      });

      const priorityUserFolder = userTab.addFolder({ title: 'Providers priority' });

      (() => {
        const priorities = userSettings[USER_SETTINGS_LIST.providersPriority];
        const buttons = [];

        priorities.forEach((priority, index) => {
          const button = priorityUserFolder.addButton({
            title: `⬆ ${index + 1}) ${VIDEO_PROVIDERS[priority]}`,
          });

          button.on('click', () => {
            if (index > 0) {
              [priorities[index], priorities[index - 1]] = (
                [priorities[index - 1], priorities[index]]
              );

              userSettings[USER_SETTINGS_LIST.providersPriority] = priorities;

              priorities.forEach((priority, index) => {
                buttons[index].title = `⬆ ${index + 1}) ${VIDEO_PROVIDERS[priority]}`;
              });

              this.messenger.sendMessage(IframeMessenger.messages.UPDATE_SETTINGS);
            }
          });

          buttons.push(button);
        });
      })();

      const miscellaneousUserFolder = userTab.addFolder({ title: 'Miscellaneous' });

      miscellaneousUserFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (typeof ev.value === 'string') {
          userSettings[ev.presetKey] = userSettings[ev.presetKey].trim();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Autoplay should be enabled for this to work. Makes autoplay muted which in turn makes autoplay to be always available, but instead it requires user input (click or keypress) to unmute. Keypress requires a video player to be in focus'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.shouldAutoplayMuted, {
          label: 'Persistent muted autoplay',
        },
      ));

      assignTooltip((
        'Amount of seconds to skip or rewind by pressing corresponding hotkeys'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.fastForwardSizeS, {
          step: 1,
          min: 0,
          label: 'Fast forward size, sec',
        },
      ));

      assignTooltip((
        'Large skip size when pressing the corresponding hotkey'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.largeSkipSizeS, {
          step: 1,
          min: 0,
          label: 'Large skip size, sec',
        },
      ));

      assignTooltip((
        'Amount of seconds of approximate playback time after which a video is being marked as seen. Set to 0 to disable and mark only by a triggered autoplay'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.markWatchedAfterS, {
          step: 1,
          min: 0,
          label: 'Mark watched after, sec',
        },
      ));

      assignTooltip((
        'Automatically go to next video when video player has got into this amount of seconds left to play'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.outroSkipThresholdS, {
          step: 1,
          min: 0.5,
          label: 'Outro skip threshold, sec',
        },
      ));

      assignTooltip((
        'If this is 0, outro skip is being applied throughout all of the THRESHOLD seconds amount, so when user seeks to the end of the video, it is being skipped. If this is more than 0, skip would be applied only from THRESHOLD to (THRESHOLD minus THRESHOLD SPREAD). Example: if a video is 2 minutes long, THRESHOLD is 20 and THRESHOLD SPREAD is 5, outro skip might be triggered only from 1:40 to 1:45'
      ), miscellaneousUserFolder.addInput(userSettings,
        USER_SETTINGS_LIST.outroSkipThresholdSpreadS, {
          step: 1,
          min: 0,
          label: 'Outro skip threshold spread, sec',
        },
      ));

      miscellaneousUserFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        userSettings.update(USER_SETTINGS_DEFAULTS);
        pane.refresh();
      });

      const hotkeysUserFolder = advancedTab.addFolder({ title: 'Hotkeys' });

      hotkeysUserFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (typeof ev.value === 'string') {
          hotkeysSettings[ev.presetKey] = hotkeysSettings[ev.presetKey].trim();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Hotkey for a fast backward. A page reload is required for this setting to take effect!'
      ), hotkeysUserFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_LIST.fastBackward, {
          label: 'Fast backward*',
        },
      ));

      assignTooltip((
        'Hotkey for a fast forward. A page reload is required for this setting to take effect!'
      ), hotkeysUserFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_LIST.fastForward, {
          label: 'Fast forward*',
        },
      ));

      assignTooltip((
        'Hotkey for a fullscreen mode toggle. A page reload is required for this setting to take effect!'
      ), hotkeysUserFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_LIST.fullscreen, {
          label: 'Fullscreen*',
        },
      ));

      assignTooltip((
        'Hotkey for a large fast forward, typically on intros. A page reload is required for this setting to take effect!'
      ), hotkeysUserFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_LIST.largeSkip, {
          label: 'Large skip*',
        },
      ));

      const howToHotkeysUserBtn = hotkeysUserFolder.addButton({ title: 'Hotkeys guide' });

      howToHotkeysUserBtn.on('click', () => {
        this.messenger.sendMessage(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
      });

      hotkeysUserFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        hotkeysSettings.update(HOTKEYS_SETTINGS_DEFAULTS);
        pane.refresh();
      });

      const miscellaneousCoreFolder = advancedTab.addFolder({ title: 'Miscellaneous' });

      miscellaneousCoreFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (typeof ev.value === 'string') {
          coreSettings[ev.presetKey] = coreSettings[ev.presetKey].trim();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Large skip hotkey also starts playback'
      ), miscellaneousCoreFolder.addInput(coreSettings,
        CORE_SETTINGS_LIST.playOnLargeSkip, {
          label: 'Play on large skip',
        },
      ));

      assignTooltip((
        'Cooldown for a large skip hotkey, to prevent an accidental double skip. A page reload is required for this setting to take effect!'
      ), miscellaneousCoreFolder.addInput(coreSettings,
        CORE_SETTINGS_LIST.largeSkipCooldownMs, {
          step: 1,
          min: 0,
          label: 'Large skip cooldown, ms*',
        },
      ));

      assignTooltip((
        'In order to keep possible VOE-to-VOE unmuted autoplay, the script has to pass a very little amount of web requests through its own proxy server. Make the input empty to disable this behavior'
      ), miscellaneousCoreFolder.addInput(coreSettings,
        CORE_SETTINGS_LIST.corsProxy, {
          label: 'CORS proxy',
        },
      ));

      assignTooltip((
        'Reflects messaging responsiveness between a player and a top scope. Might impact CPU usage if set too low. 40 should be enough. A page reload is required for this setting to take effect!'
      ), miscellaneousCoreFolder.addInput(coreSettings,
        CORE_SETTINGS_LIST.commlinkPollingIntervalMs, {
          step: 10,
          min: 10,
          max: 500,
          label: 'Commlink polling interval, ms*',
        },
      ));

      assignTooltip((
        'Push some console logs. A page reload is required for this setting to take effect!'
      ), miscellaneousCoreFolder.addInput(coreSettings,
        CORE_SETTINGS_LIST.debug, {
          label: 'Debug*',
        },
      ));

      miscellaneousCoreFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        coreSettings.update(CORE_SETTINGS_DEFAULTS);
        pane.refresh();
      });

      return pane;
    }

    async handleAutoplay(player) {
      if (!userSettings[USER_SETTINGS_LIST.isAutoplayEnabled]) return;

      let canplayWasApplied = false;
      let muteWasApplied = false;

      // If play fails it tries to fix it but throws the problem error anyway
      const playOrFix = async () => {
        try {
          await player.play();
        } catch (e) {
          if (e.name === 'NotAllowedError') {
            // Muted usually is allowed to play,
            // and if it's not allowed, nothing could be done here
            if (player.muted) {
              console.error('Muted and not allowed');
              throw e;
            }

            if (userSettings[USER_SETTINGS_LIST.shouldAutoplayMuted] && !muteWasApplied) {
              player.muted = true;
              muteWasApplied = true;

              // Restore setting altered by forced mute. See this.setupPersistentVolume()
              setTimeout(() => coreSettings[CORE_SETTINGS_LIST.isMuted] = false);

              // Should not be awaited
              (async () => {
                await waitForUserInteraction();

                // If interaction was unmute button, try to not overtake it
                // because it might result in mute -> unmute -> mute again.
                // Different player requires a different delay
                await sleep(100);

                if (player.muted) player.muted = false;
              })();
            }
          }

          // Try this for everything else, for now
          else if (canplayWasApplied === false) {
            canplayWasApplied = true;

            await new Promise((resolve, reject) => {
              setTimeout(() => {
                reject(new Error('"canplay" was taking too long'));
              }, 10 * 1000);

              player.addEventListener('canplay', () => resolve(), { once: true });
            });
          }

          throw e;
        }
      };

      const retryAttemptsAmount = 3;
      let lastError = null;

      for (let i = 0; i < retryAttemptsAmount; i++) {
        try {
          return await playOrFix();
        } catch (e) {
          lastError = e;
        }
      }

      throw lastError;
    }

    setupHotkeys(player) {
      if (hotkeysSettings[HOTKEYS_SETTINGS_LIST.fastForward]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_LIST.fastForward], () => {
          if (userSettings[USER_SETTINGS_LIST.fastForwardSizeS]) {
            player.currentTime += userSettings[USER_SETTINGS_LIST.fastForwardSizeS];
          }
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_LIST.fastBackward]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_LIST.fastBackward], () => {
          if (userSettings[USER_SETTINGS_LIST.fastForwardSizeS]) {
            player.currentTime -= userSettings[USER_SETTINGS_LIST.fastForwardSizeS];
          }
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_LIST.fullscreen]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_LIST.fullscreen], (ev) => {
          ev.preventRepeat();
          this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_LIST.largeSkip]) {
        const cooldownTime = coreSettings[CORE_SETTINGS_LIST.largeSkipCooldownMs];
        let lastSkipTime = 0;

        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_LIST.largeSkip], () => {
          if (userSettings[USER_SETTINGS_LIST.largeSkipSizeS]) {
            const now = Date.now();

            if (now - lastSkipTime < cooldownTime) return;

            lastSkipTime = now;

            player.currentTime += userSettings[USER_SETTINGS_LIST.largeSkipSizeS];
          }

          if (coreSettings[CORE_SETTINGS_LIST.playOnLargeSkip]) {
            player.play();
          }
        });
      }
    }

    setupPersistentVolume(player) {
      player.muted = coreSettings[CORE_SETTINGS_LIST.isMuted];
      player.volume = coreSettings[CORE_SETTINGS_LIST.persistentVolumeLvl];

      player.addEventListener('volumechange', () => {
        coreSettings[CORE_SETTINGS_LIST.isMuted] = player.muted;
        coreSettings[CORE_SETTINGS_LIST.persistentVolumeLvl] = player.volume;
      });
    }

    // Handle "seen" state and an outro skip
    setupTimeupdateHandler(player) {
      if (this.isTimeupdateIntervalExists) {
        throw new Error('setupTimeupdateHandler called twice');
      }

      this.isTimeupdateIntervalExists = true;

      const intervalMs = 250;
      let approximatePlayTimeS = 0;
      let currentVideoWasWatched = false;
      let lastPlayerTime = player.currentTime;
      let outroHasBeenReached = false;

      setInterval(() => {
        if (player.currentTime === lastPlayerTime) return;

        lastPlayerTime = player.currentTime;
        approximatePlayTimeS += (intervalMs / 1000);

        if (
          !currentVideoWasWatched &&
          userSettings[USER_SETTINGS_LIST.markWatchedAfterS] &&
          (approximatePlayTimeS >= userSettings[USER_SETTINGS_LIST.markWatchedAfterS])
        ) {
          currentVideoWasWatched = true;

          try {
            this.messenger.sendMessage(IframeMessenger.messages.MARK_CURRENT_VIDEO_SEEN);
          } catch (e) {
            console.error(e);
          }
        }

        if (
          outroHasBeenReached ||
          !userSettings[USER_SETTINGS_LIST.isAutoplayEnabled]
        ) return;

        const timeLeft = player.duration - player.currentTime;
        const skipWindow = (
          userSettings[USER_SETTINGS_LIST.outroSkipThresholdS] - userSettings[USER_SETTINGS_LIST.outroSkipThresholdSpreadS]
        );

        if (userSettings[USER_SETTINGS_LIST.outroSkipThresholdSpreadS] === 0) {
          if (timeLeft <= userSettings[USER_SETTINGS_LIST.outroSkipThresholdS]) {
            outroHasBeenReached = true;
          }
        } else {
          if (
            timeLeft >= skipWindow &&
            timeLeft <= userSettings[USER_SETTINGS_LIST.outroSkipThresholdS]
          ) {
            outroHasBeenReached = true;
          }
        }

        if (outroHasBeenReached) {
          this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_NEXT, {
            currentVideoId: player.src,
          });
        }
      }, intervalMs);
    }
  }

  class VOEIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForNode('iframe[style*="z-index: 2147483647"]', {
        existing: true,
      }, (ads) => ads.remove());

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          // Intercept original F hotkey in order to prevent a wrong fullscreen
          if (type === 'keydown' && this.matches && this.matches('div.plyr')) {
            return originalAddEventListener.call(this, type, (ev) => {
              if (ev.code === 'KeyF') return;

              return listener.call(this, ev);
            }, options);
          }

          // Get rid of ads on any LMB click
          if (this === document && ['click', 'mousedown'].includes(type)) return;

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static queries = {
      fullscreenBtn: 'button[data-plyr="fullscreen"]',
      player: 'video#voe-player',
      playerContainer: 'div.plyr__video-wrapper',
      playerControls: 'div.plyr__controls',
    };

    createAutoplayButton() {
      const button = document.createElement('button');
      const toggleContainer = document.createElement('div');
      const toggleDot = document.createElement('div');
      const tooltip = document.createElement('span');
      const isAutoplayEnabled = userSettings[USER_SETTINGS_LIST.isAutoplayEnabled];

      button.addEventListener('click', () => {
        const wasEnabled = userSettings[USER_SETTINGS_LIST.isAutoplayEnabled];

        userSettings[USER_SETTINGS_LIST.isAutoplayEnabled] = !wasEnabled;

        button.setAttribute('aria-checked', (!wasEnabled).toString());

        tooltip.textContent = wasEnabled ? 'Autoplay is disabled' : 'Autoplay is enabled';
        toggleDot.style.backgroundColor = wasEnabled ? '#bbb' : '#fff';
        toggleDot.style.transform = wasEnabled ? 'translateX(0px)' : 'translateX(12px)';
      });

      button.type = 'button';
      button.appendChild(toggleContainer);
      button.appendChild(tooltip);
      button.setAttribute('aria-checked', (isAutoplayEnabled).toString());
      button.className = (
        'plyr__controls__item plyr__control Autoplay-button'
      );

      toggleContainer.className = 'Autoplay-button--toggle';
      toggleContainer.appendChild(toggleDot);

      toggleDot.className = 'Autoplay-button--toggle-dot';

      tooltip.className = 'plyr__tooltip';

      tooltip.textContent = (
        !isAutoplayEnabled ? 'Autoplay is disabled' : 'Autoplay is enabled'
      );
      toggleDot.style.backgroundColor = !isAutoplayEnabled ? '#bbb' : '#fff';
      toggleDot.style.transform = (
        !isAutoplayEnabled ? 'translateX(0px)' : 'translateX(12px)'
      );

      GM_addStyle([`
        .Autoplay-button {
          width: 36px !important;
          height: 36px;
          padding: 0 !important;
          background-color: #bbb;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
        }

        .Autoplay-button[aria-checked="true"] .Autoplay-button--toggle-dot {
          transform: translateX(12px);
        }

        .Autoplay-button:hover .plyr__tooltip {
          opacity: 1;
        }

        .Autoplay-button--toggle {
          width: 24px;
          height: 12px;
          vertical-align: -1px;
          background-color: rgba(221, 221, 221, 0.5);
          border-radius: 6px;
          position: relative;
          cursor: pointer;
          display: inline-block;
        }

        .Autoplay-button--toggle-dot {
          width: 12px;
          height: 12px;
          background-color: #bbb;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
        }
      `][0]);

      return button;
    }

    async preparePlayer(player) {
      this.setupHotkeys(player);
      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume
      this.setupTimeupdateHandler(player);

      // Hide cursor on a fullscreen playback
      waitForNode(VOEIframeInterface.queries.playerContainer, {
        existing: true,
        onceOnly: true,
      }, (playerContainer) => {
        let lastMove = Date.now();

        playerContainer.addEventListener('mousemove', () => {
          lastMove = Date.now();
          playerContainer.style.cursor = 'default';
        });

        setInterval(() => {
          if (
            this.isInFullscreen &&
            !player.paused && (Date.now() - lastMove > 2000)
          ) {
            playerContainer.style.cursor = 'none';
          }
        }, 100);
      });

      // Attach autoplay button and change fullscreen button behavior...
      waitForNode(VOEIframeInterface.queries.playerControls, {
        existing: true,
        onceOnly: true,
      }, (playerControls) => {
        const fsBtn = playerControls.querySelector(VOEIframeInterface.queries.fullscreenBtn);
        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.createSettingsPane();

        fsBtn.before(autoplayBtn);
        fsBtn.replaceWith(newFsBtn);

        autoplayBtn.oncontextmenu = () => {
          settingsPane.hidden = !settingsPane.hidden;
          return false;
        };

        newFsBtn.addEventListener('click', () => {
          this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
        });
      });

      this.messenger.sendMessage(IframeMessenger.messages.GET_FULLSCREEN_STATE);

      await (async function waitForPlyr(start = Date.now()) {
        if (!player.plyr) {
          if ((Date.now() - start) > (10 * 1000)) {
            throw new Error('Plyr API didn\'t arrive in time');
          }

          await sleep();

          return waitForPlyr(start);
        }
      }());

      // Change doubleclick-to-fullscreen feature behavior
      for (let i = player.plyr.eventListeners.length - 1; i >= 0; i--) {
        const listenerObject = player.plyr.eventListeners[i];

        if (listenerObject.type === 'dblclick') {
          listenerObject.element.removeEventListener('dblclick', listenerObject.callback);
          player.plyr.eventListeners.splice(i, 1);

          listenerObject.element.addEventListener('dblclick', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          break;
        }
      }
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const btn = document.querySelector(VOEIframeInterface.queries.fullscreenBtn);

      if (isInFullscreen) {
        btn.classList.add('plyr__control--pressed');
      } else {
        btn.classList.remove('plyr__control--pressed');
      }
    }
  }

  class VidozaIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForNode([
        'div[id^=asg-]',
        'div.prevent-first-click',
        'div.vjs-adblock-overlay',
        'iframe[data-asg-handled^="asg-"]',
        'iframe[style*="z-index: 2147483647"]',
      ].join(', '), {
        existing: true,
      }, (ads) => ads.remove());

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          // Get rid of ads on any LMB click
          if (type === 'mousedown' && (this === document || this === unsafeWindow)) {
            return;
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static queries = {
      fullscreenBtn: 'button.vjs-fullscreen-control',
      player: 'video#player_html5_api.vjs-tech',
    };

    async preparePlayer(player) {
      this.setupHotkeys(player);
      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume
      this.setupTimeupdateHandler(player);

      // Attach autoplay button and change fullscreen button behavior...
      waitForNode(VidozaIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.createSettingsPane();

        fsBtn.before(autoplayBtn);
        fsBtn.replaceWith(newFsBtn);

        autoplayBtn.oncontextmenu = () => {
          settingsPane.hidden = !settingsPane.hidden;
          return false;
        };

        newFsBtn.addEventListener('click', () => {
          this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
        });
      });

      this.messenger.sendMessage(IframeMessenger.messages.GET_FULLSCREEN_STATE);
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const player = document.querySelector(VidozaIframeInterface.queries.player);

      if (isInFullscreen) {
        player.parentElement.classList.add('vjs-fullscreen');
      } else {
        player.parentElement.classList.remove('vjs-fullscreen');
      }
    }
  }

  class SpeedfilesIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForNode([
        'iframe[style*="z-index: 2147483647"]',
      ].join(', '), {
        existing: true,
      }, (ads) => ads.remove());
    }

    static queries = {
      fullscreenBtn: 'button.vjs-fullscreen-control',
      player: 'video#my-video_html5_api.vjs-tech',
    };

    async preparePlayer(player) {
      this.setupHotkeys(player);
      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume
      this.setupTimeupdateHandler(player);

      // Attach autoplay button and change fullscreen button behavior...
      waitForNode(SpeedfilesIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.createSettingsPane();

        fsBtn.before(autoplayBtn);
        fsBtn.replaceWith(newFsBtn);

        autoplayBtn.oncontextmenu = () => {
          settingsPane.hidden = !settingsPane.hidden;
          return false;
        };

        newFsBtn.addEventListener('click', () => {
          this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
        });
      });

      this.messenger.sendMessage(IframeMessenger.messages.GET_FULLSCREEN_STATE);
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const player = document.querySelector(SpeedfilesIframeInterface.queries.player);

      if (isInFullscreen) {
        player.parentElement.classList.add('vjs-fullscreen');
      } else {
        player.parentElement.classList.remove('vjs-fullscreen');
      }
    }
  }

  class TopScopeInterface {
    constructor() {
      this.commLink = null;
      this.currentIframeId = null;
      this.id = makeId();
      this.isPendingConnection = false;
      this.prevIframeVideoId = null;
    }

    static messages = {
      FULLSCREEN_STATE: 'FULLSCREEN_STATE',
    };

    static queries = {
      animeTitle: 'div.hostSeriesTitle',
      episodeDedicatedLink: 'div.hosterSiteVideo a.watchEpisode',
      episodeTitle: 'div.hosterSiteTitle',
      hostersPlayerContainer: 'div.hosterSiteVideo',
      navLinksContainer: 'div#stream.hosterSiteDirectNav',
      playerIframe: 'div.inSiteWebStream iframe',
      providerChangeBtn: '.generateInlinePlayer',
      providerName: 'div.hosterSiteVideo > ul a > h4',
      providersList: 'div.hosterSiteVideo > ul',
    };

    // It is better not to be async
    handleIframeMessages(packet) {
      (async function() {
        try {
          switch (packet.command) {
            case IframeMessenger.messages.AUTOPLAY_NEXT: {
              // This is here because it bugges out the episodes navigation panel
              // if try and use MARK_CURRENT_VIDEO_SEEN. Seen episode is being
              // marked as non seen
              try {
                await this.markCurrentVideoSeen();
              } catch (e) {
                console.error(e);
              }

              await this.goToNextVideo({
                currentIframeVideoId: packet.data.currentVideoId,
              });

              break;
            }

            case IframeMessenger.messages.GET_FULLSCREEN_STATE: {
              this.commLink.commands[TopScopeInterface.messages.FULLSCREEN_STATE]({
                isInFullscreen: !!document.fullscreenElement,
              });

              break;
            }

            case IframeMessenger.messages.MARK_CURRENT_VIDEO_SEEN: {
              await this.markCurrentVideoSeen();

              break;
            }

            case IframeMessenger.messages.OPEN_HOTKEYS_GUIDE: {
              if (confirm('Open hotkeys guide?')) {
                window.open('https://i.imgur.com/3cnDWxm.png', '_blank');
              }

              break;
            }

            case IframeMessenger.messages.TOGGLE_FULLSCREEN: {
              // Notice how this then triggers a listener from this.init()
              if (document.fullscreenElement) {
                await document.exitFullscreen();
              } else {
                await document.documentElement.requestFullscreen();
              }

              break;
            }

            case IframeMessenger.messages.UPDATE_SETTINGS: {
              coreSettings.update();
              hotkeysSettings.update();
              userSettings.update();

              break;
            }

            default: break;
          }
        } catch (e) {
          console.error(e);
        }
      }.bind(this)());

      return {
        status: `${this.constructor.name} received a message`,
      };
    }

    async init() {
      await this.initCrossFrameConnection();

      document.addEventListener('fullscreenchange', () => {
        this.toggleFakeFullscreen();
        this.commLink.commands[TopScopeInterface.messages.FULLSCREEN_STATE]({
          isInFullscreen: !!document.fullscreenElement,
        });
      });
    }

    async initCrossFrameConnection() {
      if (this.isPendingConnection) throw new Error('Connecting already');

      this.isPendingConnection = true;

      let timeoutId;

      const iframeId = this.currentIframeId = await new Promise((resolve, reject) => {
        const valueChangeListenerId = GM_addValueChangeListener('unboundIframeData', (
          _key,
          _oldValue,
          newValue,
        ) => {
          const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);
          const {
            id: iframeId,
            width: iframeScopeWidth,
            height: iframeScopeHeight,
          } = newValue;

          // Skip if it is a wrong iframe, judging by its size.
          // Alternatively I can use domains blacklist
          if (
            !iframe ||
            (iframeScopeWidth !== iframe.offsetWidth) ||
            (iframeScopeHeight !== iframe.offsetHeight)
          ) {
            return;
          }

          GM_removeValueChangeListener(valueChangeListenerId);
          clearTimeout(timeoutId);
          resolve(iframeId);
        });

        timeoutId = setTimeout(() => {
          this.isPendingConnection = false;

          GM_removeValueChangeListener(valueChangeListenerId);
          reject(new Error('Iframe connection timeout'));
        }, 10 * 1000);
      });

      GM_setValue(iframeId, this.id);

      this.commLink = new CommLinkHandler(this.id, {
        silentMode: !coreSettings[CORE_SETTINGS_LIST.debug],
        statusCheckInterval: coreSettings[CORE_SETTINGS_LIST.commlinkPollingIntervalMs],
      });

      this.commLink.registerSendCommand(TopScopeInterface.messages.FULLSCREEN_STATE);

      this.commLink.registerListener(iframeId, this.handleIframeMessages.bind(this));

      this.isPendingConnection = false;
    }


    async announceEpisodeWatched(id) {
      const url = `${location.protocol}//${location.hostname}/ajax/watchEpisode`;
      const options = {
        method: 'POST',
        body: `episode=${id}`,
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      };

      const reqResult = await fetch(url, options).then(res => res.json());

      if (reqResult.status === false) await fetch(url, options);
    }

    async markCurrentVideoSeen() {
      const episodeTitle = document.querySelector(TopScopeInterface.queries.episodeTitle);
      const { episodeId } = episodeTitle.dataset;

      await this.announceEpisodeWatched(episodeId);
    }

    toggleFakeFullscreen() {
      const Q = TopScopeInterface.queries;
      const isInFullscreen = !!document.fullscreenElement;
      const hostersPlayerContainer = document.querySelector(Q.hostersPlayerContainer);
      const playerIframe = document.querySelector(Q.playerIframe);

      if (isInFullscreen) {
        document.body.style.overflow = 'hidden';
        playerIframe.style.height = '100vh';
        hostersPlayerContainer.firstElementChild.style.display = 'none';
        hostersPlayerContainer.style.cssText = (
          'z-index: 100; position: fixed; top: 0; left: 0; padding: 0; height: 100vh; overflow-y: scroll; scrollbar-width: none;'
        );
      } else {
        document.body.style.overflow = '';
        playerIframe.style.height = '';

        // scrollTop reset must go before the cssText, it won't work otherwise
        hostersPlayerContainer.firstElementChild.style.display = '';
        hostersPlayerContainer.scrollTop = 0;
        hostersPlayerContainer.style.cssText = '';
      }
    }

    async goToNextVideo({ currentIframeVideoId }) {
      const Q = TopScopeInterface.queries;

      // Ignore possible goToNextVideo flood spam
      if (this.prevIframeVideoId === currentIframeVideoId) return;

      this.prevIframeVideoId = currentIframeVideoId;

      const [seasonsNav, episodesNav] = document.querySelectorAll(`${Q.navLinksContainer} > ul`);
      const episodesNavLinks = [...episodesNav.querySelectorAll('a')];
      const seasonNavLinks = [...seasonsNav.querySelectorAll('a')];
      const currentEpisodeIndex = episodesNavLinks.findIndex(el => el.classList.contains('active'));
      const currentSeasonIndex = seasonNavLinks.findIndex(el => el.classList.contains('active'));
      let nextEpisodeHref = null;

      if (currentEpisodeIndex < episodesNavLinks.length - 1) {
        nextEpisodeHref = episodesNavLinks[currentEpisodeIndex + 1].href;
      }
      else if (currentSeasonIndex < seasonNavLinks.length - 1) {
        // Do not proceed if this is a last movie
        // so it wont hop in to a season from a movie
        if (seasonNavLinks[currentSeasonIndex].href.endsWith('/filme')) return;

        const nextSeasonHref = seasonNavLinks[currentSeasonIndex + 1].href;
        const nextSeasonHtml = await (await fetch(nextSeasonHref)).text();
        const nextSeasonDom = (new DOMParser()).parseFromString(nextSeasonHtml, 'text/html');
        const firstEpisodeLink = nextSeasonDom.querySelector(
          `${Q.navLinksContainer} > ul a[data-episode-id]`
        );

        nextEpisodeHref = firstEpisodeLink.href;
      }

      // Skip cause it seems like it is a very last episode.
      // Throw is needed because return would cause a bug
      if (!nextEpisodeHref) throw new Error('Last episode was reached');

      const nextEpisodeHtml = await (await fetch(nextEpisodeHref)).text();
      const nextEpisodeDom = (new DOMParser()).parseFromString(nextEpisodeHtml, 'text/html');
      const providersList = nextEpisodeDom.querySelector(Q.providersList);
      const nextVideoLinks = providersList.querySelectorAll(Q.episodeDedicatedLink);
      let nextProviderName = null;
      let nextVideoLink = null;

      outer:
      for (const priority of userSettings[USER_SETTINGS_LIST.providersPriority]) {
        const preferredProviderName = VIDEO_PROVIDERS[priority];

        for (const link of nextVideoLinks) {
          const providerName = link.querySelector(Q.providerName).innerText;

          if (providerName === preferredProviderName) {
            nextProviderName = providerName;
            nextVideoLink = link;

            break outer;
          }
        }
      }

      let nextVideoHref = nextVideoLink.href;

      // VOE has an additional redirect page,
      // so need to extract the video href from there first
      // in order to keep VOE-to-VOE autoplay unmuted
      if (nextVideoHref && nextProviderName === VIDEO_PROVIDERS_LIST.VOE) {
        const corsProxy = coreSettings[CORE_SETTINGS_LIST.corsProxy];

        if (corsProxy) {
          nextVideoHref = /location\.href = '(https:\/\/.+)';/.exec(
            await (await fetch(corsProxy + nextVideoLink.href)).text()
          )[1];
        }
      }

      if (!nextVideoHref) throw new Error('Unable to get next video link');

      document.querySelector(Q.playerIframe).src = nextVideoHref;

      // Update current DOM from a next episode DOM
      [
        'div#wrapper > div.seriesContentBox > div.container.marginBottom > ul',
        'div#wrapper > div.seriesContentBox > div.container.marginBottom > div.cf',
        `${Q.episodeTitle} > ul`,
        Q.animeTitle,
        Q.episodeTitle,
        Q.navLinksContainer,
        Q.providersList,
      ].forEach((query) => {
        const currentElement = document.querySelector(query);
        const newElement = nextEpisodeDom.querySelector(query);

        if (currentElement && newElement) {
          currentElement.outerHTML = newElement.outerHTML;
        }
      });

      document.title = nextEpisodeDom.title;
      history.pushState({}, '', nextEpisodeHref);

      // The website code copypasta to try and restore the buttons functionality
      (function repairWebsiteFeatures() {
        document.querySelectorAll(Q.providerChangeBtn).forEach((btn) => {
          btn.addEventListener('click', (ev) => {
            ev.preventDefault();

            const parent = btn.parentElement;
            const linkTarget = parent.getAttribute('data-link-target');
            const hosterTarget = parent.getAttribute('data-external-embed') === 'true';
            const fakePlayer = document.querySelector('.fakePlayer');
            const inSiteWebStream = document.querySelector('.inSiteWebStream');
            const iframe = inSiteWebStream.querySelector('iframe');

            if (hosterTarget) {
              fakePlayer.style.display = 'block';
              inSiteWebStream.style.display = 'inline-block';
              iframe.style.display = 'none';
            } else {
              fakePlayer.style.display = 'none';
              inSiteWebStream.style.display = 'inline-block';
              iframe.src = linkTarget;
              iframe.style.display = 'inline-block';
            }
          });
        });

        const [
          langKey1Elements,
          langKey2Elements,
          langKey3Elements,
        ] = [
          document.querySelectorAll('.hosterSiteVideo ul li[data-lang-key="1"]'),
          document.querySelectorAll('.hosterSiteVideo ul li[data-lang-key="2"]'),
          document.querySelectorAll('.hosterSiteVideo ul li[data-lang-key="3"]'),
        ];

        if (langKey1Elements.length > 0) {
          langKey1Elements.forEach(el => el.style.display = 'block');

          document.querySelectorAll('.hosterSiteVideo ul li:not([data-lang-key="1"])')
            .forEach(el => el.style.display = 'none');
          document.querySelectorAll('.changeLanguageBox img[data-lang-key="1"]')
            .forEach(el => el.classList.add('selectedLanguage'));
          document.querySelectorAll('.changeLanguageBox img:not([data-lang-key="1"])')
            .forEach(el => el.classList.remove('selectedLanguage'));
        }

        else if (langKey3Elements.length > 0) {
          langKey3Elements.forEach(el => el.style.display = 'block');

          document.querySelectorAll('.hosterSiteVideo ul li:not([data-lang-key="3"])')
            .forEach(el => el.style.display = 'none');
          document.querySelectorAll('.changeLanguageBox img[data-lang-key="3"]')
            .forEach(el => el.classList.add('selectedLanguage'));
          document.querySelectorAll('.changeLanguageBox img:not([data-lang-key="3"])')
            .forEach(el => el.classList.remove('selectedLanguage'));
        }

        else if (langKey2Elements.length > 0) {
          langKey2Elements.forEach(el => el.style.display = 'block');

          document.querySelectorAll('.hosterSiteVideo ul li:not([data-lang-key="2"])')
            .forEach(el => el.style.display = 'none');
          document.querySelectorAll('.changeLanguageBox img[data-lang-key="2"]')
            .forEach(el => el.classList.add('selectedLanguage'));
          document.querySelectorAll('.changeLanguageBox img:not([data-lang-key="2"])')
            .forEach(el => el.classList.remove('selectedLanguage'));
        }

        else {
          const changeLanguageBox = document.querySelector('.changeLanguageBox');
          const message = document.createElement('small');

          message.textContent = (
            'Derzeit keine Streams für diese Episode verfügbar. Versuche es später noch einmal oder frage in der Shoutbox etc. nach ;)'
          );

          const lineBreak1 = document.createElement('br');
          const lineBreak2 = document.createElement('br');

          changeLanguageBox.insertAdjacentElement('afterend', message);
          message.insertAdjacentElement('afterend', lineBreak1);
          lineBreak1.insertAdjacentElement('afterend', lineBreak2);
        }
      }());
    }

    unregisterCommlinkListener() {
      if (!this.currentIframeId) return;

      this.commLink.listeners = this.commLink.listeners.filter((listener) => {
        if (listener.sender === this.currentIframeId) {
          listener.intervalObj.stop();
          return false;
        }

        return true;
      });

      this.currentIframeId = null;
    }
  }


  // If context is top scope
  if (window.self === window.top) {
    if (!TOP_SCOPE_DOMAINS.includes(location.hostname)) return;

    const topScopeInterface = new TopScopeInterface();

    // Select video provider based on providers priority
    await (async () => {
      await new Promise((resolve) => {
        if (['complete'].includes(document.readyState)) {
          resolve();
        } else {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        }
      });

      const list = document.querySelector(TopScopeInterface.queries.providersList);
      const links = list.querySelectorAll(TopScopeInterface.queries.episodeDedicatedLink);

      for (const priority of userSettings[USER_SETTINGS_LIST.providersPriority]) {
        const preferredProviderName = VIDEO_PROVIDERS[priority];

        for (const link of links) {
          const providerName = link.querySelector(
            TopScopeInterface.queries.providerName
          ).innerText;

          if (providerName === preferredProviderName) {
            await new Promise(r => setTimeout(r));
            link.parentElement.click();
            return;
          }
        }
      }
    })();

    const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);

    iframe.addEventListener('load', async () => {
      await topScopeInterface.init();

      new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.attributeName === 'src') {
            topScopeInterface.unregisterCommlinkListener();
            topScopeInterface.initCrossFrameConnection();
          }
        });
      }).observe(iframe, { attributes: true });
    }, { once: true });
  }

  // If context is iframe scope
  else {
    const isItVOE = !!document.querySelector('meta[content*="https://voe.sx"]');
    const isItVidoza = !!document.querySelector('meta[content*="Vidoza"]');
    const isItSpeedfiles = !!document.querySelector(
      'meta[content*="https://speedfiles.net"]'
    );

    if (!isItVOE && !isItVidoza && !isItSpeedfiles) return;

    const iframeMessenger = new IframeMessenger();

    for (const { condition, interface: Interface } of [
      { condition: isItVOE, interface: VOEIframeInterface },
      { condition: isItVidoza, interface: VidozaIframeInterface },
      { condition: isItSpeedfiles, interface: SpeedfilesIframeInterface },
    ]) {
      if (!condition) continue;

      // Call early to get rid of ads
      const iframeInterface = new Interface(iframeMessenger);

      window.addEventListener('load', async () => {
        // Give a little bit of a time for the TopScopeInterface to prepare
        await sleep(4);
        await iframeMessenger.initCrossFrameConnection();

        waitForNode(Interface.queries.player, {
          existing: true,
          onceOnly: true,
        }, async (player) => {
          await iframeInterface.init(player);
        });
      }, { once: true });

      break;
    }
  }
}());
