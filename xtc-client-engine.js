xtc = {
	templates: {}, //allows override of default template : may have deprecated this!
	skins: {},
	globalHooks: {},
	registeredElements: {},
	_onBeforeUnloadChain: [],
	mutationObservers: {},
	
	findAllKeyFrames: function() {
		// gather all stylesheets into an array
		var ss = document.styleSheets;
		var res = [];
		// loop through the stylesheets
		for (var i = 0; i < ss.length; ++i) {
			// loop through all the rules
			for (var j = 0; j < ss[i].cssRules.length; ++j) {
				// find the -webkit-keyframe rule whose name matches our passed over parameter and return that rule
				if (ss[i].cssRules[j].type == window.CSSRule.WEBKIT_KEYFRAMES_RULE ) // && ss[i].cssRules[j].name == rule)
					res.push( ss[i].cssRules[j] );
			}
		}
		return res;
	},
		
	
	extend: function() {
		var i = 0, deepCopy=false, obj;
		if (arguments.length<1) return;
		if (arguments[0] === true) {
			deepCopy = true;
			i++;
		}
		var target = arguments[i++];
		for(;i<arguments.length;i++) {
			//(deep)copy each element into this one...
			obj = arguments[i];
			if ( typeof(obj)!='object') continue;
			for(var k in obj) {
				if (!obj.hasOwnProperty(k)) continue;
				if ( deepCopy && obj[k] instanceof Object && !(obj[k] instanceof Node)  ) {
					if ( !target.hasOwnProperty(k) ) target[k] = {};
					xtc.extend(target[k], obj[k]);
				}
				else {
					target[k] = obj[k];
				}
			}
		}
		return target;
	},

	setCookie: function(cname, cvalue, exdays) {
		var d = new Date();
		d.setTime(d.getTime() + (exdays*24*60*60*1000));
		var expires = "expires="+d.toUTCString();
		document.cookie = cname + "=" + cvalue + "; " + expires;
	},
	
	uuid: function() {
		var d = new Date().getTime();
		var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = (d + Math.random()*16)%16 | 0;
				d = Math.floor(d/16);
				return (c=='x' ? r : (r&0x7|0x8)).toString(16);
		});
		return uuid;
	},

	onBeforeUnload: function(fn) {
		xtc._onBeforeUnloadChain.push(fn);
	},


	
	
	animateEl: function(el, apply, end, aniOpts) {
		if ( typeof(aniOpts)=='string' ) aniOpts = {tClass: aniOpts};
		aniOpts = xtc.extend({
			//transition class to use that defines something like -webkit-transition: all 0.5s ease-in-out;
			// in jquery we pass it args to build this, but i'm trying to keep this skinned in css without css js mods
			tClass: '', 
			tOn: 'all',
			tSpeed: '0.5s',
			tEffect: 'ease-in-out'
		}, aniOpts);
		
		var me = el
			, prevStyles = {}
			, style = window.getComputedStyle(me)
			, savedTransition = style.webkitTransition
			, savedTStyle = me.style.transform
		;
		
		if ( !aniOpts.tClass ) me.style.webkitTransition = aniOpts.tOn + ' ' + aniOpts.tSpeed + ' ' + aniOpts.tEffect;
		else me.classList.add(aniOpts.tClass);
		
		//apply the user's stuff
		if ( typeof(apply)=='string') {
			if ( apply[0]=='-' ) me.classList.remove(apply.substr(1));
			else me.classList.add(apply);
		}
		else if (apply) {
			
			
			//TODO: replace this part with native animate!!!
			
			for(var k in apply) {
				if ( !apply.hasOwnProperty(k) ) continue;
				prevStyles[k] = style[k];
				me.style[k] = apply[k];
			}
			
			
		}
		
		var func = function() {
			if ( !aniOpts.tClass ) me.style.webkitTransition = savedTransition;
			else me.classList.remove(aniOpts.tClass);
			//~ me.removeEventListener("animationend", func);
			//~ me.removeEventListener("transitionend", func);
			me.removeEventListener("webkitAnimationEnd", func);
			me.removeEventListener("webkitTransitionEnd", func);
			
			if ( end ) end.call(me);
		};
		//~ this.addEventListener("animationend", func);
		//~ this.addEventListener("transitionend", func);
		me.addEventListener("webkitAnimationEnd", func);
		me.addEventListener("webkitTransitionEnd", func);
		
		if ( prevStyles.transform && savedTStyle ) prevStyles.transform = savedTStyle;
		
		return prevStyles;
	},

	
};

