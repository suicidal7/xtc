window.fsTools = {
	mimeType: function(fn) {
		var ext = fsTools.ext( fn );
		if ( ext && ext.length ) return _MimeTypes[ext];
	},
	
	ext: function(fn) {
		var idx = fn.lastIndexOf('.');
		return ( idx > 0 ? fn.substr(idx+1) : '');
	},
	
	baseName: function(fn, trim) {
		if ( typeof(trim) === 'undefined' ) trim=0;
		if ( fn.substr(-1)=='/' ) fn = fn.substr(0, fn.length-1);
		var idx = fn.lastIndexOf('/');
		trim++;
		return ( idx > 0 ? fn.substr(idx+1, fn.length - idx - trim) : fn);
	},
	
	dirName: function(fn) {
		if ( fn.substr(-1)=='/' ) fn = fn.substr(0, fn.length-1);
		var idx = fn.lastIndexOf('/');
		return ( idx > 0 ? fn.substr(0, idx) : fn);
	},

	formatSize: function(sz) {
		if ( sz > 1000000000000 ) {
			sz = Math.round(sz / 1000000000000)+' TB';
		}
		else if ( sz > 1000000000 ) {
			sz = Math.round(sz / 1000000000)+' GB';
		}
		else if ( sz > 1000000 ) {
			sz = Math.round(sz / 1000000)+' MB';
		}
		else if ( sz > 1000 ) {
			sz = Math.round(sz / 1000)+' KB';
		}
		else {
			sz = sz +' B';
		}
		return sz;
	},
	
	nodeType: function(mode) { //mode from stat
		/*
S_IFMT     0170000   bit mask for the file type bit fields
S_IFSOCK   0140000   socket
S_IFLNK    0120000   symbolic link
S_IFREG    0100000   regular file
S_IFBLK    0060000   block device
S_IFDIR    0040000   directory
S_IFCHR    0020000   character device
S_IFIFO    0010000   FIFO
S_ISUID    0004000   set UID bit
S_ISGID    0002000   set-group-ID bit (see below)
S_ISVTX    0001000   sticky bit (see below)
S_IRWXU    00700     mask for file owner permissions
S_IRUSR    00400     owner has read permission
S_IWUSR    00200     owner has write permission1
S_IXUSR    00100     owner has execute permission
		*/
		mode = mode & 0170000;
		if ( mode == 0040000 ) return 'folder';
		if ( mode == 0100000 ) return 'file';
		if ( mode == 0120000 ) return 'symlink';
		return false; //unknown for now
	},
	
	cleanPath: function(path) {
		if ( !path || !path.length ) return '/';
		path = path.split('/');
		var res = [];
		for(var i=0; i<path.length; i++) {
			if ( path[i] == '.' ) continue;
			else if ( path[i] == '..' ) res.pop();
			else if ( path[i].length ) res.push(path[i]);
		}
		res = res.join('/');
		return !res.length ? '/' : '/'+res;
	},
	
};

