var pty = require('pty.js')
	, fs = require('fs')
	, extend = require('extend')
	, mime = require('mime')
	, waitpid = require('waitpid')
	, terminals = {}
;

var xpose = {
	pty: pty,
	fs: fs
};

function launch_terminal(tid) {
	process.env['TERM'] = 'xterm-color';
	
	var term =  pty.spawn('bash', ['-i', '-l'], {
		name: 'xterm-color',
		cols: 80,
		rows: 30,
		cwd: process.env.HOME,
		env: process.env
	});
	
	term.on('data', function(data) {
//~ console.log('term data', data);
		process.send({o: tid, d: data});
	});
	
	term.on('exit', function(code,signal) {
			console.log('term EXIT', code, signal);
		waitpid(term.pid);
		term.destroy();
		delete terminals[tid];
	});
	term.on('error', function() {
		console.log('TERM ERROR!', arguments);
	});
	
	terminals[tid] = term;
}

//stat + mimetype
fs.istat = function(path) {
	var st = fs.lstatSync(path);
	st.mimetype = mime.lookup(path);
	return st;
}

fs.glob = function(path, _opts) {
	var opts = extend({
		filter: '*',
		details: false,
		folders: true,
		files: true,
		hidden: false,
	}, _opts);
//~ console.log('fs.glob', path, _opts);
	var st, f,
		regExp = opts.filter=='*' || opts.filter=='' ? false : new RegExp('('+opts.filter.replace(/;/g,'|').replace(/\./g,'\\.').replace(/\*/g,'.*')+')$');
		files = fs.readdirSync(path)
	;
	
	//checks
	var rx = function() { return regExp && !regExp.exec(f) };
	var hdn = function() { return !opts.hidden && f[0]=='.' };
	var dtl = function() { 
		//we need stat!?
		if ( opts.details || !opts.folders || !opts.files ) {
			var stat = fs.istat(path+'/'+f);
			if ( !opts.folders && stat.isDirectory() ) return true;
			if ( !opts.files && stat.isFile() ) return true;
		}
		return false;
	};
	
	for(var i=files.length-1; i>-1; i--) {
		var f = files[i];
		if ( rx() || hdn() || dtl() ) {
			files.splice(i, 1);
			continue;
		}
		if ( opts.details ) {
			st = fs.istat(path+'/'+files[i]);
			st.name = files[i];
			st.mtime = st.mtime.getTime();
			st.atime = st.atime.getTime();
			st.ctime = st.ctime.getTime();
			st.type = (st.isDirectory() ? 'folder' : ( st.isFile() ? 'file' : ( st.isSymbolicLink() ? 'symlink' : 'other' ) ) );
			files[i] = st;
		}
	}
	
//~ console.log('returning', files);
	return files;
};

//~ fs.mimeImages = function() {
	//~ return fs.glob(__dirname+'/public/imgs');
//~ };

//~ console.log( fs.mimeImages() );

process.on('message', function(m, skt) {
	if ( typeof(m)!='object' ) return;
// console.log('WS-Client>>> ',m);
	switch(m.o) {
	case 'term':
		if ( m.d && !terminals[m.d] ) launch_terminal(m.d);
		break;
	case 'termkill':
		if ( m.d && terminals[m.d] ) {
			//~ var data = "";
			//~ data[0]=3; data[1]=4;
			terminals[m.d].kill('SIGKILL'); //ctrl+c
			//~ terminals[m.d].destroy();
			//~ delete terminals[m.d];
		}
		break;
	case 'term-resize':
		var term = m.d.tid ? terminals[m.d.tid] : undefined;
		if (term) term.resize(m.d.cols, m.d.rows);
		break;
	case 'js':
		// m.d  => [ pkg.fn, arg1, arg2, arg3,... ]
		var fn = m.d.shift().split('.');
		var pkg = fn[0];
		fn = fn[1];
		if ( xpose.hasOwnProperty(pkg) && xpose[pkg].hasOwnProperty(fn) ) {
			try {
				process.send({uid: m.uid, o:'js', 'd': xpose[pkg][fn].apply(this, m.d)});
			} catch(e) {
				process.send({uid: m.uid, o:'js', 'd': undefined, 'error': e.toString()});
			}
		}
		break;
	case 'die':
		console.log('Child died...');
		for(var i in terminals) {
			if (!terminals.hasOwnProperty(i)) continue;
			var data = "";
			data[0]=3; data[1]=4;
			terminals[i].write(data); //ctrl+c
			terminals[i].destroy();
		}
		process.exit(0);
		break;
	case 'access_check':
		//~ var m = {o: 'access_check', d: realPath, c: 'r', uid: accessCheckUID++};
//~ console.log('xtcWS => access_check: ', m);
		fs.open(m.d, m.c, function(err, fd) {
			if ( err ) {
				m.r = 0;
			}
			else {
				m.r = 1;
				fs.closeSync(fd);
			}
//~ console.log('xtcWS => access_check: response =>', m);
			process.send(m);
		});
		break;
	default:
		if ( m.o.substr(0,4)=='term' && m.d ) {
			var term =terminals[m.o];
			if (term) term.write(m.d);
		}
	}
	
});