window.addEventListener('touchstart', function(ev) {
	ev.target.fireEvent('mousedown');
});
window.addEventListener('touchend', function(ev) {
	ev.target.fireEvent('mouseup');
});
window.addEventListener('touchmove', function(ev) {
	ev.target.fireEvent('mousemove');
});


xtc._realRegisterElement = document.registerElement;

document.registerElement = function(tag, opts) {
//~ console.log('registerElement', tag, opts, xtc._realRegisterElement);
	var newEl = xtc._realRegisterElement.call(document, tag, opts);
	xtc.registeredElements[ tag ] = newEl;
	return newEl;
};

xtc._defBeforeUnload = window.onbeforeunload;
window.onbeforeunload = function() {
	if ( !confirm("ok?","you sure?!!!") ) return false;
	
	if ( xtc._defBeforeUnload ) xtc._defBeforeUnload();
	for(var i=0; i<xtc._onBeforeUnloadChain.length; i++) xtc._onBeforeUnloadChain[i]();
	console.log('BYEBYE! :(  foobar= xtc-xsocket');
};

xtc.__createShadowRoot = HTMLElement.prototype.createShadowRoot;
HTMLElement.prototype.createShadowRoot = function() {
	//~ console.log('shadow root created on', this);
	if ( !this.shadowRoots ) this.shadowRoots = [];
	var shadowRoot = xtc.__createShadowRoot.apply(this, arguments);
	this.shadowRoots.push(shadowRoot);
	return shadowRoot;
};

