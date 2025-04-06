// ==UserScript==
// @name             Aniworld.to & S.to Autoplay
// @name:de          Autoplay AniWorld & S.to
// @description      Autoplay for Aniworld.to and S.to with lots of functions like Outro skip, Intro skip, persistent volume between providers, remember language, Playback Position Memory and some more
// @description:de   Autoplay für Aniworld.to und S.to mit vielen Funktionen wie Outro-Überspringen, Intro-Überspringen, Sprachspeicherung, Konstante Lautstärke zwischen providern, Wiedergabepositionsspeicher und mehr
// @version          4.8.0
// @match            https://aniworld.to/*
// @match            https://s.to/*
// @match            https://186.2.175.5/
// @match            *://*/*
// @author           AniPlayer
// @namespace        https://greasyfork.org/users/1400386
// @license          GPL-3.0-or-later; https://spdx.org/licenses/GPL-3.0-or-later.html
// @icon             https://i.imgur.com/CEZGcX6.png
// @require          https://cdn.jsdelivr.net/npm/notiflix@3.2.8/dist/notiflix-aio-3.2.8.min.js#sha512-XsGxeeCSQNP2+WGCUScwIO6sznCBBee4we6n8n6yoFgB+shnCXJZCY2snFqu+fgIbPd79ldRR1/5zQFMUQVSpg==
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
 * Hi! This script works best with Violentmonkey, as using other managers
 * causes unexpected bugs. Please, consider installing Violentmonkey,
 * you can use it along with your current script manager.
 *
 * Don't change (or even resave) anything here because
 * doing so in Tampermonkey will turn off the script updates.
 * Not sure about other script managers.
 * This can be restored in settings, but it might be hard to find,
 * so it's better to reinstall the script if you're not sure.
*/

/* jshint esversion: 11 */
/* global Notiflix, Tweakpane, keyboardJS */

