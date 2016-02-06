Node.prototype.index = function() {
	var e = this, i=0;
	while( (e=e.previousElementSibling)!=null ) i++;
	return i;
}

Node.prototype.nearest = function(sel,shadowBreak) {
	for(var p=this; (!p.matches || !p.matches(sel)) && (p.parentNode || (shadowBreak && p.host)); p = p.host ? p.host : p.parentNode) {}
	if ( p.matches && p.matches(sel) ) return p;
	if (p && p.querySelector) return p.querySelector(sel);
};

Node.prototype.closest = function(sel) {
	var p = this;
	while(!p.matches(sel) && !p.querySelector(sel) && p.parentNode && p.parentNode.matches) p = p.parentNode;
console.log('closest',p,sel);
	return p.matches(sel) ? p : p.querySelector(sel);
};

Node.prototype.parent = function(sel) {
	var p = this;
	while(!p.matches(sel) && p.parentNode && p.parentNode.matches && p.parentNode.tagName!='HTML') p = p.parentNode;
	return p.matches(sel) ? p : null;
};

Node.prototype.hide = function() {
	var style = window.getComputedStyle(this);
	this.__display__ = style.display;
	this.style.display = 'none';
};

Node.prototype.show = function() {
	this.style.display = this.__display__ || 'block';
};

Node.prototype.toggle = function() {
	this[this.__display__ ? 'show' : 'hide']();
};

Node.prototype.toggleClass = function(cls) {
	this.classList[ this.classList.contains(cls) ? 'remove' : 'add' ](cls);
	return this;
};

//~ Node.prototype.slideHide = function() {
	//~ this.style.transition = 'height 0.5s ease-in-out';
	//~ var me = this;
	//~ setTimeout(function() {
		//~ var style = window.getComputedStyle(me);
		//~ me.__height__ = style.height;
		//~ me.__overflow__ = style.overflow;
		//~ me.style.height = '0px';
		//~ me.style.overflow = 'hidden';
	//~ }, 1);
//~ };

//~ Node.prototype.slideShow = function() {
	//~ if ( !this.__height__ ) return;
	
	//~ this.style.height = this.__height__;
	//~ var onEnd = function() {
		//~ this.style.overflow = this.__overflow__;
		//~ delete this.__height__;
		//~ delete this.__overflow__;
		//~ this.removeEventListener('webkitTransitionEnd', onEnd);
//~ console.log('on end');
	//~ };
	//~ this.addEventListener('webkitTransitionEnd', onEnd);
//~ };


//~ Node.prototype.slideToggle = function() {
	//~ this[this.__height__ ? 'slideShow' : 'slideHide']();
//~ };



Node.prototype.tether = function(cb) {
console.log('tethering to ', this);
	if ( !this.hasOwnProperty('__TETHERED__') ) {
		this.__TETHERED__ = [];
		this.classList.add('__TETHERED__');
	}
	
	this.__TETHERED__.push(cb);
};


Node.prototype.fireEvent = function(event, udata){
	if (document.createEventObject){
		// dispatch for IE
		var evt = document.createEventObject();
		evt.userData = udata;
		return this.fireEvent('on'+event,evt)
	}
	else{
		// dispatch for firefox + others
		var evt = document.createEvent("HTMLEvents");
		evt.initEvent(event, true, true ); // event type,bubbling,cancelable
		evt.userData = udata;
		return !this.dispatchEvent(evt);
	}
};



Node.prototype.position = function(args) {
	var opts = xtc.extend(true, {
		my: 'top left',
		at: 'top left',
		of: '',
		offset: {x: 0, y: 0}
	}, args);
	
	if ( !opts.of ) return;
console.log('SEtting position', opts, this);
	
	var myStyle = window.getComputedStyle(this);
	var style = this.getBoundingClientRect();
	var ofStyle = opts.of.getBoundingClientRect();
	style.height = style.height + parseInt(myStyle.marginTop) + parseInt(myStyle.marginBottom);
	opts.my = opts.my.split(/\s+/);
	opts.at = opts.at.split(/\s+/);

	if ( opts.my[0] == 'top' ) {
		if ( opts.at[0] == 'top' ) {
			this.style.top = (ofStyle.top+parseInt(myStyle.marginTop)+opts.offset.y) + 'px';
		}
		else if ( opts.at[0] == 'bottom' ) {
			this.style.top = (ofStyle.top+ofStyle.height+parseInt(myStyle.marginTop)+opts.offset.y) +'px';
		}
	}
	else if ( opts.my[0] == 'bottom' ) {
		if ( opts.at[0] == 'top' ) {
			this.style.top = (ofStyle.top-style.height-parseInt(myStyle.marginBottom)-opts.offset.y) +'px';
		}
		else if ( opts.at[0] == 'bottom' ) {
			this.style.top = (ofStyle.top+ofStyle.height-style.height-parseInt(myStyle.marginBottom)-opts.offset.y) +'px';
		}
	}
	
	if ( opts.my[1] == 'left' ) {
		if ( opts.at[1] == 'left' ) {
			this.style.left = ofStyle.left+parseInt(myStyle.marginLeft)+opts.offset.x+ 'px';
		}
		else if ( opts.at[1] == 'right' ) {
			this.style.left = (ofStyle.left+ofStyle.width+parseInt(myStyle.marginLeft))+opts.offset.x+'px';
		}
	}
	else if ( opts.my[1] == 'right' ) {
		if ( opts.at[1] == 'left' ) {
			this.style.left = (parseInt(ofStyle.left) - parseInt(style.width) - parseInt(myStyle.marginRight)-opts.offset.x)+'px';
		}
		else if ( opts.at[1] == 'right' ) {
			this.style.left = (parseInt(ofStyle.left)+parseInt(ofStyle.width)-parseInt(style.width) - parseInt(myStyle.marginRight)-opts.offset.x)+'px';
		}
	}
	
}

Node.prototype.scrollTo = function() {
	var parentScrollHeight = this.parentNode.scrollHeight
		, parentScrollWidth = this.parentNode.scrollWidth
		, parentStyle = window.getComputedStyle(this.parentNode)
		, parentHeight = parseInt(parentStyle.height)
		, parentWidth = parseInt(parentStyle.width)
		, style = window.getComputedStyle(this)
	;
	
	var slide = function(x, el) {
		var diff = (x - el.scrollLeft)/10;
		var fn = function() {
			el.scrollLeft = el.scrollLeft + diff;
//~ console.log('stepping scroll', el.scrollLeft, diff, x);
			if ( Math.abs(el.scrollLeft - x) > Math.abs(diff)*2 ) setTimeout(fn, 120);
			else el.scrollLeft = x;
		};
		fn();
		setTimeout(fn, 100);
	};
	
	if ( parentScrollHeight - parentHeight > 1 ) {
	}
	if ( parentScrollWidth - parentWidth > 1 ) {
		slide( this.offsetLeft, this.parentNode );
	}
	
	
	return this;
};