/*
XtcNode = {};
	
XtcNode.prototype = {
	createdCallback: { value: function() {
		this._xtc={};
		var tagName = this.getAttribute('is') ||  this.tagName.toLowerCase();
		var tpl = document.getElementById( xtc.templates[ tagName ] ? xtc.templates[ tagName ].skin : tagName );
	console.log('creating', tagName, tpl);
		if ( tpl ) {
			var shadowed = tpl.hasAttribute('data-shadowed');
console.log('tpl is shadowed', shadowed, tpl);
			if ( !shadowed ) {
				var shadowedDataEl = tpl.getAttribute('data-xtc-shadow-el');
				if ( shadowedDataEl ) {
					//instead of applying this template to the given element,
					// we watch the element's children and check for any new of
					// the given type and shadow those with this template!
					this.shadowElements( tpl, tagName, shadowedDataEl );
				}
				else {
					var clone = document.importNode(tpl.content, true);
					this.appendChild(clone);
				}
			}
			else {
				var clone = document.importNode(tpl.content, true);
				var shadowRoot = this.createShadowRoot();
				shadowRoot.appendChild(clone);
		//~ console.log('Template cloned:', tagName, shadowRoot);
				//hack the fucking shadow root style sheet! FUCK U CHROME! no wait, i <3 u chrome!!! PLS DONT LEAVE ME!!
				if ( shadowRoot.styleSheets[0] ) { //todo: do we need to add a sheet or it works in this case?! should test & fix accordingly
					var keyFrames = xtc.findAllKeyFrames();
					for(var i=0; i<keyFrames.length; i++) {
						shadowRoot.styleSheets[0].insertRule( keyFrames[i].cssText, shadowRoot.styleSheets[0].rules.length )
					}
				}
			}
		}
		
		if ( this.globalHook && !xtc.globalHooks.hasOwnProperty(tagName) ) {
			xtc.globalHooks[tagName] = 1;
			this.globalHook();
		}
		
		if ( this._createdCallback ) this._createdCallback();
	} },

	shadowElements: { value: function(tpl, tagName, elTag) {
		var me = this;
		elTag = elTag.toUpperCase();
		var obj = xtc.templates[ tagName ];
		
		this._xtc.__shadowObserver = new MutationObserver(function(mutations) {
			console.log('mutation observed!', mutations, me);
			var m, n;
			for(var i=0; i<mutations.length; i++) {
				m = mutations[i];
				for(var k=0; k<m.addedNodes.length; k++) {
					n = m.addedNodes[k];
					if ( n.tagName!=elTag ) continue;
					var clone = document.importNode(tpl.content, true);
					
					var shadowRoot = n.createShadowRoot();
					shadowRoot.appendChild(clone);
					var shadowElFn = obj && obj.fn ? obj.fn.onShadowedEl : me.onShadowedEl;
					if ( shadowElFn ) shadowElFn(n, shadowRoot);
				}
			}
			//~ if ( me.onMutation ) me.onMutation(mutation);
		});
		
		this._xtc.__shadowObserver.observe(this, {childList: true});
	} },
	
	attachedCallback: { value: function() {
	//~ console.log('attachCallback', this._xtc.lastParent , this.parentNode);
		if ( ! this.__attachedCallback__seen  ) {
			this.__attachedCallback__seen = true;
			
			//add our xtc-resizable attribute handler
			//check for xtc-* and create elements based on them, eg=> xtc-resizable="north south east west" would result in appending 8 <xtc-resizable is="{direction}"/> to the element
			var attr, tpl;
			for(var i=0; i<this.attributes.length; i++) {
				attr = this.attributes[i];
				if ( attr.name.substr(0,5)=='data-' ) continue;
				if ( XTCNode.attributeHelpers.hasOwnProperty(attr.name) ) XTCNode.attributeHelpers[attr.name].call(this, attr.value);
				else if ( (tpl=document.getElementById(attr.name)) && tpl.tagName=='TEMPLATE'  ) {
					if ( this._xtc['__shadowed__'+attr.name] ) continue;
		//~ console.log('shadow marked', attr.name, this);
					this._xtc['__shadowed__'+attr.name] = 1;
					var clone = document.importNode(tpl.content, true);
					this.appendChild(clone);
					//~ var shadowRoot = this.createShadowRoot();
					//~ shadowRoot.appendChild(clone);
				}
			}
		}
		if ( this._attachedCallback ) this._attachedCallback.call(this);
	} },

	detachedCallback: { value: function() {
		if ( this._detachedCallback ) this._detachedCallback();
	} },

	attributeChangedCallback: { value: function(attrName, oldVal, newVal) {
		//~ console.log('attrchange: name=%s, old=%s, new=%s, shadowed=%s',attrName, oldVal, newVal, this._xtc['__shadowed__'+attrName]);
		var tpl;
		if ( attrName.substr(0,5)!='data-' ) {
		//~ console.log('XTCNode.attributeHelpers.hasOwnProperty(attrName)', attrName, XTCNode.attributeHelpers.hasOwnProperty(attrName) );
			if ( XTCNode.attributeHelpers.hasOwnProperty(attrName) ) {
				XTCNode.attributeHelpers[attrName].call(this, newVal, oldVal);
			}
			else if ( (tpl=document.getElementById(attrName)) && tpl.tagName=='TEMPLATE'  ) {
					if ( this._xtc['__shadowed__'+attrName] ) return;
					this._xtc['__shadowed__'+attrName] = 1;

				//by default, when u find an attribute, try to match it to a template name, if so
				// we shadow the template over the element
				var clone = document.importNode(tpl.content, true);
				this.appendChild(clone);
				//~ var shadowRoot = this.createShadowRoot();
				//~ shadowRoot.appendChild(clone);
				//todo: check if we need the keyframes hack crap here?!
			}
		}
		if ( this._attributeChangedCallback ) this._attributeChangedCallback.apply(this, arguments);
	} },

	animateEl: { value: function(apply, end, aniOpts) {
		if ( typeof(aniOpts)=='string' ) aniOpts = {tClass: aniOpts};
		aniOpts = xtc.extend({
			//transition class to use that defines something like -webkit-transition: all 0.5s ease-in-out;
			// in jquery we pass it args to build this, but i'm trying to keep this skinned in css without css js mods
			tClass: '', 
			tOn: 'all',
			tSpeed: '0.5s',
			tEffect: 'ease-in-out'
		}, aniOpts);
		
		var me = this
			, prevStyles = {}
			, style = window.getComputedStyle(me)
			, savedTransition = style.webkitTransition
			, savedTStyle = me.style.transform
		;
		
		if ( !aniOpts.tClass ) me.style.webkitTransition = aniOpts.tOn + ' ' + aniOpts.tSpeed + ' ' + aniOpts.tEffect;
		else me.classList.add(aniOpts.tClass);
		
		//apply the user's stuff
		if ( typeof(apply)=='string') {
			if ( apply[0]=='-' ) me.classList.remove(apply.substr(1));
			else me.classList.add(apply);
		}
		else if (apply) {
			
			
			//TODO: replace this part with native animate!!!
			
			for(var k in apply) {
				if ( !apply.hasOwnProperty(k) ) continue;
				prevStyles[k] = style[k];
				me.style[k] = apply[k];
			}
			
			
		}
		
		var func = function() {
			if ( !aniOpts.tClass ) me.style.webkitTransition = savedTransition;
			else me.classList.remove(aniOpts.tClass);
			//~ me.removeEventListener("animationend", func);
			//~ me.removeEventListener("transitionend", func);
			me.removeEventListener("webkitAnimationEnd", func);
			me.removeEventListener("webkitTransitionEnd", func);
			
			if ( end ) end.call(me);
		};
		//~ this.addEventListener("animationend", func);
		//~ this.addEventListener("transitionend", func);
		this.addEventListener("webkitAnimationEnd", func);
		this.addEventListener("webkitTransitionEnd", func);
		
		if ( prevStyles.transform && savedTStyle ) prevStyles.transform = savedTStyle;
		
		return prevStyles;
	} },

	
};


XTCNode = function() {
};

XTCNode.prototype = Object.create(HTMLElement.prototype, {
	createdCallback: { value: function() {
		this._xtc={};
		var tagName = this.tagName.toLowerCase();
		var tpl = document.getElementById( xtc.templates[ tagName ] ? xtc.templates[ tagName ].skin : tagName );
	//~ console.log('creating', tagName, tpl);
		if ( tpl ) {
			var shadowed = tpl.hasAttribute('data-shadowed');
			if ( !shadowed ) {
				var shadowedDataEl = tpl.getAttribute('data-xtc-shadow-el');
				if ( shadowedDataEl ) {
					//instead of applying this template to the given element,
					// we watch the element's children and check for any new of
					// the given type and shadow those with this template!
					this.shadowElements( tpl, tagName, shadowedDataEl );
				}
				else {
					var clone = document.importNode(tpl.content, true);
					this.appendChild(clone);
				}
			}
			else {
				var clone = document.importNode(tpl.content, true);
				var shadowRoot = this.createShadowRoot();
				shadowRoot.appendChild(clone);
		//~ console.log('Template cloned:', tagName, shadowRoot);
				//hack the fucking shadow root style sheet! FUCK U CHROME! no wait, i <3 u chrome!!! PLS DONT LEAVE ME!!
				if ( shadowRoot.styleSheets[0] ) { //todo: do we need to add a sheet or it works in this case?! should test & fix accordingly
					var keyFrames = xtc.findAllKeyFrames();
					for(var i=0; i<keyFrames.length; i++) {
						shadowRoot.styleSheets[0].insertRule( keyFrames[i].cssText, shadowRoot.styleSheets[0].rules.length )
					}
				}
			}
		}
		
		if ( this.globalHook && !xtc.globalHooks.hasOwnProperty(tagName) ) {
			xtc.globalHooks[tagName] = 1;
			this.globalHook();
		}
		
		if ( this._createdCallback ) this._createdCallback();
	} },

	shadowElements: { value: function(tpl, tagName, elTag) {
		var me = this;
		elTag = elTag.toUpperCase();
		var obj = xtc.templates[ tagName ];
		
		this._xtc.__shadowObserver = new MutationObserver(function(mutations) {
			console.log('mutation observed!', mutations, me);
			var m, n;
			for(var i=0; i<mutations.length; i++) {
				m = mutations[i];
				for(var k=0; k<m.addedNodes.length; k++) {
					n = m.addedNodes[k];
					if ( n.tagName!=elTag ) continue;
					var clone = document.importNode(tpl.content, true);
					
					var shadowRoot = n.createShadowRoot();
					shadowRoot.appendChild(clone);
					var shadowElFn = obj.fn.onShadowedEl || me.onShadowedEl;
					if ( shadowElFn ) shadowElFn(n, shadowRoot);
				}
			}
			//~ if ( me.onMutation ) me.onMutation(mutation);
		});
		
		this._xtc.__shadowObserver.observe(this, {childList: true});
	} },
	
	attachedCallback: { value: function() {
	//~ console.log('attachCallback', this._xtc.lastParent , this.parentNode);
		if ( ! this.__attachedCallback__seen  ) {
			this.__attachedCallback__seen = true;
			
			//add our xtc-resizable attribute handler
			//check for xtc-* and create elements based on them, eg=> xtc-resizable="north south east west" would result in appending 8 <xtc-resizable is="{direction}"/> to the element
			var attr, tpl;
			for(var i=0; i<this.attributes.length; i++) {
				attr = this.attributes[i];
				if ( attr.name.substr(0,5)=='data-' ) continue;
				if ( XTCNode.attributeHelpers.hasOwnProperty(attr.name) ) XTCNode.attributeHelpers[attr.name].call(this, attr.value);
				else if ( (tpl=document.getElementById(attr.name)) && tpl.tagName=='TEMPLATE'  ) {
					if ( this._xtc['__shadowed__'+attr.name] ) continue;
		//~ console.log('shadow marked', attr.name, this);
					this._xtc['__shadowed__'+attr.name] = 1;
					var clone = document.importNode(tpl.content, true);
					this.appendChild(clone);
					//~ var shadowRoot = this.createShadowRoot();
					//~ shadowRoot.appendChild(clone);
				}
			}
		}
		if ( this._attachedCallback ) this._attachedCallback.call(this);
	} },

	detachedCallback: { value: function() {
		if ( this._detachedCallback ) this._detachedCallback();
	} },

	attributeChangedCallback: { value: function(attrName, oldVal, newVal) {
		//~ console.log('attrchange: name=%s, old=%s, new=%s, shadowed=%s',attrName, oldVal, newVal, this._xtc['__shadowed__'+attrName]);
		var tpl;
		if ( attrName.substr(0,5)!='data-' ) {
		//~ console.log('XTCNode.attributeHelpers.hasOwnProperty(attrName)', attrName, XTCNode.attributeHelpers.hasOwnProperty(attrName) );
			if ( XTCNode.attributeHelpers.hasOwnProperty(attrName) ) {
				XTCNode.attributeHelpers[attrName].call(this, newVal, oldVal);
			}
			else if ( (tpl=document.getElementById(attrName)) && tpl.tagName=='TEMPLATE'  ) {
					if ( this._xtc['__shadowed__'+attrName] ) return;
					this._xtc['__shadowed__'+attrName] = 1;

				//by default, when u find an attribute, try to match it to a template name, if so
				// we shadow the template over the element
				var clone = document.importNode(tpl.content, true);
				this.appendChild(clone);
				//~ var shadowRoot = this.createShadowRoot();
				//~ shadowRoot.appendChild(clone);
				//todo: check if we need the keyframes hack crap here?!
			}
		}
		if ( this._attributeChangedCallback ) this._attributeChangedCallback.apply(this, arguments);
	} },

	animateEl: { value: function(apply, end, aniOpts) {
		if ( typeof(aniOpts)=='string' ) aniOpts = {tClass: aniOpts};
		aniOpts = xtc.extend({
			//transition class to use that defines something like -webkit-transition: all 0.5s ease-in-out;
			// in jquery we pass it args to build this, but i'm trying to keep this skinned in css without css js mods
			tClass: '', 
			tOn: 'all',
			tSpeed: '0.5s',
			tEffect: 'ease-in-out'
		}, aniOpts);
		
		var me = this
			, prevStyles = {}
			, style = window.getComputedStyle(me)
			, savedTransition = style.webkitTransition
			, savedTStyle = me.style.transform
		;
		
		if ( !aniOpts.tClass ) me.style.webkitTransition = aniOpts.tOn + ' ' + aniOpts.tSpeed + ' ' + aniOpts.tEffect;
		else me.classList.add(aniOpts.tClass);
		
		//apply the user's stuff
		if ( typeof(apply)=='string') {
			if ( apply[0]=='-' ) me.classList.remove(apply.substr(1));
			else me.classList.add(apply);
		}
		else if (apply) {
			
			
			//TODO: replace this part with native animate!!!
			
			for(var k in apply) {
				if ( !apply.hasOwnProperty(k) ) continue;
				prevStyles[k] = style[k];
				me.style[k] = apply[k];
			}
			
			
		}
		
		var func = function() {
			if ( !aniOpts.tClass ) me.style.webkitTransition = savedTransition;
			else me.classList.remove(aniOpts.tClass);
			//~ me.removeEventListener("animationend", func);
			//~ me.removeEventListener("transitionend", func);
			me.removeEventListener("webkitAnimationEnd", func);
			me.removeEventListener("webkitTransitionEnd", func);
			
			if ( end ) end.call(me);
		};
		//~ this.addEventListener("animationend", func);
		//~ this.addEventListener("transitionend", func);
		this.addEventListener("webkitAnimationEnd", func);
		this.addEventListener("webkitTransitionEnd", func);
		
		if ( prevStyles.transform && savedTStyle ) prevStyles.transform = savedTStyle;
		
		return prevStyles;
	} },

	
});
XTCNode.attributeHelpers = {}; //if set, then an element attribute change will call the defined function, eg: XTCNode.attributeHelpers['data-uid']=function(){}; will trigger the function each time an element that is a child of XTCNode changes its data-uid attr!

*/
	
	
// Closure
(function(){

	/**
	 * Decimal adjustment of a number.
	 *
	 * @param	{String}	type	The type of adjustment.
	 * @param	{Number}	value	The number.
	 * @param	{Integer}	exp		The exponent (the 10 logarithm of the adjustment base).
	 * @returns	{Number}			The adjusted value.
	 */
	function decimalAdjust(type, value, exp) {
		// If the exp is undefined or zero...
		if (typeof exp === 'undefined' || +exp === 0) {
			return Math[type](value);
		}
		value = +value;
		exp = +exp;
		// If the value is not a number or the exp is not an integer...
		if (isNaN(value) || !(typeof exp === 'number' && exp % 1 === 0)) {
			return NaN;
		}
		// Shift
		value = value.toString().split('e');
		value = Math[type](+(value[0] + 'e' + (value[1] ? (+value[1] - exp) : -exp)));
		// Shift back
		value = value.toString().split('e');
		return +(value[0] + 'e' + (value[1] ? (+value[1] + exp) : exp));
	}

	// Decimal round
	if (!Math.round10) {
		Math.round10 = function(value, exp) {
			return decimalAdjust('round', value, exp);
		};
	}
	// Decimal floor
	if (!Math.floor10) {
		Math.floor10 = function(value, exp) {
			return decimalAdjust('floor', value, exp);
		};
	}
	// Decimal ceil
	if (!Math.ceil10) {
		Math.ceil10 = function(value, exp) {
			return decimalAdjust('ceil', value, exp);
		};
	}

})();