(async function() {
  'use strict';

  const VIOLENTMONKEY_WARNING = [
    `${GM_info.script.name} warning`, 'This script works best with Violentmonkey, as using other script managers causes unexpected bugs. Please, consider installing Violentmonkey, you can use it along with your current script manager. This message won\'t show up again'
  ];

  // Domains list the script should work for
  const TOP_SCOPE_DOMAINS = [
    'aniworld.to',
    's.to',
    '186.2.175.5',
  ];

  const VIDEO_PROVIDERS_MAP = {
    LoadX: 'LoadX',
    SpeedFiles: 'SpeedFiles',
    Vidoza: 'Vidoza',
    VOE: 'VOE',
  };

  // Providers supported by the script, ordered by a default priority
  const VIDEO_PROVIDERS = [
    VIDEO_PROVIDERS_MAP.LoadX,
    VIDEO_PROVIDERS_MAP.VOE,
    VIDEO_PROVIDERS_MAP.SpeedFiles,
    VIDEO_PROVIDERS_MAP.Vidoza,
  ];

  const CORE_SETTINGS_MAP = {
    currentLargeSkipSizeS: 'currentLargeSkipSizeS',
    currentOutroSkipThresholdS: 'currentOutroSkipThresholdS',
    isAutoplayEnabled: 'isAutoplayEnabled',
    isMuted: 'isMuted',
    persistentVolumeLvl: 'persistentVolumeLvl',
    providersPriority: 'providersPriority',
    videoLanguagePreferredID: 'videoLanguagePreferredID',
  };

  // Note that defaults are applied only on a very first run of the script
  const CORE_SETTINGS_DEFAULTS = {
    // Default value doesn't matter because it fallbacks to
    // ADVANCED_SETTINGS_DEFAULTS.defaultLargeSkipSizeS anyway
    [CORE_SETTINGS_MAP.currentLargeSkipSizeS]: 87,
    [CORE_SETTINGS_MAP.currentOutroSkipThresholdS]: 90, // same logic

    [CORE_SETTINGS_MAP.isAutoplayEnabled]: false,
    [CORE_SETTINGS_MAP.isMuted]: false,
    [CORE_SETTINGS_MAP.persistentVolumeLvl]: 0.5,
    [CORE_SETTINGS_MAP.providersPriority]: (
      Array.from({ length: VIDEO_PROVIDERS.length }, (_, i) => i)
    ),
    [CORE_SETTINGS_MAP.videoLanguagePreferredID]: '1',
  };

  const HOTKEYS_SETTINGS_MAP = {
    fastBackward: 'fastBackward',
    fastForward: 'fastForward',
    fullscreen: 'fullscreen',
    largeSkip: 'largeSkip',
  };

  // Note that defaults are applied only on a very first run of the script
  const HOTKEYS_SETTINGS_DEFAULTS = {
    [HOTKEYS_SETTINGS_MAP.fastBackward]: 'left',
    [HOTKEYS_SETTINGS_MAP.fastForward]: 'right',
    [HOTKEYS_SETTINGS_MAP.fullscreen]: 'f',
    [HOTKEYS_SETTINGS_MAP.largeSkip]: 'v',
  };

  const MAIN_SETTINGS_MAP = {
    overrideDoubletapBehavior: 'overrideDoubletapBehavior',
    playbackPositionMemory: 'playbackPositionMemory',
    shouldAutoplayMuted: 'shouldAutoplayMuted',
  };

  // Note that defaults are applied only on a very first run of the script
  const MAIN_SETTINGS_DEFAULTS = {
    [MAIN_SETTINGS_MAP.overrideDoubletapBehavior]: true,
    [MAIN_SETTINGS_MAP.playbackPositionMemory]: true,
    [MAIN_SETTINGS_MAP.shouldAutoplayMuted]: true,
  };

  const ADVANCED_SETTINGS_MAP = {
    commlinkPollingIntervalMs: 'commlinkPollingIntervalMs',
    corsProxy: 'corsProxy',
    defaultLargeSkipSizeS: 'defaultLargeSkipSizeS',
    defaultOutroSkipThresholdS: 'defaultOutroSkipThresholdS',
    doubletapDistanceThresholdPx: 'doubletapDistanceThresholdPx',
    doubletapTimingThresholdMs: 'doubletapTimingThresholdMs',
    fastForwardSizeS: 'fastForwardSizeS',
    largeSkipCooldownMs: 'largeSkipCooldownMs',
    markWatchedAfterS: 'markWatchedAfterS',
    playOnLargeSkip: 'playOnLargeSkip',
    playbackPositionExpirationDays: 'playbackPositionExpirationDays',
  };

  // Note that defaults are applied only on a very first run of the script
  const ADVANCED_SETTINGS_DEFAULTS = {
    [ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs]: 40,
    [ADVANCED_SETTINGS_MAP.corsProxy]: 'https://aniworld-to-cors-proxy.fly.dev/',
    [ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]: 87,
    [ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]: 90,
    [ADVANCED_SETTINGS_MAP.doubletapDistanceThresholdPx]: 50,
    [ADVANCED_SETTINGS_MAP.doubletapTimingThresholdMs]: 300,
    [ADVANCED_SETTINGS_MAP.fastForwardSizeS]: 10,
    [ADVANCED_SETTINGS_MAP.largeSkipCooldownMs]: 300,
    [ADVANCED_SETTINGS_MAP.markWatchedAfterS]: 0,
    [ADVANCED_SETTINGS_MAP.playOnLargeSkip]: true,
    [ADVANCED_SETTINGS_MAP.playbackPositionExpirationDays]: 30,
  };

  const IS_MOBILE = (
    /Mobi|Android|iP(hone|[oa]d)/i.test(navigator.userAgent)
  );

  const IS_SAFARI = (
    navigator.userAgent.indexOf('Safari') > -1 && !/Chrome|CriOS/.test(navigator.userAgent)
  );

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

  const advancedSettings = new DataStore('advancedSettings', ADVANCED_SETTINGS_DEFAULTS);
  const coreSettings = new DataStore('coreSettings', CORE_SETTINGS_DEFAULTS);
  const hotkeysSettings = new DataStore('hotkeysSettings', HOTKEYS_SETTINGS_DEFAULTS);
  const mainSettings = new DataStore('mainSettings', MAIN_SETTINGS_DEFAULTS);

  [
    [advancedSettings, ADVANCED_SETTINGS_DEFAULTS],
    [coreSettings, CORE_SETTINGS_DEFAULTS],
    [hotkeysSettings, HOTKEYS_SETTINGS_DEFAULTS],
    [mainSettings, MAIN_SETTINGS_DEFAULTS]
  ].forEach(([settings, defaults]) => {
    Object.entries(defaults).forEach(([key, value]) => (settings[key] ??= value));
  });

  if (
    coreSettings[CORE_SETTINGS_MAP.providersPriority].length !== VIDEO_PROVIDERS.length
  ) {
    coreSettings[CORE_SETTINGS_MAP.providersPriority] = [
      ...CORE_SETTINGS_DEFAULTS[CORE_SETTINGS_MAP.providersPriority]
    ];
  }

  // -------------------------------------- /utils ---------------------------------------------

  const Notiflixx = (() => {
    const notifyDefaultOptions = {
      closeButton: true,
      messageMaxLength: 500,
      plainText: false,
      position: 'left-top',
      zindex: 3222222,
    };

    const reportDefaultOptions = {
      titleMaxLength: 100,
      zindex: 3222223,
    };

    const reportDefaultCallback = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };

    return {
      notify: {
        failure(message, customOptions = {}) {
          Notiflix.Notify.failure(message, {
            ...notifyDefaultOptions,
            ...customOptions,
          });
        },

        warning(message, customOptions = {}) {
          Notiflix.Notify.warning(message, {
            ...notifyDefaultOptions,
            ...customOptions,
          });
        },
      },

      report: {
        info(titleText, messageText, btnText, customOptions = {}) {
          document.body.style.paddingRight = (
            `${window.innerWidth - document.documentElement.clientWidth}px`
          );
          document.body.style.overflow = 'hidden';

          Notiflix.Report.info(titleText, messageText, btnText, reportDefaultCallback, {
            ...reportDefaultOptions,
            ...customOptions,
          });

          const closeBtn = document.querySelector('a#NXReportButton');

          closeBtn.style.background = '#b2b2b2';
          closeBtn.style.pointerEvents = 'none';

          setTimeout(() => {
            closeBtn.style.background = '#26c0d3';
            closeBtn.style.pointerEvents = '';
          }, 2000);
        },

        warning(titleText, messageText, btnText, customOptions = {}) {
          document.body.style.paddingRight = (
            `${window.innerWidth - document.documentElement.clientWidth}px`
          );
          document.body.style.overflow = 'hidden';

          Notiflix.Report.warning(titleText, messageText, btnText, reportDefaultCallback, {
            ...reportDefaultOptions,
            ...customOptions,
          });
        },
      },
    };
  })();

  function detectDoubletap(element, callback, {
    maxIntervalMs = 300,
    tapsDistanceThresholdPx = 50,
    validPointerTypes = ['pen', 'touch'],
  } = {
    maxIntervalMs: 300,
    tapsDistanceThresholdPx: 50,
    validPointerTypes: ['pen', 'touch'],
  }) {
    let lastTapTime = 0;
    let lastTapX = 0;
    let lastTapY = 0;
    let tapped = false;

    element.addEventListener('pointerdown', (ev) => {
      if (!validPointerTypes.includes(ev.pointerType)) return;

      const currentTime = Date.now();
      const tapInterval = currentTime - lastTapTime;

      const distance = Math.sqrt(
        Math.pow(ev.clientX - lastTapX, 2) +
        Math.pow(ev.clientY - lastTapY, 2)
      );

      if (
        tapped &&
        tapInterval < maxIntervalMs &&
        distance <= tapsDistanceThresholdPx
      ) {
        callback(ev);
        tapped = false;
        lastTapTime = 0;
        lastTapX = 0;
        lastTapY = 0;
      } else {
        tapped = true;
        lastTapTime = currentTime;
        lastTapX = ev.clientX;
        lastTapY = ev.clientY;
      }
    });
  }

  function detectHold(element, callback, {
    holdTimeMs = 700,
    validPointerTypes = ['mouse', 'pen', 'touch'],
  } = {
    holdTimeMs: 700,
    validPointerTypes: ['mouse', 'pen', 'touch'],
  }) {
    let timer;

    const clearHold = () => clearTimeout(timer);
    const startHold = (ev) => {
      if (validPointerTypes.includes(ev.pointerType)) {
        timer = setTimeout(() => callback(), holdTimeMs);
      }
    };

    element.addEventListener('pointerdown', startHold);
    element.addEventListener('pointerup', clearHold);
    element.addEventListener('pointercancel', clearHold);
    element.addEventListener('pointerout', clearHold);
    element.addEventListener('pointerleave', clearHold);
  }

  function isEmbedded() {
    try {
      return window.top !== window.self;
    } catch {
      return true;
    }
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

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

  function waitForElement(query, {
    callbackOnTimeout = false,
    existing = false,
    onceOnly = false,
    rootElement = document.documentElement,
    timeout,

    // "attributes" prop is not supported
    observerOptions = {
      childList: true,
      subtree: true,
    },
  }, callback) {
    if (!query) throw new Error('Query is needed');
    if (!callback) throw new Error('Callback is needed');

    const handledElements = new WeakSet();
    const existingElements = rootElement.querySelectorAll(query);
    let timeoutId = null;

    if (existingElements.length) {
      // Mark all as handled for a proper work when `existing` is false
      // to ignore them later on
      for (const node of existingElements) {
        handledElements.add(node);
      }

      if (existing) {
        if (onceOnly) {
          try {
            callback(existingElements[0]);
          } catch (e) {
            console.error(e);
          }

          return;
        } else {
          for (const node of existingElements) {
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
      for (const node of rootElement.querySelectorAll(query)) {
        if (handledElements.has(node)) continue;

        handledElements.add(node);

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

    observer.observe(rootElement, {
      attributes: false,
      childList: observerOptions.childList || false,
      subtree: observerOptions.subtree || false,
    });

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

    return observer;
  }

  async function waitForUserInteraction() {
    return new Promise((resolve) => {
      const handler = () => {
        document.removeEventListener('pointerup', handler);
        document.removeEventListener('keydown', handler);

        resolve();
      };

      document.addEventListener('pointerup', handler, { once: true });
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
    }

    static get messages() {
      return {
        AUTOPLAY_NEXT: 'AUTOPLAY_NEXT',
        REQUEST_CURRENT_FRANCHISE_DATA: 'REQUEST_CURRENT_FRANCHISE_DATA',
        REQUEST_FULLSCREEN_STATE: 'REQUEST_FULLSCREEN_STATE',
        MARK_CURRENT_VIDEO_WATCHED: 'MARK_CURRENT_VIDEO_WATCHED',
        OPEN_HOTKEYS_GUIDE: 'OPEN_HOTKEYS_GUIDE',
        TOGGLE_FULLSCREEN: 'TOGGLE_FULLSCREEN',
        TOP_NOTIFLIX_REPORT_INFO: 'TOP_NOTIFLIX_REPORT_INFO',
        UPDATE_CORE_SETTINGS: 'UPDATE_CORE_SETTINGS',
      };
    }

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
      GM_setValue('unboundIframeId', iframeId);

      const topScopeId = await topScopeIdPromise;

      if (!iframeId || !topScopeId) throw new Error('Something went wrong');

      this.topScopeId = topScopeId;
      this.commLink = new CommLinkHandler(iframeId, {
        silentMode: true,
        statusCheckInterval: advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs],
      });

      this.commLink.registerSendCommand(IframeMessenger.messages.AUTOPLAY_NEXT);
      this.commLink.registerSendCommand(IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA);
      this.commLink.registerSendCommand(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
      this.commLink.registerSendCommand(IframeMessenger.messages.MARK_CURRENT_VIDEO_WATCHED);
      this.commLink.registerSendCommand(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
      this.commLink.registerSendCommand(IframeMessenger.messages.TOGGLE_FULLSCREEN);
      this.commLink.registerSendCommand(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO);
      this.commLink.registerSendCommand(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
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
      this.currentFranchiseId = null;
      this.currentVideoId = null;
      this.ignoreMissingFranchiseOnce = true;
      this.isInFullscreen = null;
      this.messenger = messenger;

      coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = (
        advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]
      );

      coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = (
        advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]
      );
    }

    static get franchiseSpecificDataGMPrefix() {
      return 'franchiseSpecificData_';
    }

    static get playbackPositionsGMPrefix() {
      return 'playbackTimestamp_';
    }

    // It is better not to be async
    handleTopScopeMessages(packet) {
      (async function() {
        try {
          switch (packet.command) {
            case TopScopeInterface.messages.CURRENT_FRANCHISE_DATA: {
              // At least one value is going to be present
              this.currentVideoId = packet.data.currentVideoId || null;

              if (packet.data.currentFranchiseId) {
                this.currentFranchiseId = packet.data.currentFranchiseId;

                const { largeSkipSizeS, outroSkipThresholdS } = GM_getValue(
                  `${IframeInterface.franchiseSpecificDataGMPrefix}${this.currentFranchiseId}`
                ) || {};

                if (isNumeric(largeSkipSizeS)) {
                  coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = largeSkipSizeS;
                } else {
                  coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = (
                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]
                  );
                }

                if (isNumeric(outroSkipThresholdS)) {
                  coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = outroSkipThresholdS;
                } else {
                  coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = (
                    advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]
                  );
                }

                this.settingsPane?.refresh();
                this.ignoreMissingFranchiseOnce = false;
              }

              break;
            }

            case TopScopeInterface.messages.FULLSCREEN_STATE: {
              if (IS_SAFARI) break;

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

      this.messenger.sendMessage(IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA);

      await this.preparePlayer(player);
    }


    createAutoplayButton() {
      const button = document.createElement('button');
      const toggleContainer = document.createElement('div');
      const toggleDot = document.createElement('div');
      const isAutoplayEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];
      let lastClickTime = 0;

      button.addEventListener('click', () => {
        const now = Date.now();

        // Prevent double-clicks unwanted behavior
        if (now - lastClickTime < 300) return;

        lastClickTime = now;

        if (!GM_getValue('firstRunTextWasShown')) {
          GM_setValue('firstRunTextWasShown', true);

          this.messenger.sendMessage(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO, {
            args: [
              `${GM_info.script.name} info`,
              `${IS_MOBILE ? 'Hold-release' : 'Right click'} the toggle button to open autoplay settings. ${IS_MOBILE ? '' : `Press "${hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip]}" when an intro starts to skip it. `}Fullscreen is scrollable, allowing to switch providers on the go`,
              'Okay',
            ],
          });
        }

        const wasEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];

        coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled] = !wasEnabled;

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
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 50%;
          border: none;
          background: none;
          cursor: pointer;
          top: 0;
          left: 0;
          transition: all 0.2s ease;
          user-select: none;
          -webkit-user-select: none;
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
        this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
      });

      GM_addStyle([
        // Main container
        `
          .tp-dfwv {
            --tp-font-family: sans-serif;
            width: 400px;
            max-width: 100%;
            top: 0;
            right: 0;
            z-index: 99999;
          }
        `,

        // A container one level below the main one
        `
          .tp-rotv {
            max-height: 85vh;
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

        // Checkboxes
        `
          .tp-ckbv_w {
            width: 80%;
            margin: auto;
          }
        `,
      ].join(' '));

      // Stop leaking events to the player
      (['keydown', 'keyup', 'keypress'].forEach(event =>
        pane.element.addEventListener(event, (e) => e.stopPropagation())
      ));

      const assignTooltip = (text, object) => {
        object.element.title = text;

        if (
          object.element.firstElementChild.matches &&
          object.element.firstElementChild.matches('div.tp-lblv_l')
        ) {
          object.element.firstElementChild.addEventListener('click', (ev) => {
            if (!['pen', 'touch'].includes(ev.pointerType)) return;

            this.messenger.sendMessage(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO, {
              args: [object.element.firstElementChild.innerText, text, 'Close', {
                backOverlayClickToClose: true,
              }],
            });
          });
        }
      };

      const tabs = pane.addTab({
        pages: [
          { title: 'Preferences' },
          { title: 'Advanced' },
        ],
      });

      const mainTab = tabs.pages[0];
      const advancedTab = tabs.pages[1];

      const mainTabApplyBtn = mainTab.addButton({
        disabled: true,
        title: 'Apply',
      });

      const advancedTabApplyBtn = advancedTab.addButton({
        disabled: true,
        title: 'Apply',
      });

      for (const btn of [mainTabApplyBtn, advancedTabApplyBtn]) {
        btn.on('click', () => {
          setTimeout(() => {
            mainTabApplyBtn.disabled = true;
            advancedTabApplyBtn.disabled = true;
          });
        });
      }

      pane.element.addEventListener('click', () => {
        mainTabApplyBtn.disabled = false;
        advancedTabApplyBtn.disabled = false;
      });

      const priorityFolder = mainTab.addFolder({ title: 'Providers priority' });

      (() => {
        const priorities = coreSettings[CORE_SETTINGS_MAP.providersPriority];
        const buttons = [];

        priorities.forEach((priority, index) => {
          const button = priorityFolder.addButton({
            title: `⬆ ${index + 1}) ${VIDEO_PROVIDERS[priority]}`,
          });

          button.on('click', () => {
            if (index > 0) {
              [priorities[index], priorities[index - 1]] = (
                [priorities[index - 1], priorities[index]]
              );

              coreSettings[CORE_SETTINGS_MAP.providersPriority] = priorities;

              priorities.forEach((priority, index) => {
                buttons[index].title = `⬆ ${index + 1}) ${VIDEO_PROVIDERS[priority]}`;
              });

              this.messenger.sendMessage(IframeMessenger.messages.UPDATE_CORE_SETTINGS);
            }
          });

          buttons.push(button);
        });
      })();

      const miscellaneousMainFolder = mainTab.addFolder({ title: 'Miscellaneous' });

      miscellaneousMainFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (
          typeof ev.value === 'string' &&
          MAIN_SETTINGS_MAP[ev.presetKey]
        ) {
          mainSettings[ev.presetKey] = mainSettings[ev.presetKey].trim();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Seamless autoplay is not always available due to browser restrictions. This setting makes autoplay muted which in turn makes autoplay to be always available (autoplay should be enabled for this to work), but instead it requires user input (click or keypress) to unmute. Keypress works only if a video player is in focus'
      ), miscellaneousMainFolder.addInput(mainSettings,
        MAIN_SETTINGS_MAP.shouldAutoplayMuted, {
          label: 'Persistent muted autoplay',
        },
      ));

      assignTooltip((
        'Saves the last playback position and restores it whenever the video player is reloaded'
      ), miscellaneousMainFolder.addInput(mainSettings,
        MAIN_SETTINGS_MAP.playbackPositionMemory, {
          label: 'Playback position memory',
        },
      ));

      assignTooltip((
        'If enabled, default double-tap behavior (if any) is being overrided: double-tap right/left side of a video player to fast forward/rewind. Double-tap in a middle applies an intro skip. Page reload is required for this setting to take effect!'
      ), miscellaneousMainFolder.addInput(mainSettings,
        MAIN_SETTINGS_MAP.overrideDoubletapBehavior, {
          label: 'Override double-tap behavior*',
        },
      ));

      (() => {
        for (const {
          settingKey,
          errName,
          inputOptions,
          tooltip,
        } of [
          {
            settingKey: CORE_SETTINGS_MAP.currentLargeSkipSizeS,
            errName: 'Intro skip size',
            inputOptions: {
              step: 1,
              min: 0,
              label: 'Intro skip size, sec',
            },
            tooltip: (
              'Intro skip size. This is linked to the title and should stay the same across episodes'
            ),
          },

          {
            settingKey: CORE_SETTINGS_MAP.currentOutroSkipThresholdS,
            errName: 'Outro skip threshold',
            inputOptions: {
              step: 1,
              min: 0.5,
              label: 'Outro skip threshold, sec',
            },
            tooltip: (
              'Autoplay triggers when the video player has fewer than THIS number of seconds left to play. It is linked to the title and should stay the same across episodes'
            ),
          },
        ]) {
          const input = (
            miscellaneousMainFolder.addInput(coreSettings, settingKey, inputOptions)
          );
    
          assignTooltip((tooltip), input);
    
          input.on('change', (ev) => {
            if (!ev.last) return;
    
            if (!this.currentFranchiseId) {
              // This is needed because 'change' event is being triggered by pane.refresh()
              // that is called from CURRENT_FRANCHISE_DATA message handler
              if (this.ignoreMissingFranchiseOnce) {
                this.ignoreMissingFranchiseOnce = false;
                return;
              }
    
              Notiflixx.notify.failure(
                `${GM_info.script.name}: There was an error when trying to save the "${errName}". The value would reset upon player reload. Please, report the bug, with a mention of a URL of the page you're currently on`
              );
    
              return;
            }
    
            GM_setValue((
              `${IframeInterface.franchiseSpecificDataGMPrefix}${this.currentFranchiseId}`
            ), {
              largeSkipSizeS: coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS],
              outroSkipThresholdS: coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS],
            });
          });
        }
      })();

      miscellaneousMainFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        mainSettings.update(MAIN_SETTINGS_DEFAULTS);

        coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS] = (
          advancedSettings[ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS]
        );

        coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS] = (
          advancedSettings[ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS]
        );

        this.currentFranchiseId && GM_deleteValue(
          `${IframeInterface.franchiseSpecificDataGMPrefix}${this.currentFranchiseId}`
        );

        pane.refresh();
      });

      const hotkeysFolder = advancedTab.addFolder({ title: 'Hotkeys', expanded: !IS_MOBILE });

      hotkeysFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (
          typeof ev.value === 'string' &&
          HOTKEYS_SETTINGS_MAP[ev.presetKey]
        ) {
          hotkeysSettings[ev.presetKey] = hotkeysSettings[ev.presetKey].trim().toLowerCase();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Hotkey for a fast backward. Page reload is required for this setting to take effect!'
      ), hotkeysFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_MAP.fastBackward, {
          label: 'Fast backward*',
        },
      ));

      assignTooltip((
        'Hotkey for a fast forward. Page reload is required for this setting to take effect!'
      ), hotkeysFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_MAP.fastForward, {
          label: 'Fast forward*',
        },
      ));

      assignTooltip((
        'Hotkey for a fullscreen mode toggle. Page reload is required for this setting to take effect!'
      ), hotkeysFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_MAP.fullscreen, {
          label: 'Fullscreen*',
        },
      ));

      assignTooltip((
        'Hotkey for an intro skip. Page reload is required for this setting to take effect!'
      ), hotkeysFolder.addInput(hotkeysSettings,
        HOTKEYS_SETTINGS_MAP.largeSkip, {
          label: 'Intro skip*',
        },
      ));

      const hotkeysGuideBtn = hotkeysFolder.addButton({ title: 'Hotkeys guide' });

      hotkeysGuideBtn.on('click', () => {
        this.messenger.sendMessage(IframeMessenger.messages.OPEN_HOTKEYS_GUIDE);
      });

      hotkeysFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        hotkeysSettings.update(HOTKEYS_SETTINGS_DEFAULTS);
        pane.refresh();
      });

      const miscellaneousAdvancedFolder = advancedTab.addFolder({ title: 'Miscellaneous' });

      miscellaneousAdvancedFolder.on('change', (ev) => {
        if (!ev.last) return;

        if (
          typeof ev.value === 'string' &&
          ADVANCED_SETTINGS_MAP[ev.presetKey]
        ) {
          advancedSettings[ev.presetKey] = advancedSettings[ev.presetKey].trim();
          ev.target.refresh();
        }
      });

      assignTooltip((
        'Default intro skip size'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.defaultLargeSkipSizeS, {
          step: 1,
          min: 0,
          label: 'Default intro skip size, sec',
        },
      ));

      assignTooltip((
        'Default outro skip threshold'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.defaultOutroSkipThresholdS, {
          step: 1,
          min: 0.5,
          label: 'Default outro skip threshold, sec',
        },
      ));

      assignTooltip((
        'Number of seconds of approximate playback time after which a video is being marked as watched. Set to 0 to disable and mark only by a triggered autoplay'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.markWatchedAfterS, {
          step: 1,
          min: 0,
          label: 'Mark watched after, sec',
        },
      ));

      assignTooltip((
        'Number of seconds to skip or rewind using gestures or pressing a corresponding hotkeys'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.fastForwardSizeS, {
          step: 1,
          min: 0,
          label: 'Fast forward size, sec',
        },
      ));

      assignTooltip((
        'Intro skip hotkey also starts playback'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.playOnLargeSkip, {
          label: 'Play on intro skip',
        },
      ));

      assignTooltip((
        'Adjusts the maximum time (in milliseconds) allowed between two taps for them to be recognized as a double-tap. A lower value requires faster taps, while a higher value allows more delay. Page reload is required for this setting to take effect!'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.doubletapTimingThresholdMs, {
          step: 20,
          min: 100,
          max: 1000,
          label: 'Double-tap timing threshold, ms*',
        },
      ));

      assignTooltip((
        'Defines the maximum distance (in pixels) between two taps for them to be considered a double-tap. A smaller value requires taps to be closer together, while a larger value allows more separation. Page reload is required for this setting to take effect!'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.doubletapDistanceThresholdPx, {
          step: 10,
          min: 10,
          max: 5000,
          label: 'Double-tap distance threshold, px*',
        },
      ));

      assignTooltip((
        'Cooldown for an intro skip hotkey, to prevent an accidental double skip. Page reload is required for this setting to take effect!'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.largeSkipCooldownMs, {
          step: 1,
          min: 0,
          label: 'Intro skip cooldown, ms*',
        },
      ));

      assignTooltip((
        'How many DAYS need to pass before a playback position is removed from the memory'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.playbackPositionExpirationDays, {
          step: 1,
          min: 1,
          max: 365,
          label: 'Playback position expiration',
        },
      ));

      assignTooltip((
        'To keep possible VOE-to-VOE unmuted autoplay working, the script needs to route a very small number of web requests through its own proxy server. Leave the input empty to disable this or set your own proxy'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.corsProxy, {
          label: 'CORS proxy',
        },
      ));

      assignTooltip((
        'Reflects messaging responsiveness between a player and a top scope. Might impact CPU usage if set too low. 40 should be enough. Page reload is required for this setting to take effect!'
      ), miscellaneousAdvancedFolder.addInput(advancedSettings,
        ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs, {
          step: 10,
          min: 10,
          max: 500,
          label: 'Commlink polling interval, ms*',
        },
      ));

      miscellaneousAdvancedFolder.addButton({
        title: 'Reset to defaults',
      }).on('click', () => {
        advancedSettings.update(ADVANCED_SETTINGS_DEFAULTS);
        pane.refresh();
      });

      return pane;
    }

    async handleAutoplay(player) {
      if (!coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled]) return;

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

            if (mainSettings[MAIN_SETTINGS_MAP.shouldAutoplayMuted] && !muteWasApplied) {
              player.muted = true;
              muteWasApplied = true;

              // Restore setting altered by forced mute. See this.setupPersistentVolume()
              setTimeout(() => (coreSettings[CORE_SETTINGS_MAP.isMuted] = false));

              // Should not be awaited
              (async () => {
                await waitForUserInteraction();

                // If interaction was unmute button, try to not overtake it
                // because it might result in mute -> unmute -> mute again.
                // Different players require a different delay
                await sleep(100);

                if (player.muted) player.muted = false;
              })();
            }
          }

          // Try this for everything else, for now
          else {
            await sleep(200);
          }

          throw e;
        }
      };

      const startTime = Date.now();
      let lastError = null;

      while ((Date.now() - startTime) < (10 * 1000)) {
        try {
          return await playOrFix();
        } catch (e) {
          lastError = e;
        }
      }

      throw lastError;
    }

    setupDoubletapBehavior(player, doubletapTarget = player) {
      if (!mainSettings[MAIN_SETTINGS_MAP.overrideDoubletapBehavior]) return;

      detectDoubletap(doubletapTarget, (ev) => {
        const xViewport = ev.clientX;
        const rect = ev.target.getBoundingClientRect();

        // Get X relative to the target just in case.
        // It is not really needed since the player takes the whole size of an iframe
        const xTarget = xViewport - rect.left;

        if (xTarget < rect.width * 0.35) {
          player.currentTime -= advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
        } else if (xTarget > rect.width - (rect.width * 0.35)) {
          player.currentTime += advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
        } else {
          if (coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS]) {
            player.currentTime += coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS];
          }
        }
      }, {
        maxIntervalMs: advancedSettings[ADVANCED_SETTINGS_MAP.doubletapTimingThresholdMs],
        tapsDistanceThresholdPx: (
          advancedSettings[ADVANCED_SETTINGS_MAP.doubletapDistanceThresholdPx]
        ),
      });
    }

    setupHotkeys(player) {
      keyboardJS.bind('space', () => player.paused ? player.play() : player.pause());

      if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastForward], () => {
          if (advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS]) {
            player.currentTime += advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
          }
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.fastBackward], () => {
          if (advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS]) {
            player.currentTime -= advancedSettings[ADVANCED_SETTINGS_MAP.fastForwardSizeS];
          }
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.fullscreen]) {
        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.fullscreen], (ev) => {
          ev.preventRepeat();
          this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
        });
      }

      if (hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip]) {
        const cooldownTime = advancedSettings[ADVANCED_SETTINGS_MAP.largeSkipCooldownMs];
        let lastSkipTime = 0;

        keyboardJS.bind(hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip], () => {
          if (coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS]) {
            const now = Date.now();

            if (now - lastSkipTime < cooldownTime) return;

            lastSkipTime = now;

            player.currentTime += coreSettings[CORE_SETTINGS_MAP.currentLargeSkipSizeS];
          }

          if (advancedSettings[ADVANCED_SETTINGS_MAP.playOnLargeSkip]) {
            player.play();
          }
        });
      }
    }

    setupOutroSkipHandling(player) {
      let outroHasBeenReached = false;

      setInterval(() => {
        if (outroHasBeenReached || !coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled]) return;

        const timeLeft = player.duration - player.currentTime;

        if (timeLeft <= coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS]) {
          outroHasBeenReached = true;
          this.messenger.sendMessage(IframeMessenger.messages.AUTOPLAY_NEXT);
        }
      }, 250);
    }

    setupPersistentVolume(player) {
      player.muted = coreSettings[CORE_SETTINGS_MAP.isMuted];
      player.volume = coreSettings[CORE_SETTINGS_MAP.persistentVolumeLvl];

      player.addEventListener('volumechange', () => {
        coreSettings[CORE_SETTINGS_MAP.isMuted] = player.muted;
        coreSettings[CORE_SETTINGS_MAP.persistentVolumeLvl] = player.volume;
      });
    }

    setupWatchedStateLabeling(player) {
      const intervalMs = 250;
      let approximatePlayTimeS = 0;
      let currentVideoWasWatched = false;
      let lastPlayerTime = player.currentTime;

      setInterval(() => {
        if (player.currentTime === lastPlayerTime) return;

        lastPlayerTime = player.currentTime;
        approximatePlayTimeS += intervalMs / 1000;

        if (
          !currentVideoWasWatched &&
          advancedSettings[ADVANCED_SETTINGS_MAP.markWatchedAfterS] &&
          approximatePlayTimeS >= advancedSettings[ADVANCED_SETTINGS_MAP.markWatchedAfterS]
        ) {
          currentVideoWasWatched = true;
          this.messenger.sendMessage(IframeMessenger.messages.MARK_CURRENT_VIDEO_WATCHED);
        }
      }, intervalMs);
    }

    async setupVideoPlaybackPositionMemory(player) {
      const self = this;

      await (async function waitForVideoId(start = Date.now()) {
        if (!self.currentVideoId) {
          if ((Date.now() - start) > (10 * 1000)) {
            throw new Error('Video ID didn\'t arrive in time');
          }

          await sleep();

          return waitForVideoId(start);
        }
      }());

      // This has to wait indefinitely because players like VOE do not have the value
      // until the play button has been pressed or an autoplay has been triggered
      await (async function waitForVideoDuration() {
        if (!player.duration) {
          await sleep();
          return waitForVideoDuration();
        }
      }());

      const gmKeyPrefix = IframeInterface.playbackPositionsGMPrefix;
      const timestampData = GM_getValue(`${gmKeyPrefix}${this.currentVideoId}`, {});

      if (timestampData.value) {
        const elapsedTime = Date.now() - timestampData.updateDate;
        const expirationThreshold = advancedSettings[
          ADVANCED_SETTINGS_MAP.playbackPositionExpirationDays
        ] * 24 * 60 * 60 * 1000;

        if (elapsedTime < expirationThreshold) {
          const outroSkipThresholdS = coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS];
          const potentialTimeLeftToPlay = player.duration - timestampData.value;

          // Skip saved playback position if it's in a range of (outroSkipThresholdS + 20)
          if (potentialTimeLeftToPlay > (outroSkipThresholdS + 20)) {
            player.currentTime = timestampData.value;
          }
        }
      }

      let lastCheckedTime = player.currentTime;

      setInterval(() => {
        if (
          !mainSettings[MAIN_SETTINGS_MAP.playbackPositionMemory] ||
          (player.currentTime === lastCheckedTime)
        ) return;

        lastCheckedTime = player.currentTime;

        GM_setValue(`${gmKeyPrefix}${this.currentVideoId}`, {
          value: lastCheckedTime,
          updateDate: Date.now(),
        });
      }, 1000);
    }
  }

  class LoadXIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      // Remove on-screen controls to avoid double-tap conflicts
      if (mainSettings[MAIN_SETTINGS_MAP.overrideDoubletapBehavior]) {
        waitForElement([
          'div[class*=display-icon-rewind], div[class*=display-icon-next]',
        ].join(', '), {
          existing: true,
        }, (controls) => controls.remove());
      }

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (
            // Get rid of ads on any LMB click
            (['click', 'mousedown'].includes(type) && this === document)
            ||
            // Intercept original hotkeys to avoid conflicts with the script hotkeys
            (type === 'keydown' && this.matches && this.matches('div#player'))
          ) {
            return;
          }

          // Intercept double-tap to fullscreen handler
          if (
            IS_MOBILE &&
            mainSettings[MAIN_SETTINGS_MAP.overrideDoubletapBehavior] &&
            (type === 'click' && this.matches && this.matches('div#player > div > div.jw-media'))
          ) {
            let timerId = null;

            return originalAddEventListener.call(this, type, () => {
              clearTimeout(timerId);

              const playerContainer = document.querySelector('div#player');

              if (playerContainer.classList.contains('jw-flag-user-inactive')) {
                playerContainer.classList.remove('jw-flag-user-inactive');

                timerId = setTimeout(() => {
                  playerContainer.classList.add('jw-flag-user-inactive');
                }, 2000);
              } else {
                playerContainer.classList.add('jw-flag-user-inactive');
              }
            }, options);
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static get queries() {
      return {
        fullscreenBtn: 'div.jw-tooltip-fullscreen',
        player: 'video.jw-video',
      };
    }

    async preparePlayer(player) {
      this.setupDoubletapBehavior(player);
      this.setupHotkeys(player);
      this.setupOutroSkipHandling(player);
      this.setupWatchedStateLabeling(player);
      this.setupVideoPlaybackPositionMemory(player);

      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume

      // Attach autoplay button and change fullscreen button behavior...
      waitForElement(LoadXIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        fsBtn = fsBtn.parentElement;

        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.settingsPane = this.createSettingsPane();

        autoplayBtn.style.width = '44px';
        autoplayBtn.style.height = '44px';

        fsBtn.before(autoplayBtn);

        IS_SAFARI ? fsBtn.remove() : fsBtn.replaceWith(newFsBtn);

        const toggleSettingsPane = (ev) => {
          ev?.preventDefault();
          ev?.stopImmediatePropagation();

          settingsPane.hidden = !settingsPane.hidden;

          return false;
        };

        if (IS_MOBILE) {
          autoplayBtn.oncontextmenu = () => false;
          detectHold(autoplayBtn, toggleSettingsPane);
        } else {
          autoplayBtn.oncontextmenu = toggleSettingsPane;
        }

        if (IS_SAFARI === false) {
          newFsBtn.addEventListener('click', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          this.messenger.sendMessage(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
        }
      });
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const fsBtn = document.querySelector(LoadXIframeInterface.queries.fullscreenBtn);

      if (isInFullscreen) {
        fsBtn.parentElement.classList.add('jw-off');
      } else {
        fsBtn.parentElement.classList.remove('jw-off');
      }
    }
  }

  class VidozaIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForElement([
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

    static get queries() {
      return {
        fullscreenBtn: 'button.vjs-fullscreen-control',
        player: 'video#player_html5_api.vjs-tech',
      };
    }

    async preparePlayer(player) {
      this.setupDoubletapBehavior(player);
      this.setupHotkeys(player);
      this.setupOutroSkipHandling(player);
      this.setupWatchedStateLabeling(player);
      this.setupVideoPlaybackPositionMemory(player);
      this.restylePlayer(player);

      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume

      // Attach autoplay button and change fullscreen button behavior...
      waitForElement(VidozaIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        // Prevent focused button from being toggled by pressing space/enter
        fsBtn.parentElement.addEventListener('keydown', (ev) => ev.preventDefault());
        fsBtn.parentElement.addEventListener('keyup', (ev) => ev.preventDefault());

        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.settingsPane = this.createSettingsPane();

        autoplayBtn.style.paddingBottom = '1px';

        fsBtn.before(autoplayBtn);

        IS_SAFARI ? fsBtn.remove() : fsBtn.replaceWith(newFsBtn);

        const toggleSettingsPane = (ev) => {
          ev?.preventDefault();
          ev?.stopImmediatePropagation();

          settingsPane.hidden = !settingsPane.hidden;

          return false;
        };

        if (IS_MOBILE) {
          autoplayBtn.oncontextmenu = () => false;
          detectHold(autoplayBtn, toggleSettingsPane);
        } else {
          autoplayBtn.oncontextmenu = toggleSettingsPane;
        }

        if (IS_SAFARI === false) {
          newFsBtn.addEventListener('click', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          this.messenger.sendMessage(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
        }
      });
    }

    restylePlayer() {
      GM_addStyle([
        `
          div.vjs-resolution-button, button.vjs-disable-ads-button {
            display: none !important;
          }
        `,

        `
          div.video-js div.vjs-control-bar {
            background-color: unset !important;
          }
        `,

        `
          div.video-js .vjs-slider {
            background-color: rgb(112, 112, 112, 0.8) !important;
          }
        `,

        `
          div.video-js .vjs-play-progress {
            background-color: #2979ff !important;
            border-radius: 1em !important;
            height: 0.4em !important;
          }

          div.video-js .vjs-play-progress:before {
            font-size: 0.9em !important;
            top: -.25em !important;
          }
        `,

        `
          div.video-js .vjs-load-progress {
            background-color: #808080 !important;
            height: 0.4em !important;
          }
        `,

        `
          div.video-js .vjs-progress-control .vjs-progress-holder {
            height: 0.4em !important;
          }
        `,

        `
          div.video-js .vjs-time-control, div.vjs-playback-rate .vjs-playback-rate-value, div.vjs-resolution-button .vjs-resolution-button-label {
            line-height: 3em !important;
          }
        `,

        `
          div.video-js .vjs-big-play-button {
            background-color: rgb(0 132 255 / 75%) !important;
          }

          div.video-js .vjs-big-play-button:hover {
            background-color: rgb(40 160 255 / 95%) !important;
          }
        `,

        `
          div.video-js .vjs-progress-control:hover .vjs-mouse-display:after, div.video-js .vjs-progress-control:hover .vjs-play-progress:after, div.video-js .vjs-progress-control:hover .vjs-time-tooltip, div.video-js .vjs-volume-panel .vjs-volume-control.vjs-volume-vertical, div.vjs-menu-button-popup .vjs-menu .vjs-menu-content {
            background-color: rgb(0 132 255 / 75%) !important;
          }
        `,

        `
          #vplayer .video-js .vjs-time-control {
            padding-right: 3.5em !important;
          }
        `,

        `
          div.video-js .vjs-play-control {
            margin-left: 0.5em !important;
          }
        `,

        `
          div.video-js .vjs-progress-control {
            margin-left: 0.8em !important;
          }
        `,

        `
          div.video-js .vjs-fullscreen-control {
            margin-right: 0.5em !important;
          }
        `,
      ].join(' '));

      const currentTime = document.querySelector('div.vjs-current-time');
      const remainingTime = document.querySelector('div.vjs-remaining-time');

      remainingTime.replaceWith(currentTime);
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

  class VOEJWPIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      const playbackPositionStorageKey = (
        `skip-forward-${location.pathname.split('/').pop()}`
      );

      try {
        this.builtinPlaybackPositionMemory = JSON.parse(localStorage.getItem(
          playbackPositionStorageKey
        ));
      } catch {}

      localStorage.removeItem(playbackPositionStorageKey);

      waitForElement('iframe[style*="z-index: 2147483647"]', {
        existing: true,
      }, (ads) => ads.remove());

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (
            // Get rid of ads on any LMB click
            (['click', 'mousedown'].includes(type) && this === document)
            ||
            // Intercept original hotkeys to avoid conflicts with the script hotkeys
            (type === 'keydown' && this.matches && this.matches('div#vp'))
          ) {
            return;
          }

          // Intercept double-tap to fullscreen handler
          if (
            IS_MOBILE &&
            mainSettings[MAIN_SETTINGS_MAP.overrideDoubletapBehavior] &&
            (type === 'click' && this.matches && this.matches('div#vp > div > div.jw-media'))
          ) {
            let timerId = null;

            return originalAddEventListener.call(this, type, () => {
              clearTimeout(timerId);

              const playerContainer = document.querySelector('div#vp');

              if (playerContainer.classList.contains('jw-flag-user-inactive')) {
                playerContainer.classList.remove('jw-flag-user-inactive');

                timerId = setTimeout(() => {
                  playerContainer.classList.add('jw-flag-user-inactive');
                }, 2000);
              } else {
                playerContainer.classList.add('jw-flag-user-inactive');
              }
            }, options);
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static get queries() {
      return {
        fullscreenBtn: 'div.jw-tooltip-fullscreen',
        player: 'video.jw-video',
      };
    }

    async preparePlayer(player) {
      this.setupDoubletapBehavior(player);
      this.setupHotkeys(player);
      this.setupOutroSkipHandling(player);
      this.setupWatchedStateLabeling(player);
      this.setupVideoPlaybackPositionMemory(player);

      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume

      // Attach autoplay button and change fullscreen button behavior...
      waitForElement(VOEJWPIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        fsBtn = fsBtn.parentElement;

        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.settingsPane = this.createSettingsPane();

        autoplayBtn.style.width = '44px';
        autoplayBtn.style.height = '44px';
        autoplayBtn.style.paddingTop = '3px';
        autoplayBtn.style.flex = '0 0 auto';
        autoplayBtn.style.outline = 'none';

        fsBtn.before(autoplayBtn);

        IS_SAFARI ? fsBtn.remove() : fsBtn.replaceWith(newFsBtn);

        const toggleSettingsPane = (ev) => {
          ev?.preventDefault();
          ev?.stopImmediatePropagation();

          settingsPane.hidden = !settingsPane.hidden;

          return false;
        };

        if (IS_MOBILE) {
          autoplayBtn.oncontextmenu = () => false;
          detectHold(autoplayBtn, toggleSettingsPane);
        } else {
          autoplayBtn.oncontextmenu = toggleSettingsPane;
        }

        if (IS_SAFARI === false) {
          newFsBtn.addEventListener('click', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          this.messenger.sendMessage(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
        }
      });
    }

    async setupVideoPlaybackPositionMemory(player) {
      const self = this;

      await (async function waitForVideoId(start = Date.now()) {
        if (!self.currentVideoId) {
          if ((Date.now() - start) > (10 * 1000)) {
            throw new Error('Video ID didn\'t arrive in time');
          }

          await sleep();

          return waitForVideoId(start);
        }
      }());

      const gmKeyPrefix = IframeInterface.playbackPositionsGMPrefix;

      if (
        this.builtinPlaybackPositionMemory &&
        this.builtinPlaybackPositionMemory.value
      ) {
        const { expire, value } = this.builtinPlaybackPositionMemory;
        let updateDate = Date.now();

        // 10 days is the built in position memory expiration time
        if (expire) {
          updateDate = (
            new Date((new Date(expire)).getTime() - 10 * 24 * 60 * 60 * 1000).getTime()
          );
        }

        GM_setValue(`${gmKeyPrefix}${this.currentVideoId}`, { value, updateDate });
      }

      // This has to wait indefinitely because players like VOE do not have the value
      // until the play button has been pressed or an autoplay has been triggered
      await (async function waitForVideoDuration() {
        if (!player.duration) {
          await sleep();
          return waitForVideoDuration();
        }
      }());

      const timestampData = GM_getValue(`${gmKeyPrefix}${this.currentVideoId}`, {});

      if (timestampData.value) {
        const elapsedTime = Date.now() - timestampData.updateDate;
        const expirationThreshold = advancedSettings[
          ADVANCED_SETTINGS_MAP.playbackPositionExpirationDays
        ] * 24 * 60 * 60 * 1000;

        if (elapsedTime < expirationThreshold) {
          const outroSkipThresholdS = coreSettings[CORE_SETTINGS_MAP.currentOutroSkipThresholdS];
          const potentialTimeLeftToPlay = player.duration - timestampData.value;

          // Skip saved playback position if it's in a range of (outroSkipThresholdS + 20)
          if (potentialTimeLeftToPlay > (outroSkipThresholdS + 20)) {
            player.currentTime = timestampData.value;
          }
        }
      }

      let lastCheckedTime = player.currentTime;

      setInterval(() => {
        if (
          !mainSettings[MAIN_SETTINGS_MAP.playbackPositionMemory] ||
          (player.currentTime === lastCheckedTime)
        ) return;

        lastCheckedTime = player.currentTime;

        GM_setValue(`${gmKeyPrefix}${this.currentVideoId}`, {
          value: lastCheckedTime,
          updateDate: Date.now(),
        });
      }, 1000);
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const fsBtn = document.querySelector(VOEJWPIframeInterface.queries.fullscreenBtn);

      if (isInFullscreen) {
        fsBtn.parentElement.classList.add('jw-off');
      } else {
        fsBtn.parentElement.classList.remove('jw-off');
      }
    }
  }

  class VOEPlyrIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForElement('iframe[style*="z-index: 2147483647"]', {
        existing: true,
      }, (ads) => ads.remove());

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (
            // Get rid of ads on any LMB click
            (['click', 'mousedown'].includes(type) && this === document)
            ||
            // Intercept original hotkeys to avoid conflicts with the script hotkeys
            (type === 'keypress' && this === document)
            ||
            (type === 'keydown' && this.matches && this.matches('div.plyr'))
          ) {
            return;
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static get queries() {
      return {
        fullscreenBtn: 'button[data-plyr="fullscreen"]',
        player: 'video#voe-player',
        playerContainer: 'div.plyr__video-wrapper',
        playerControls: 'div.plyr__controls',
      };
    }

    createAutoplayButton() {
      const button = document.createElement('button');
      const toggleContainer = document.createElement('div');
      const toggleDot = document.createElement('div');
      const tooltip = document.createElement('span');
      const isAutoplayEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];
      let lastClickTime = 0;

      button.addEventListener('click', () => {
        const now = Date.now();

        // Prevent double-clicks unwanted behavior
        if (now - lastClickTime < 300) return;

        lastClickTime = now;

        if (!GM_getValue('firstRunTextWasShown')) {
          GM_setValue('firstRunTextWasShown', true);

          this.messenger.sendMessage(IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO, {
            args: [
              `${GM_info.script.name} info`,
              `${IS_MOBILE ? 'Hold-release' : 'Right click'} the toggle button to open autoplay settings. ${IS_MOBILE ? '' : `Press "${hotkeysSettings[HOTKEYS_SETTINGS_MAP.largeSkip]}" when an intro starts to skip it. `}Fullscreen is scrollable, allowing to switch providers on the go`,
              'Okay',
            ],
          });
        }

        const wasEnabled = coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled];

        coreSettings[CORE_SETTINGS_MAP.isAutoplayEnabled] = !wasEnabled;

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
          user-select: none;
          -webkit-user-select: none;
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
      this.setupDoubletapBehavior(player, player.nextElementSibling);
      this.setupHotkeys(player);
      this.setupOutroSkipHandling(player);
      this.setupWatchedStateLabeling(player);
      this.setupVideoPlaybackPositionMemory(player);
      this.restylePlayer(player);

      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume

      IS_MOBILE && this.setupControlsHiding(player);

      // Hide cursor on a fullscreen playback
      waitForElement(VOEPlyrIframeInterface.queries.playerContainer, {
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
      waitForElement(VOEPlyrIframeInterface.queries.playerControls, {
        existing: true,
        onceOnly: true,
      }, (playerControls) => {
        // Prevent focused button from being toggled by pressing space/enter
        playerControls.addEventListener('keydown', (ev) => ev.preventDefault());
        playerControls.addEventListener('keyup', (ev) => ev.preventDefault());

        const fsBtn = playerControls.querySelector(
          VOEPlyrIframeInterface.queries.fullscreenBtn
        );
        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.settingsPane = this.createSettingsPane();

        fsBtn.before(autoplayBtn);

        IS_SAFARI ? fsBtn.remove() : fsBtn.replaceWith(newFsBtn);

        const toggleSettingsPane = (ev) => {
          ev?.preventDefault();
          ev?.stopImmediatePropagation();

          settingsPane.hidden = !settingsPane.hidden;

          return false;
        };

        if (IS_MOBILE) {
          autoplayBtn.oncontextmenu = () => false;
          detectHold(autoplayBtn, toggleSettingsPane);
        } else {
          autoplayBtn.oncontextmenu = toggleSettingsPane;
        }

        if (IS_SAFARI === false) {
          newFsBtn.addEventListener('click', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          this.messenger.sendMessage(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
        }
      });

      await (async function waitForPlyr(start = Date.now()) {
        if (!player.plyr) {
          if ((Date.now() - start) > (10 * 1000)) {
            throw new Error('Plyr API didn\'t arrive in time');
          }

          await sleep();

          return waitForPlyr(start);
        }
      }());

      // Prevent double-tap to fullscreen behavior
      for (let i = player.plyr.eventListeners.length - 1; i >= 0; i--) {
        const listenerObject = player.plyr.eventListeners[i];

        if (listenerObject.type === 'dblclick') {
          listenerObject.element.removeEventListener('dblclick', listenerObject.callback);
          player.plyr.eventListeners.splice(i, 1);
          break;
        }
      }
    }

    restylePlayer() {
      const newStyles = [
        // Remove annoying highlights when control buttons are in focus
        `
          div.plyr--video .plyr__control:focus-visible {
            background: none;
          }

          button.plyr__control:focus-visible {
            outline: none;
          }

          div.plyr .plyr__control:focus-visible .plyr__tooltip {
            opacity: 0;
          }
        `,
      ];

      if (IS_MOBILE) {
        // Remove 2.5s extra delay before hiding controls
        newStyles.push(`
          div.plyr--video.plyr--hide-controls .plyr__controls {
            animation-duration: 0s !important;
          }
        `);
      }

      GM_addStyle(newStyles.join(' '));
    }

    setupControlsHiding(player) {
      const controlsCheckIntervalMs = 100;
      let controlsLastHiddenTime = 0;

      setInterval(() => {
        if (
          player.parentElement.parentElement.classList.contains('plyr--hide-controls')
        ) {
          controlsLastHiddenTime = Date.now();
        }
      }, controlsCheckIntervalMs);

      player.parentElement.addEventListener('click', (ev) => {
        if (!['pen', 'touch'].includes(ev.pointerType)) return;

        if (
          !player.paused &&
          (Date.now() - controlsLastHiddenTime) > (controlsCheckIntervalMs * 2) &&
          !player.parentElement.parentElement.classList.contains('plyr--hide-controls')
        ) {
          player.parentElement.parentElement.classList.add('plyr--hide-controls');
        }
      });
    }

    updateFullscreenBtn({ isInFullscreen }) {
      const btn = document.querySelector(VOEPlyrIframeInterface.queries.fullscreenBtn);

      if (isInFullscreen) {
        btn.classList.add('plyr__control--pressed');
      } else {
        btn.classList.remove('plyr__control--pressed');
      }
    }
  }

  class SpeedfilesIframeInterface extends IframeInterface {
    constructor(messenger) {
      super(messenger);

      waitForElement([
        'iframe[style*="z-index: 2147483647"]',
      ].join(', '), {
        existing: true,
      }, (ads) => ads.remove());

      (function() {
        const originalAddEventListener = EventTarget.prototype.addEventListener;

        EventTarget.prototype.addEventListener = function (type, listener, options) {
          if (
            type === 'dblclick' && this.matches && this.matches('#my-video_html5_api')
          ) {
            return;
          }

          return originalAddEventListener.call(this, type, listener, options);
        };
      }());
    }

    static get queries() {
      return {
        fullscreenBtn: 'button.vjs-fullscreen-control',
        player: 'video#my-video_html5_api.vjs-tech',
      };
    }

    async preparePlayer(player) {
      this.setupDoubletapBehavior(player);
      this.setupHotkeys(player);
      this.setupOutroSkipHandling(player);
      this.setupWatchedStateLabeling(player);
      this.setupVideoPlaybackPositionMemory(player);

      this.setupPersistentVolume(player);
      this.handleAutoplay(player); // should go after setupPersistentVolume

      // Attach autoplay button and change fullscreen button behavior...
      waitForElement(SpeedfilesIframeInterface.queries.fullscreenBtn, {
        existing: true,
        onceOnly: true,
      }, (fsBtn) => {
        const newFsBtn = fsBtn.cloneNode(true);
        const autoplayBtn = this.createAutoplayButton();
        const settingsPane = this.settingsPane = this.createSettingsPane();

        autoplayBtn.style.width = '40px';
        autoplayBtn.style.paddingBottom = '1px';

        fsBtn.before(autoplayBtn);

        IS_SAFARI ? fsBtn.remove() : fsBtn.replaceWith(newFsBtn);

        // Prevent focused button from being toggled by pressing space/enter
        newFsBtn.addEventListener('keydown', (ev) => ev.preventDefault());
        newFsBtn.addEventListener('keyup', (ev) => ev.preventDefault());

        const toggleSettingsPane = (ev) => {
          ev?.preventDefault();
          ev?.stopImmediatePropagation();

          settingsPane.hidden = !settingsPane.hidden;

          return false;
        };

        if (IS_MOBILE) {
          autoplayBtn.oncontextmenu = () => false;
          detectHold(autoplayBtn, toggleSettingsPane);
        } else {
          autoplayBtn.oncontextmenu = toggleSettingsPane;
        }

        if (IS_SAFARI === false) {
          newFsBtn.addEventListener('click', () => {
            this.messenger.sendMessage(IframeMessenger.messages.TOGGLE_FULLSCREEN);
          });

          this.messenger.sendMessage(IframeMessenger.messages.REQUEST_FULLSCREEN_STATE);
        }
      });
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
      this.iframeSrcChangesListener = null;
      this.id = makeId();
      this.ignoreIframeSrcChangeOnce = false;
      this.isPendingConnection = false;
    }

    static get messages() {
      return {
        CURRENT_FRANCHISE_DATA: 'CURRENT_FRANCHISE_DATA',
        FULLSCREEN_STATE: 'FULLSCREEN_STATE',
      };
    }

    static get queries() {
      return {
        animeTitle: 'div.hostSeriesTitle',
        episodeDedicatedLink: 'div.hosterSiteVideo a.watchEpisode',
        episodeTitle: 'div.hosterSiteTitle',
        hostersPlayerContainer: 'div.hosterSiteVideo',
        navLinksContainer: 'div#stream.hosterSiteDirectNav',
        playerIframe: 'div.inSiteWebStream iframe',
        providerChangeBtn: 'div.generateInlinePlayer',
        providerName: 'div.hosterSiteVideo > ul a > h4',
        providersList: 'div.hosterSiteVideo > ul',
        selectedLanguageBtn: 'img.selectedLanguage',
      };
    }

    // It is better not to be async
    handleIframeMessages(packet) {
      (async function() {
        try {
          switch (packet.command) {
            case IframeMessenger.messages.AUTOPLAY_NEXT: {
              // This is here because it bugges out the episodes navigation panel
              // if try and use MARK_CURRENT_VIDEO_WATCHED. Watched episode is being
              // marked as non watched
              try {
                await this.markCurrentVideoWatched();
              } catch (e) {
                console.error(e);
              }

              try {
                await this.goToNextVideo();
              } catch (e) {
                console.error(e);

                Notiflixx.notify.warning(
                  `${GM_info.script.name}: The script got an error trying autoplay. Try again, and if the problem persists, report the bug, or you can try switching video player providers if possible`
                );
              }

              break;
            }

            case IframeMessenger.messages.REQUEST_CURRENT_FRANCHISE_DATA: {
              const episodeId = document.querySelector(
                TopScopeInterface.queries.episodeTitle
              ).dataset.episodeId;
              const releaseYear = document.querySelector(
                'div.series-title span[itemprop="startDate"]'
              ).innerText;
              const title = document.querySelector('div.series-title > h1').innerText;
              const currentFranchiseId = (
                title ? `${title}${releaseYear ? `::${releaseYear}` : ''}` : null
              );

              if (currentFranchiseId || episodeId !== undefined) {
                this.commLink.commands[
                  TopScopeInterface.messages.CURRENT_FRANCHISE_DATA
                ]({
                  currentFranchiseId,
                  currentVideoId: episodeId || null,
                });
              }

              break;
            }

            // Would not work on Safari
            // but this should not be called on Safari anyway
            case IframeMessenger.messages.REQUEST_FULLSCREEN_STATE: {
              if (IS_SAFARI) break;

              this.commLink.commands[TopScopeInterface.messages.FULLSCREEN_STATE]({
                isInFullscreen: !!document.fullscreenElement,
              });

              break;
            }

            case IframeMessenger.messages.MARK_CURRENT_VIDEO_WATCHED: {
              await this.markCurrentVideoWatched();

              break;
            }

            case IframeMessenger.messages.OPEN_HOTKEYS_GUIDE: {
              if (confirm('Open hotkeys guide?')) {
                window.open('https://i.imgur.com/3cnDWxm.png', '_blank');
              }

              break;
            }

            // Would not work on Safari
            // but this should not be called from Safari anyway
            case IframeMessenger.messages.TOGGLE_FULLSCREEN: {
              if (IS_SAFARI) break;

              // Notice how this then triggers a listener from this.init()
              if (document.fullscreenElement) {
                await document.exitFullscreen();
              } else {
                await document.documentElement.requestFullscreen();
              }

              break;
            }

            case IframeMessenger.messages.TOP_NOTIFLIX_REPORT_INFO: {
              Notiflixx.report.info(...packet.data.args);

              break;
            }

            // Not sure if anything except providersPriority needs to be in sync witn an iframe
            case IframeMessenger.messages.UPDATE_CORE_SETTINGS: {
              coreSettings.update();

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

    async init(iframe) {
      await this.initCrossFrameConnection();

      this.iframeSrcChangesListener = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.attributeName === 'src') {
            if (this.ignoreIframeSrcChangeOnce) {
              this.ignoreIframeSrcChangeOnce = false;

              return;
            }

            this.unregisterCommlinkListener();
            this.initCrossFrameConnection();
          }
        }
      }).observe(iframe, { attributes: true });

      if (IS_SAFARI) {
        this.adaptFakeFullscreen();

        window.addEventListener('orientationchange', () => {
          setTimeout(() => this.adaptFakeFullscreen(), 100);
        });
      } else {
        document.addEventListener('fullscreenchange', () => {
          this.adaptFakeFullscreen();
          this.commLink.commands[TopScopeInterface.messages.FULLSCREEN_STATE]({
            isInFullscreen: !!document.fullscreenElement,
          });
        });
      }
    }

    async initCrossFrameConnection() {
      if (this.isPendingConnection) throw new Error('Connecting already');

      this.isPendingConnection = true;

      let timeoutId;

      const iframeId = this.currentIframeId = await new Promise((resolve, reject) => {
        const valueChangeListenerId = GM_addValueChangeListener('unboundIframeId', (
          _key,
          _oldValue,
          newValue,
        ) => {
          const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);

          // Skip if top scope is a wrong one
          if (!iframe) return;

          GM_removeValueChangeListener(valueChangeListenerId);
          clearTimeout(timeoutId);
          resolve(newValue);
        });

        timeoutId = setTimeout(() => {
          this.isPendingConnection = false;

          GM_removeValueChangeListener(valueChangeListenerId);
          reject(new Error('Iframe connection timeout'));
        }, 4 * 1000);
      });

      GM_setValue(iframeId, this.id);

      this.commLink = new CommLinkHandler(this.id, {
        silentMode: true,
        statusCheckInterval: advancedSettings[ADVANCED_SETTINGS_MAP.commlinkPollingIntervalMs],
      });

      this.commLink.registerSendCommand(TopScopeInterface.messages.CURRENT_FRANCHISE_DATA);
      this.commLink.registerSendCommand(TopScopeInterface.messages.FULLSCREEN_STATE);

      this.commLink.registerListener(iframeId, this.handleIframeMessages.bind(this));

      this.isPendingConnection = false;
    }


    adaptFakeFullscreen() {
      const Q = TopScopeInterface.queries;
      const hostersPlayerContainer = document.querySelector(Q.hostersPlayerContainer);
      const playerIframe = document.querySelector(Q.playerIframe);

      // Consider landscape mode as fullscreen on Safari
      const isInFullscreen = (
        IS_SAFARI ? window.innerWidth > window.innerHeight : !!document.fullscreenElement
      );

      if (isInFullscreen) {
        document.body.style.overflow = 'hidden';
        playerIframe.style.setProperty('height', '100vh', 'important');
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

    async announceEpisodeWatched(id) {
      if (!id) throw new Error ('Episode ID is missing');

      await fetch(`${location.protocol}//${location.hostname}/ajax/lastseen`, {
        method: 'POST',
        body: `episode=${id}`,
        headers: {
          'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        },
      });
    }

    async goToNextVideo() {
      const Q = TopScopeInterface.queries;

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

      // Seems like the last episode was reached
      if (!nextEpisodeHref) return;

      const nextEpisodeHtml = await (await fetch(nextEpisodeHref)).text();
      const nextEpisodeDom = (new DOMParser()).parseFromString(nextEpisodeHtml, 'text/html');

      // Update current DOM from a next episode DOM
      ([
        'div#wrapper > div.seriesContentBox > div.container.marginBottom > ul',
        'div#wrapper > div.seriesContentBox > div.container.marginBottom > div.cf',
        'div.changeLanguageBox',
        `${Q.episodeTitle} > ul`,
        Q.animeTitle,
        Q.episodeTitle,
        Q.navLinksContainer,
        Q.providersList,
      ]).forEach((query) => {
        const currentElement = document.querySelector(query);
        const newElement = nextEpisodeDom.querySelector(query);

        if (currentElement && newElement) {
          currentElement.outerHTML = newElement.outerHTML;
        }
      });

      document.title = nextEpisodeDom.title;
      history.pushState({}, '', nextEpisodeHref);

      try {
        // The website code copypasta to try and restore various buttons functionality
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
        }());

        const { selectedLanguage } = this.updateVideoLanguageProcessing();
        const preferredProvidersButtons = [
          ...document.querySelectorAll(TopScopeInterface.queries.providerChangeBtn)
        ].filter(el => el.parentElement.dataset.langKey === selectedLanguage);
        let nextProviderName = null;
        let nextVideoLink = null;

        if (preferredProvidersButtons.length) {
          outer:
          for (const priority of coreSettings[CORE_SETTINGS_MAP.providersPriority]) {
            const preferredProviderName = VIDEO_PROVIDERS[priority];

            for (const btn of preferredProvidersButtons) {
              const link = btn.firstElementChild;
              const providerName = link.querySelector(
                TopScopeInterface.queries.providerName
              ).innerText;

              if (providerName === preferredProviderName) {
                nextProviderName = providerName;
                nextVideoLink = link;

                break outer;
              }
            }
          }
        }

        let nextVideoHref = nextVideoLink?.href;

        // VOE has an additional redirect page,
        // so need to extract the video href from there first
        // in order to keep VOE-to-VOE autoplay unmuted
        if (nextVideoHref && nextProviderName === VIDEO_PROVIDERS_MAP.VOE) {
          const corsProxy = advancedSettings[ADVANCED_SETTINGS_MAP.corsProxy];

          if (corsProxy) {
            nextVideoHref = /location\.href = '(https:\/\/.+)';/.exec(
              await (await fetch(corsProxy + nextVideoLink.href)).text()
            )[1];
          }
        }

        if (!nextVideoHref) throw new Error('Embedded providers are missing or not supported');

        document.querySelector(Q.playerIframe).src = nextVideoHref;
      } catch {
        GM_setValue('lastAutoplayError', { date: Date.now() });

        // At that point, refresh should load the next episode if the website even has it.
        // The problem is it is not seamless
        location.href = location.href;
      }
    }

    async markCurrentVideoWatched() {
      const episodeId = document.querySelector(
        TopScopeInterface.queries.episodeTitle
      ).dataset.episodeId;

      await this.announceEpisodeWatched(episodeId);
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

    // Partly consist of the website code
    updateVideoLanguageProcessing() {
      let changeLanguageButtons = [...document.querySelectorAll('.changeLanguageBox img')];
      let selectedLanguage = coreSettings[CORE_SETTINGS_MAP.videoLanguagePreferredID];
      const availableLangIDs = [...new Set(changeLanguageButtons.map(img => img.dataset.langKey))];

      // Checks preferred language and if it is missing, it takes first available.
      // Returns if found zero buttons with language IDs
      if (!selectedLanguage || !availableLangIDs.includes(selectedLanguage)) {
        if (availableLangIDs.length) {
          selectedLanguage = availableLangIDs[0];
        } else {
          return null;
        }
      }

      // Hides/unhides providers buttons based on language
      document.querySelectorAll('.hosterSiteVideo ul li[data-lang-key]').forEach((el) => {
        el.style.display = el.dataset.langKey === selectedLanguage ? 'block' : 'none';
      });

      // Highlights/unhighlights change language buttons
      changeLanguageButtons.forEach((btn) => {
        btn.classList.toggle('selectedLanguage', btn.dataset.langKey === selectedLanguage);
        btn.outerHTML = btn.outerHTML;
      });

      // HTML reset removes the nodes from the DOM so need to get them here once again
      changeLanguageButtons = [...document.querySelectorAll('.changeLanguageBox img')];

      changeLanguageButtons.forEach((btn) => {
        btn.addEventListener('click', function() {
          const selectedLanguage = coreSettings[
            CORE_SETTINGS_MAP.videoLanguagePreferredID
          ] = this.getAttribute('data-lang-key');

          // Highlights/unhighlights change language buttons
          document.querySelectorAll('.changeLanguageBox img').forEach((btn) => {
            btn.classList.toggle('selectedLanguage', btn.dataset.langKey === selectedLanguage);
          });

          // Hides/unhides providers buttons based on language
          document.querySelectorAll('.hosterSiteVideo ul li[data-lang-key]').forEach((el) => {
            el.style.display = el.dataset.langKey === selectedLanguage ? 'block' : 'none';
          });

          const preferredProvidersButtons = [
            ...document.querySelectorAll(TopScopeInterface.queries.providerChangeBtn)
          ].filter(el => el.parentElement.dataset.langKey === selectedLanguage);

          if (preferredProvidersButtons.length) {
            outer:
            for (const priority of coreSettings[CORE_SETTINGS_MAP.providersPriority]) {
              const preferredProviderName = VIDEO_PROVIDERS[priority];

              for (const btn of preferredProvidersButtons) {
                const providerName = btn.firstElementChild.querySelector(
                  TopScopeInterface.queries.providerName
                ).innerText;

                if (providerName === preferredProviderName) {
                  btn.click();
                  break outer;
                }
              }
            }
          } else {
            document.querySelectorAll('.inSiteWebStream').forEach((el) => {
              el.style.display = 'none';
            });

            this.unregisterCommlinkListener();

            if (this.iframeSrcChangesListener) this.ignoreIframeSrcChangeOnce = true;

            document.querySelector(TopScopeInterface.queries.playerIframe).src = 'about:blank';
          }
        });
      });

      return { selectedLanguage };
    }
  }


  // If context is top scope
  if (!isEmbedded()) {
    if (!TOP_SCOPE_DOMAINS.includes(location.hostname)) return;

    // Recolor episodes links visited before, excluding the current or watched ones
    GM_addStyle(`
      div#stream.hosterSiteDirectNav a[data-episode-id]:visited:not([class]) {
        background: #ffce74;
      }
    `);

    // Wait for DOM
    await new Promise((resolve) => {
      if (['complete'].includes(document.readyState)) {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      }
    });

    try {
      if (!IS_SAFARI && !GM_getValue('violentmonkeyWarningTextWasShown')) {
        const showWarning = () => {
          if (document.visibilityState === 'visible') {
            Notiflixx.report.warning(...VIOLENTMONKEY_WARNING, 'Okay');
            setTimeout(() => GM_setValue('violentmonkeyWarningTextWasShown', true), 500);
            document.removeEventListener('visibilitychange', showWarning);
          }
        };

        if (document.visibilityState === 'visible') {
          showWarning();
        } else {
          document.addEventListener('visibilitychange', showWarning);
        }
      }

      const lastAutoplayError = GM_getValue('lastAutoplayError');

      if (lastAutoplayError && ((Date.now() - lastAutoplayError.date) <= (60 * 1000))) {
        GM_deleteValue('lastAutoplayError');

        Notiflixx.notify.warning(
          `${GM_info.script.name}: Last autoplay end up with an error, but you should be at the next episode page now. Try again, and if the problem persists, report the bug, or you can try switching video player providers if possible`
        );
      }
    } catch (e) {
      console.error(e);
    }

    const topScopeInterface = new TopScopeInterface();
    const iframe = document.querySelector(TopScopeInterface.queries.playerIframe);

    // Not a video page?
    if (!iframe) return;

    // Remove the website logic responsible for marking episodes as watched.
    // since the script would handle it instead. Awaiting is unnecessary
    (async function waitForWatchedFunction(start = Date.now()) {
      if (unsafeWindow.markAsWatched) {
        unsafeWindow.markAsWatched = () => {};
      } else {
        if ((Date.now() - start) > (10 * 1000)) {
          throw new Error('Watched function didn\'t arrive in time');
        }

        await sleep();

        return waitForWatchedFunction(start);
      }
    }());

    iframe.addEventListener('load', async () => {
      await topScopeInterface.init(iframe);
    }, { once: true });

    // Wait for the website main code to finish
    await new Promise((resolve) => {
      waitForElement(TopScopeInterface.queries.selectedLanguageBtn, {
        existing: true,
        onceOnly: true,
        callbackOnTimeout: true,
        timeout: 10 * 1000,
      }, resolve);
    });

    await sleep();

    const { selectedLanguage } = topScopeInterface.updateVideoLanguageProcessing();
    const preferredProvidersButtons = [
      ...document.querySelectorAll(TopScopeInterface.queries.providerChangeBtn)
    ].filter(el => el.parentElement.dataset.langKey === selectedLanguage);

    if (preferredProvidersButtons.length) {
      for (const priority of coreSettings[CORE_SETTINGS_MAP.providersPriority]) {
        const preferredProviderName = VIDEO_PROVIDERS[priority];

        for (const btn of preferredProvidersButtons) {
          const providerName = btn.firstElementChild.querySelector(
            TopScopeInterface.queries.providerName
          ).innerText;

          if (providerName === preferredProviderName) {
            btn.click();
            return;
          }
        }
      }
    }
  }

  // If context is iframe scope
  else {
    const isItLoadX = !!(document.querySelector('title')?.textContent === 'LoadX');
    const isItVidoza = !!document.querySelector('meta[content*="Vidoza"]');
    const isItSpeedfiles = !!document.querySelector(
      'meta[content*="https://speedfiles.net"]'
    );
    let isItVOEJWP = false;
    let isItVOEPlyr = false;

    if (
      !isItLoadX && !isItVidoza && !isItSpeedfiles &&
      !!document.querySelector('meta[name="keywords"][content^="VOE"]')
    ) {
      for (const script of document.querySelectorAll('script')) {
        if (script.innerText.indexOf('/jwplayer/') !== -1) {
          isItVOEJWP = true;
          break;
        }
      }

      if (!isItVOEJWP) isItVOEPlyr = true;
    }

    if ([
      isItLoadX, isItVidoza, isItSpeedfiles, isItVOEJWP, isItVOEPlyr
    ].every(e => !e)) return;

    const iframeMessenger = new IframeMessenger();

    for (const { condition, interface: Interface } of [
      { condition: isItLoadX, interface: LoadXIframeInterface },
      { condition: isItVidoza, interface: VidozaIframeInterface },
      { condition: isItVOEJWP, interface: VOEJWPIframeInterface },
      { condition: isItVOEPlyr, interface: VOEPlyrIframeInterface },
      { condition: isItSpeedfiles, interface: SpeedfilesIframeInterface },
    ]) {
      if (!condition) continue;

      // Call early to get rid of ads and intercept listeners
      const iframeInterface = new Interface(iframeMessenger);

      window.addEventListener('load', async () => {
        // Give a little bit of a time for the TopScopeInterface to prepare
        await sleep(4);
        await iframeMessenger.initCrossFrameConnection();

        waitForElement(Interface.queries.player, {
          existing: true,
          onceOnly: true,
        }, async (player) => {
          // Prevent fullscreen triggering by a playback start, on Safari
          player.setAttribute('playsinline', '');
          player.setAttribute('webkit-playsinline', '');

          // Attempt to fix a Safari bug when the video controls get duplicated
          GM_addStyle(`
            video::-webkit-media-controls-panel, video::-webkit-media-controls-play-button, video::-webkit-media-controls-start-playback-button {
              display: none !important;
              -webkit-appearance: none;
              opacity: 0;
              visibility: hidden;
            }
          `);

          await iframeInterface.init(player);
        });
      }, { once: true });

      break;
    }
  }
}());
