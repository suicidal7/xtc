Node.prototype.appendHtml = function(html) {
	jFresh._dummyContainer.innerHTML = html;
	var els = [];
	if ( jFresh._dummyContainer.children.length ) {
		while(jFresh._dummyContainer.children.length) {
			els.push( jFresh._dummyContainer.children[0] );
			this.appendChild(jFresh._dummyContainer.children[0]);
		}
	}
	else {
		this.innerHTML += html;
		els.push(html);
	}
	return els.length > 1 ? els : els[0];
};
