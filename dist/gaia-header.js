!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.GaiaHeader=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Simple logger.
 *
 * @return {Function}
 */
var debug = 0 ? console.log.bind(console) : function(){};

/**
 * Global canvas cache.
 *
 * @type {Object}
 */
var cache = {};

/**
 * Default min/max font-size.
 *
 * @type {Number}
 */
var MIN = 16;
var MAX = 24;

/**
 * The number of pixels to subtract from
 * the given `config.space` to ensure
 * HTML text doesn't overflow container.
 *
 * Ideally we would use 1px, but in some
 * cases italicised text in canvas is ~2px
 * longer than the same text in HTML.
 *
 * http://bugzil.la/1126391
 *
 * @type {Number}
 */
var BUFFER = 3;

/**
 * Get the font-size that closest fits
 * the given space with the given font.
 *
 * Config:
 *
 *   - {String} `text` The text string
 *   - {String} `font` Font shorthand string
 *   - {Number} `space` Width (px) to fit the text into
 *   - {Number} `min` Min font-size (px) (optional)
 *   - {Number} `max` Max font-size (px) (optional)
 *
 * @param  {Object} config
 * @return {Object} {fontSize,textWidth}
 */
module.exports = function(config) {
  debug('font fit', config);
  var space = config.space - BUFFER;
  var min = config.min || MIN;
  var max = config.max || MAX;
  var text = trim(config.text);
  var fontSize = max;
  var textWidth;
  var font;

  do {
    font = config.font.replace(/\d+px/, fontSize + 'px');
    textWidth = getTextWidth(text, font);
  } while (textWidth > space && fontSize !== min && fontSize--);

  return {
    textWidth: textWidth,
    fontSize: fontSize
  };
};

/**
 * Get the width of the given text
 * with the given font style.
 *
 * @param  {String} text
 * @param  {String} font (CSS shorthand)
 * @return {Number} (px)
 */
function getTextWidth(text, font) {
  var ctx = getCanvasContext(font);
  var width = ctx.measureText(text).width;
  debug('got text width', width);
  return width;
}

/**
 * Get a canvas context configured
 * to the given font style.
 *
 * @param  {String} font
 * @return {CanvasRenderingContext2D}
 */
function getCanvasContext(font) {
  debug('get canvas context', font);

  var cached = cache[font];
  if (cached) { return cached; }

  var canvas = document.createElement('canvas');
  canvas.setAttribute('moz-opaque', 'true');
  canvas.setAttribute('width', '1px');
  canvas.setAttribute('height', '1px');
  debug('created canvas', canvas);

  var ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.font = font;

  return cache[font] = ctx;
}

/**
 * Trim leading, trailing
 * and excess whitespace.
 *
 * @param  {String} text
 * @return {String}
 */
