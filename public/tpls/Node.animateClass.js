//TODO: DEPRECATED, fix places used!
Node.prototype.animateClass = function(cl, end) {
	var me = this;
	var reverse = false;
console.log('animateClass deprecated');
//~ console.log('animateClass', cl, end, me);
	
	if ( typeof(end)=='string' && me.classList.contains(end) ) {
//~ console.log('reversing animationg, remove class ', end, me);
		me.classList.remove(end);
		reverse = true;
	}

	var func = function() {
		//~ console.log('animation ended, removing class', cl, end, me);
		
		me.classList.remove(cl);
		me.removeEventListener("animationend", func);
		me.removeEventListener("transitionend", func);
		me.removeEventListener("webkitAnimationEnd", func);
		me.removeEventListener("webkitTransitionEnd", func);
		
		if ( end ) {
			switch( typeof(end) ) {
			case 'string': 
				if (!reverse) {
					console.log('adding class !reverse', end, me);
					me.classList.add(end); 
				}
				break;
			case 'function': end.call(me); break;
			}
		}
	};
	this.addEventListener("animationend", func);
	this.addEventListener("transitionend", func);
	this.addEventListener("webkitAnimationEnd", func);
	this.addEventListener("webkitTransitionEnd", func);
	
	//~ console.log('adding class and waiting for ani end', cl, this);
	this.classList.add(cl);
	
};
