

Creating new Components:

xtc.objConstructor takes 1 arg, a function to execute once and only once per Component type

	document.registerElement('xtc-workspace', {prototype: Object.create(HTMLElement.prototype, {
		createdCallback: {
			value: new xtc.objConstructor
		},
	})});
	
- to prevent conflicts with DOM tree: 
	+ define new Component properties starting with $ , eg $title
	+ when in need to store data for the object ( jQuery.data() ), use this._xtc,  eg this._xtc.foobar=1