function trim(text) {
  return text.replace(/\s+/g, ' ').trim();
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('font-fit',this));

},{}],2:[function(require,module,exports){
;(function(define){define(function(require,exports,module){
'use strict';

/**
 * Locals
 */

var textContent = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
var removeAttribute = HTMLElement.prototype.removeAttribute;
var setAttribute = HTMLElement.prototype.setAttribute;
var noop  = function() {};

/**
 * Detects presence of shadow-dom
 * CSS selectors.
 *
 * @return {Boolean}
 */
var hasShadowCSS = (function() {
  var div = document.createElement('div');
  try { div.querySelector(':host'); return true; }
  catch (e) { return false; }
})();

/**
 * Register a new component.
 *
 * @param  {String} name
 * @param  {Object} props
 * @return {constructor}
 * @public
 */
module.exports.register = function(name, props) {

  // Decide on a base protoype, create a handy
  // reference to super (extended) class, then clean up.
  var parent = props.extends ? props.extends.prototype : base;
  props.super = parent;
  delete props.extends;

  // Pull out CSS that needs to be in the light-dom
  if (props.template) {
    var output = processCss(props.template, name);

    props.template = document.createElement('template');
    props.template.innerHTML = output.template;
    props.lightCss = output.lightCss;

    props.globalCss = props.globalCss || '';
    props.globalCss += output.globalCss;
  }

  // Inject global CSS into the document,
  // and delete as no longer needed
  injectGlobalCss(props.globalCss);
  delete props.globalCss;

  // Merge base getter/setter attributes with the user's,
  // then define the property descriptors on the prototype.
  var descriptors = Object.assign(props.attrs || {}, baseAttrs);

  // Store the orginal descriptors somewhere
  // a little more private and delete the original
  props._attrs = props.attrs;
  delete props.attrs;

  // Create the prototype, extended from the parent
  var proto = Object.assign(Object.create(parent), props);

  // Define the properties directly on the prototype
  Object.defineProperties(proto, descriptors);

  // Register the custom-element and return the constructor
  return document.registerElement(name, { prototype: proto });
};

var base = Object.assign(Object.create(HTMLElement.prototype), {
  attributeChanged: noop,
  attached: noop,
  detached: noop,
  created: noop,

  createdCallback: function() {
    injectLightCss(this);
    this.created();
  },

  /**
   * It is very common to want to keep object
   * properties in-sync with attributes,
   * for example:
   *
   *   el.value = 'foo';
   *   el.setAttribute('value', 'foo');
   *
   * So we support an object on the prototype
   * named 'attrs' to provide a consistent
   * way for component authors to define
   * these properties. When an attribute
   * changes we keep the attr[name]
   * up-to-date.
   *
   * @param  {String} name
   * @param  {String||null} from
   * @param  {String||null} to
   */
  attributeChangedCallback: function(name, from, to) {
    var prop = toCamelCase(name);
    if (this._attrs && this._attrs[prop]) { this[prop] = to; }
    this.attributeChanged(name, from, to);
  },

  attachedCallback: function() { this.attached(); },
  detachedCallback: function() { this.detached(); },

  /**
   * A convenient method for setting up
   * a shadow-root using the defined template.
   *
   * @return {ShadowRoot}
   */
  setupShadowRoot: function() {
    if (!this.template) { return; }
    var node = document.importNode(this.template.content, true);
    this.createShadowRoot().appendChild(node);
    return this.shadowRoot;
  },

  /**
   * Sets an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  setAttr: function(name, value) {
    var internal = this.shadowRoot.firstElementChild;
    setAttribute.call(internal, name, value);
    setAttribute.call(this, name, value);
  },

  /**
   * Removes an attribute internally
   * and externally. This is so that
   * we can style internal shadow-dom
   * content.
   *
   * @param {String} name
   * @param {String} value
   */
  removeAttr: function(name) {
    var internal = this.shadowRoot.firstElementChild;
    removeAttribute.call(internal, name);
    removeAttribute.call(this, name);
  }
});

var baseAttrs = {
  textContent: {
    set: function(value) {
      var node = firstChildTextNode(this);
      if (node) { node.nodeValue = value; }
    },

    get: function() {
      var node = firstChildTextNode(this);
      return node && node.nodeValue;
    }
  }
};

/**
 * Return the first child textNode.
 *
 * @param  {Element} el
 * @return {TextNode}
 */
function firstChildTextNode(el) {
  for (var i = 0; i < el.childNodes.length; i++) {
    var node = el.childNodes[i];
    if (node && node.nodeType === 3) { return node; }
  }
}

var regex = {
  shadowCss: /(?:\:host|\:\:content)[^{]*\{[^}]*\}/g,
  ':host': /(?:\:host)/g,
  ':host()': /\:host\((.+)\)/g,
  ':host-context': /\:host-context\((.+)\)([^{,]+)?/g,
  '::content': /(?:\:\:content)/g
};

/**
 * Extracts the :host and ::content rules
 * from the shadow-dom CSS and rewrites
 * them to work from the <style scoped>
 * injected at the root of the component.
 *
 * @return {String}
 */
function processCss(template, name) {
  var globalCss = '';
  var lightCss = '';

  if (!hasShadowCSS) {
    template = template.replace(regex.shadowCss, function(match) {
      var hostContext = regex[':host-context'].exec(match);

      if (hostContext) {
        globalCss += match
          .replace(regex['::content'], '')
          .replace(regex[':host-context'], '$1 ' + name + '$2')
          .replace(/ +/g, ' '); // excess whitespace
      } else {
        lightCss += match
          .replace(regex[':host()'], name + '$1')
          .replace(regex[':host'], name)
          .replace(regex['::content'], name);
      }

      return '';
    });
  }

  return {
    template: template,
    lightCss: lightCss,
    globalCss: globalCss
  };
}

/**
 * Some CSS rules, such as @keyframes
 * and @font-face don't work inside
 * scoped or shadow <style>. So we
 * have to put them into 'global'
 * <style> in the head of the
 * document.
 *
 * @param  {String} css
 */
function injectGlobalCss(css) {
  if (!css) return;
  var style = document.createElement('style');
  style.innerHTML = css.trim();
  document.head.appendChild(style);
}


/**
 * The Gecko platform doesn't yet have
 * `::content` or `:host`, selectors,
 * without these we are unable to style
 * user-content in the light-dom from
 * within our shadow-dom style-sheet.
 *
 * To workaround this, we clone the <style>
 * node into the root of the component,
 * so our selectors are able to target
 * light-dom content.
 *
 * @private
 */
function injectLightCss(el) {
  if (hasShadowCSS) { return; }
  el.lightStyle = document.createElement('style');
  el.lightStyle.setAttribute('scoped', '');
  el.lightStyle.innerHTML = el.lightCss;
  el.appendChild(el.lightStyle);
}

/**
 * Convert hyphen separated
 * string to camel-case.
 *
 * Example:
 *
 *   toCamelCase('foo-bar'); //=> 'fooBar'
 *
 * @param  {Sring} string
 * @return {String}
 */
function toCamelCase(string) {
  return string.replace(/-(.)/g, function replacer(string, p1) {
    return p1.toUpperCase();
  });
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-component',this));

},{}],3:[function(require,module,exports){
(function(define){define(function(require,exports,module){
/*jshint laxbreak:true*/

/**
 * Exports
 */

var base = window.GAIA_ICONS_BASE_URL
  || window.COMPONENTS_BASE_URL
  || 'bower_components/';

// Load it if it's not already loaded
if (!isLoaded()) { load(base + 'gaia-icons/gaia-icons.css'); }

function load(href) {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = href;
  document.head.appendChild(link);
  exports.loaded = true;
}

function isLoaded() {
  return exports.loaded ||
    document.querySelector('link[href*=gaia-icons]') ||
    document.documentElement.classList.contains('gaia-icons-loaded');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-icons',this));

},{}],4:[function(require,module,exports){
;(function(define){'use strict';define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');
var fontFit = require('font-fit');

/**
 * Load 'gaia-icons' font-family
 */
require('gaia-icons');

/**
 * Simple logger (toggle 0)
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console) : function() {};

/**
 * Supported action types
 *
 * @type {Object}
 */
const KNOWN_ACTIONS = {
  menu: 'menu',
  back: 'back',
  close: 'close'
};

/**
 * The default title font.
 *
 * @type {String}
 */
const TITLE_FONT = 'italic 300 24px FiraSans';

/**
 * The padding (start/end) used if
 * the title needs padding away from
 * the edge of the header.
 *
 * @type {Number}
 */
const TITLE_PADDING = 10;

/**
 * Register the element.
 *
 * @return {Element} constructor
 */
module.exports = component.register('gaia-header', {

  /**
   * Called when the element is first created.
   *
   * Here we create the shadow-root and
   * inject our template into it.
   *
   * @private
   */
  created: function() {
    debug('created');
    this.setupShadowRoot();

    // Elements
    this.els = {
      actionButton: this.shadowRoot.querySelector('.action-button'),
      buttons: this.querySelectorAll('button, a'),
      titles: this.querySelectorAll('h1')
    };

    // Events
    this.els.actionButton.addEventListener('click', e => this.onActionButtonClick(e));
    this.observer = new MutationObserver(this.onMutation.bind(this));

    // Properties
    this.titleEnd = this.getAttribute('title-end');
    this.titleStart = this.getAttribute('title-start');
    this.noFontFit = this.getAttribute('no-font-fit');
    this.notFlush = this.hasAttribute('not-flush');
    this.action = this.getAttribute('action');

    this.unresolved = {};
    this.pending = {};
  },

  /**
   * Called when the element is
   * attached to the DOM.
   *
   * Run fontFit when we have DOM
   * context and start listening
   * for DOM mutations.
   *
   * We run font-fit on next tick to
   * avoid reading from the DOM when
   * it may not be loaded yet.
   *
   * @private
   */
  attached: function() {
    debug('attached');
    this.runFontFitSoon();
    this.observerStart();
  },

  /**
   * Called when the element is
   * detached from the DOM.
   *
   * @private
   */
  detached: function() {
    debug('detached');
    this.observerStop();
    this.clearPending();
  },

  /**
   * Clears pending `.nextTick()`s
   *
   * @private
   */
  clearPending: function() {
    for (var key in this.pending) {
      this.pending[key].clear();
      delete this.pending[key];
    }
  },

  /**
   * Run the font-fit logic and
   * center the title.
   *
   * The styles are calculated synchronously,
   * but then set asynchronously. This means
   * this function can be hammered in one turn,
   * and the title styles will only be written
   * once, with the latest styles.
   *
   * @return {Promise}
   * @public
   */
  runFontFit: function() {
    debug('run font-fit');

    // Nothing is run if `no-font-fit` attribute
    // is present. We don't `reject()` as this
    // isn't technically an error state.
    if (this.noFontFit) { return Promise.resolve(); }

    var titles = this.els.titles;
    var space = this.getTitleSpace();
    var styles = [].map.call(titles, (el) => this.getTitleStyle(el, space));

    // Update the title styles using the latest
    // styles. This function can be called many
    // times but will only run once in each tick.
    return this.setTitleStylesSoon(styles);
  },

  /**
   * Microtask debounced `runFontFit`
   *
   * @private
   */
  runFontFitSoon: function() {
    debug('run font-fit soon');
    if (this.pending.runFontFitSoon) { return; }
    this.pending.runFontFitSoon = this.nextTick(() => {
      delete this.pending.runFontFitSoon;
      this.runFontFit();
    });
  },

  /**
   * Get the style properties required
   * to fit and position the title text.
   *
   * @param  {HTMLH1Element} el
   * @param  {Number} space
   * @return {Object} {fontSize, marginStart, overflowing, id}
   * @private
   */
  getTitleStyle: function(el, space) {
    debug('get el style', el, space);
    var text = el.textContent;
    var styleId = text + space.value;

    // Bail when there's no text (or just whitespace)
    if (!text || !text.trim()) { return false; }

    // If neither the text or the titleSpace
    // changed, there's no reason to continue.
    if (getStyleId(el) === styleId) { return false; }

    var marginStart = this.getTitleMarginStart();
    var textSpace = space.value - Math.abs(marginStart);
    var fontFitResult = this.fontFit(text, textSpace);
    var overflowing = fontFitResult.textWidth > textSpace;
    var padding = { start: 0, end: 0 };

    // If the text is overflowing in the
    // centered title, we remove centering
    // to free up space, rerun fontFit to
    // get a fontSize which fits this space.
    if (overflowing) {
      debug('title overflowing');
      padding.start = !space.start ? TITLE_PADDING : 0;
      padding.end = !space.end ? TITLE_PADDING : 0;
      textSpace = space.value + padding.start + padding.end;
      fontFitResult = this.fontFit(text, textSpace);
      marginStart = 0;
    }

    return {
      id: styleId,
      fontSize: fontFitResult.fontSize,
      marginStart: marginStart,
      overflowing: overflowing,
      padding: padding
    };
  },

  /**
   * Set's styles on the title elements.
   *
   * If there is already an unresolved Promise
   * we return it instead of scheduling another.
   * This means that the function can be hammered
   * in the same sync-turn and will only run
   * once (like a debounce).
   *
   * @param {Array} styles
   * @return {Promise}
   */
  setTitleStylesSoon: function(styles) {
    debug('set title styles soon', styles);
    var key = 'setStyleTitlesSoon';

     // Always update styles
    this._titleStyles = styles;

    // Return existing unresolved
    // promise, or make a new one
    return this.unresolved[key] = this.unresolved[key] || new Promise((resolve) => {
      this.pending[key] = this.nextTick(() => {
        var styles = this._titleStyles;
        var els = this.els.titles;

        [].forEach.call(els, (el, i) => {
          if (!styles[i]) { return debug('exit'); }
          this.setTitleStyle(el, styles[i]);
        });

        // Clean up
        delete this._titleStyles;
        delete this.unresolved[key];
        delete this.pending[key];

        resolve();
      });
    });
  },

  /**
   * Fit text and center a title between
   * the buttons before and after.
   *
   * @param  {HTMLH1Element} title
   * @param  {Number} space
   * @return {Promise}
   * @private
   */
  setTitleStyle: function(el, style) {
    debug('set title style', style);
    this.observerStop();
    el.style.MozMarginStart = style.marginStart + 'px';
    el.style.MozPaddingStart = style.padding.start + 'px';
    el.style.MozPaddingEnd = style.padding.end + 'px';
    el.style.fontSize = style.fontSize + 'px';
    setStyleId(el, style.id);
    this.observerStart();
  },

  /**
   * Run font-fit on a title with
   * the given amount of content space.
   *
   * @param  {String} text
   * @param  {Number} space
   * @return {Object} {fontSize, textWidth}
   * @private
   */
  fontFit: function(text, space) {
    debug('font fit', text, space);
    return fontFit({
      font: TITLE_FONT,
      space: space,
      text: text,
      min: 16,
      max: 24
    });
  },

  /**
   * Start the observer listening
   * for DOM mutations.
   *
   * @private
   */
  observerStart: function() {
    if (this.observing) { return; }

    this.observer.observe(this, {
      childList: true,
      attributes: true,
      subtree: true
    });

    this.observing = true;
    debug('observer started');
  },

  /**
   * Stop the observer listening
   * for DOM mutations.
   *
   * @private
   */
  observerStop: function() {
    if (!this.observing) { return; }
    this.observer.disconnect();
    this.observing = false;
    debug('observer stopped');
  },

  /**
   * When the components DOM changes we run
   * the debounced version runFontFit.
   *
   * @param  {Array} mutations
   * @private
   */
  onMutation: function(mutations) {
    debug('on mutation', mutations);
    this.runFontFit();
  },

  /**
   * Get the title width.
   *
   * Returns the space available for <h1>.
   *
   * @return {Number}
   * @private
   */
  getTitleSpace: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var space = this.getWidth() - start - end;
    var result = {
      value: space,
      start: start,
      end: end
    };

    debug('get title space', result);
    return result;
  },

  /**
   * Get the width of the component.
   *
   * For performance reasons we make the
   * assumption that the width is the same
   * as `window.innerWidth` unless the
   * `not-flush` attribute is used.
   *
   * @return {Number}
   * @private
   */
  getWidth: function() {
    var value = this.notFlush
      ? this.clientWidth
      : window.innerWidth;

    debug('get width', value);
    return value;
  },

  /**
   * Triggers the 'action' button
   * (used in Gaia integration testing).
   *
   * @public
   */
  triggerAction: function() {
    if (this.action) { this.els.actionButton.click(); }
  },

  /**
   * Handle clicks on the action button.
   *
   * Fired pending to allow the 'click' event
   * to finish its event path before
   * dispatching the 'action' event.
   *
   * @param  {Event} e
   * @private
   */
  onActionButtonClick: function() {
    debug('action button click');
    var config = { detail: { type: this.action } };
    var e = new CustomEvent('action', config);
    setTimeout(() => this.dispatchEvent(e));
  },

  /**
   * Get the margin-start value required
   * to center the title between
   * surrounding buttons.
   *
   * @param  {Object} title
   * @return {Object}
   * @private
   */
  getTitleMarginStart: function() {
    var start = this.titleStart;
    var end = this.titleEnd;
    var marginStart = end - start;
    debug('get title margin start', marginStart);
    return marginStart;
  },

  /**
   * Get all the buttons (<a> & <button>)
   * before the first <h1>.
   *
   * @return {Array}
   * @private
   */
  getButtonsBeforeTitle: function() {
    var children = this.children;
    var l = children.length;
    var els = [];

    for (var i = 0; i < l; i++) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!isButton(el)) { continue; }
      els.push(el);
    }

    // Don't forget the action button
    if (this.action) { els.push(this.els.actionButton); }
    return els;
  },

  /**
   * Get all the buttons (<a> & <button>)
   * after the last <h1>.
   *
   * @return {Array}
   * @private
   */
  getButtonsAfterTitle: function() {
    var children = this.children;
    var els = [];

    for (var i = children.length - 1; i >= 0; i--) {
      var el = children[i];
      if (el.tagName === 'H1') { break; }
      if (!isButton(el)) { continue; }
      els.push(el);
    }

    return els;
  },

  /**
   * Get the sum of the width of
   * the given buttons.
   *
   * This function is optimized to avoid reading
   * `element.clientWidth` when possible.
   *
   * If a button is `display: none` it will
   * have a `.clientWidth` of 0, therefore won't
   * contribute anything to the overall sum.
   *
   * @param  {Array} buttons
   * @return {Number}
   * @private
   */
  sumButtonWidths: function(buttons) {
    var defaultWidth = 50;
    var sum = buttons.reduce((prev, button) => {
      var isStandardButton = button === this.els.actionButton;
      var width = isStandardButton ? defaultWidth : button.clientWidth;
      return prev + width;
    }, 0);

    debug('sum button widths', buttons, sum);
    return sum;
  },

  /**
   * Known attribute property
   * descriptors.
   *
   * These setters get called when matching
   * attributes change on the element.
   *
   * @type {Object}
   */
  attrs: {
    action: {
      get: function() { return this._action; },
      set: function(value) {
        var action = KNOWN_ACTIONS[value];
        if (action === this._action) { return; }
        this.setAttr('action', action);
        this._action = action;
      },
    },

    titleStart: {
      get: function() {
        debug('get title-start');
        if ('_titleStart' in this) { return this._titleStart; }
        var buttons = this.getButtonsBeforeTitle();
        var value = this.sumButtonWidths(buttons);
        debug('get title-start', buttons, value);
        return value;
      },

      set: function(value) {
        debug('set title-start', value);
        value = parseInt(value, 10);
        if (value === this._titleStart || isNaN(value)) { return; }
        this.setAttr('title-start', value);
        this._titleStart = value;
        debug('set');
      }
    },

    titleEnd: {
      get: function() {
        debug('get title-end');
        if ('_titleEnd' in this) { return this._titleEnd; }
        var buttons = this.getButtonsAfterTitle();
        return this.sumButtonWidths(buttons);
      },

      set: function(value) {
        debug('set title-end', value);
        value = parseInt(value, 10);
        if (value === this._titleEnd || isNaN(value)) { return; }
        this.setAttr('title-end', value);
        this._titleEnd = value;
      }
    },

    noFontFit: {
      get: function() { return this._noFontFit || false; },
      set: function(value) {
        debug('set no-font-fit', value);
        value = !!(value || value === '');

        if (value === this.noFontFit) { return; }
        this._noFontFit = value;

        if (value) { this.setAttr('no-font-fit', ''); }
        else { this.removeAttr('no-font-fit'); }
      }
    }
  },

  template: `<div class="inner">
    <button class="action-button">
      <content select=".l10n-action"></content>
    </button>
    <content select="h1,a,button"></content>
  </div>

  <style>

  :host {
    display: block;

    --gaia-header-button-color:
      var(--header-button-color,
      var(--header-color,
      var(--link-color,
      inherit)));
  }

  /**
   * [hidden]
   */

  :host[hidden] {
    display: none;
  }

  /** Reset
   ---------------------------------------------------------*/

  ::-moz-focus-inner { border: 0; }

  /** Inner
   ---------------------------------------------------------*/

  .inner {
    display: flex;
    min-height: 50px;
    direction: ltr;

    background:
      var(--header-background,
      var(--background,
      #fff));
  }

  /** Action Button
   ---------------------------------------------------------*/

  /**
   * 1. Hidden by default
   */

  .action-button {
    display: none; /* 1 */
    position: relative;
    width: 50px;
    font-size: 30px;
    margin: 0;
    padding: 0;
    border: 0;
    align-items: center;
    background: none;
    cursor: pointer;
    transition: opacity 200ms 280ms;

    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [action=back]
   * [action=menu]
   * [action=close]
   *
   * 1. For icon vertical-alignment
   */

  [action=back] .action-button,
  [action=menu] .action-button,
  [action=close] .action-button {
    display: flex; /* 1 */
  }

  /**
   * :active
   */

  .action-button:active {
    transition: none;
    opacity: 0.2;
  }

  /** Action Button Icon
   ---------------------------------------------------------*/

  .action-button:before {
    font-family: 'gaia-icons';
    font-style: normal;
    text-rendering: optimizeLegibility;
    font-weight: 500;
  }

  [action=close] .action-button:before { content: 'close' }
  [action=back] .action-button:before { content: 'back' }
  [action=menu] .action-button:before { content: 'menu' }

  /** Action Button Icon
   ---------------------------------------------------------*/

  /**
   * 1. To enable vertical alignment.
   */

  .action-button:before {
    display: block;
  }

  /** Action Button Text
   ---------------------------------------------------------*/

  /**
   * To provide custom localized content for
   * the action-button, we allow the user
   * to provide an element with the class
   * .l10n-action. This node is then
   * pulled inside the real action-button.
   *
   * Example:
   *
   *   <gaia-header action="back">
   *     <span class="l10n-action" aria-label="Back">Localized text</span>
   *     <h1>title</h1>
   *   </gaia-header>
   */

  ::content .l10n-action {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    font-size: 0;
  }

  /** Title
   ---------------------------------------------------------*/

  /**
   * 1. Vertically center text. We can't use flexbox
   *    here as it breaks text-overflow ellipsis
   *    without an inner div.
   */

  ::content h1 {
    flex: 1;
    margin: 0;
    padding: 0;
    overflow: hidden;

    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    line-height: 50px; /* 1 */
    font-weight: 300;
    font-style: italic;
    font-size: 24px;
    -moz-user-select: none;

    color:
      var(--header-title-color,
      var(--header-color,
      var(--title-color,
      var(--text-color,
      inherit))));
  }

  /** Buttons
   ---------------------------------------------------------*/

  ::content a,
  ::content button {
    position: relative;
    z-index: 1;
    box-sizing: border-box;
    display: flex;
    border: none;
    width: auto;
    height: auto;
    min-width: 50px;
    margin: 0;
    padding: 0 10px;

    font-size: 14px;
    line-height: 1;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    text-align: center;
    background: none;
    border-radius: 0;
    font-style: italic;
    cursor: pointer;
    transition: opacity 200ms 280ms;
    color: var(--gaia-header-button-color);
  }

  /**
   * :active
   */

  ::content a:active,
  ::content button:active {
    transition: none;
    opacity: 0.2;
  }

  /**
   * [hidden]
   */

  ::content a[hidden],
  ::content button[hidden] {
    display: none;
  }

  /**
   * [disabled]
   */

  ::content a[disabled],
  ::content button[disabled] {
    pointer-events: none;
    color: var(--header-disabled-button-color);
  }

  /** Icon Buttons
   ---------------------------------------------------------*/

  /**
   * Icons are a different color to text
   */

  ::content .icon,
  ::content [data-icon] {
    color:
      var(--header-icon-color,
      var(--gaia-header-button-color));
  }

  /**
   * If users want their action button
   * to be in the component's light-dom
   * they can add an .action class
   * to make it look like the
   * shadow action button.
   */

  ::content .action {
    color:
      var(--header-action-button-color,
      var(--header-icon-color,
      var(--gaia-header-button-color)));
  }

  /**
   * [data-icon]:empty
   *
   * Icon buttons with no textContent,
   * should always be 50px.
   *
   * This is to prevent buttons being
   * larger than they should be before
   * icon-font has loaded.
   */

  ::content [data-icon]:empty {
    width: 50px;
  }

  </style>`,

  // Test hook
  nextTick: nextTick
});

/**
 * Utils
 */

/**
 * Determines whether passed element
 * is regarded as a button in the
 * scope of gaia-header.
 *
 * @param  {Element}  el
 * @return {Boolean}
 */
function isButton(el) { return { BUTTON: true, A: true }[el.tagName]; }

/**
 * Set a 'style id' property that
 * can be retrieved later.
 *
 * Used to determine whether a title's
 * `style` needs to be updated or not.
 *
 * @param {Element} el
 * @param {String} id
 */
function setStyleId(el, id) { el._styleId = id; }

/**
 * Get a 'style id' property.
 *
 * Used to determine whether a title's
 * `style` needs to be updated or not.
 *
 * @param {Element} el
 * @param {String} id
 */
function getStyleId(el) { return el._styleId; }

/**
 * Calls callback at next 'microtask'.
 * Returns an object that has
 * a `.clear()` method.
 *
 * @param  {Function} fn
 * @return {Object} { clear }
 */
function nextTick(fn) {
  var cleared;
  Promise.resolve().then(() => { if (!cleared) { fn(); } });
  return { clear: function() { cleared = true; }};
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){'use strict';return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('gaia-header',this));

},{"font-fit":1,"gaia-component":2,"gaia-icons":3}]},{},[4])(4)
});