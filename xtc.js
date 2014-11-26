/**
 * Module dependencies.
 */
var settings = require('./config.js')
	, express = require('express')
	, app = express()  
	, fs = require('fs')
  , server = require('https').createServer({
			//~ ca: fs.readFileSync(settings.ca),
			key: fs.readFileSync(settings.key),
			cert: fs.readFileSync(settings.cert),
		}, app)
  , path = require('path')
  , spawn = require('child_process').spawn
	, pty = require('pty.js')
	, child_process = require('child_process')
	, sqlite3 = require('sqlite3').verbose()
	, sessDb = new sqlite3.Database('./sessions.db')
	, userid = require('userid')
	, pam = require('authenticate-pam')
	, customSender = require('express/node_modules/send/lib/send')
	, userChild = {}
	, accessCheckUID = 1
	, accessCheckMap = {} //used to map req/reply for file access between main node and child node
;

sessDb.serialize(function() {
	sessDb.run("CREATE TABLE if not exists sessions ( key text primary key, user text, age TIMESTAMP DEFAULT CURRENT_TIMESTAMP )");
});


// all environments
app.set('port', process.env.TEST_PORT || settings.port || 443);
app.use(express.favicon());
app.use(express.logger('dev'));

//Hijack PUT requests and store the content data in the destination file IF allowed...
app.use (function(req, res, next) {
	var data='';
	if ( req.method!='PUT' ) return next();
	
	
	var uKey = req.headers.cookie.match(/UKEY=([\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/);
	if ( !uKey ) return;
	uKey = uKey[1];
	var userId;
	var realPath = path.resolve( req.url.substr('/file'.length) );

	console.log('[PUT] User uKey=%s, path=%s [url=%s]', uKey, realPath, req.url, req.body);


	userSessionCmd(uKey, function(user) {
		userId = user;
		if ( userChild.hasOwnProperty(user) ) {
			var m = {o: 'access_check', d: realPath, c: 'w', uid: accessCheckUID++};
//~ console.log('FileServer:', m);
			if ( accessCheckUID > 1000000 ) accessCheckUID = 1;
			
			accessCheckMap[ m.uid ] = function(m) {
				if ( m.r ) {
					console.log('Writing: ', m.d);
					fs.open(m.d, 'w', 0640, function(err, fd) {
						if ( err ) {
							console.log('WARN: Failed to open for writing: ', m.d);
							res.end();
						}
						else {
							req.on('data', function(chunk) { 
								fs.write(fd, chunk, 0, chunk.length);
							});
							
							req.on('end', function() {
								fs.close(fd, function() {
									res.write('OK');
									res.end();
								});
							});
						}
					});
					
					
				}
				else {
					console.log('WARN: Failed to write', m.d);
					res.end();
				}
			};
			
			userChild[user].send(m);
		}
		else {
			console.log('User file access failed [0]: UKEY=%s, FILE=%s', uKey, req.url);
			res.end();
		}
	}, function() {
		if (!userId) {
			console.log('User file access failed [1]: UKEY=%s, FILE=%s', uKey, req.url);
			res.end();
		}
	})
	



	//~ req.on('end', function(){
		//~ next();
	//~ });
	//~ req.setEncoding('utf8');
	//~ req.on('data', function(chunk) { 
		 //~ data += chunk;
	//~ });

	//~ req.on('end', function() {
			//~ req.body = data;
			//~ next();
	//~ });
});
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

var   io = require('socket.io').listen(server);


// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//load up users file for future reference
//TODO: refresh this file every once in a while?
var usersInfo = {};
const UINFO_UID = 1;
const UINFO_GID = 2;
const UINFO_HOME = 4;

function load_user_info() {
	var res = fs.readFileSync('/etc/passwd');
	var u, lines = res.toString().split("\n");
	for(var i=0; i<lines.length;i++) {
		u = lines[i].split(':');
		usersInfo[u[0]] = u.slice(1);
	}
}
load_user_info();

function user_info(user) {
	if ( !usersInfo.hasOwnProperty(user) ) return;
	return {
		uid: parseInt(usersInfo[user][UINFO_UID]),
		gid: parseInt(usersInfo[user][UINFO_GID]),
		home: usersInfo[user][UINFO_HOME],
	};
}


//~ console.log(Object.keys(app.configure)); process.exit(0);

//Routes
app.get('/term.js', function (req, res) {
	res.set('Content-Type', 'text/javascript;charset=utf-8');
	res.sendfile(__dirname+'/node_modules/term.js/src/term.js');
});

app.get('/xtc.js', function (req, res) {
	var tpls = fs.readdirSync(__dirname + '/tpls')
		, data
	;
	
	res.set('Content-Type', 'text/javascript;charset=utf-8');
	
	data = fs.readFileSync(__dirname+'/xtc-client-engine.js', 'utf-8');
	res.write(data);
	res.write("\r\n");
	
	for(var i=0; i<tpls.length; i++) {
		ext = path.extname(tpls[i]);
		if ( ext != '.js' ) continue;
		data = fs.readFileSync(__dirname + '/tpls/' + tpls[i]);
		res.write(data);
		res.write("\r\n");
	}

	
	res.end();
});






app.get('/file/*', function (req, res) {
	var uKey = req.headers.cookie.match(/UKEY=([\d\w]{8}-[\d\w]{4}-[\d\w]{4}-[\d\w]{4}-[\d\w]{12})/);
	if ( !uKey ) return;
	uKey = uKey[1];
	var userId;
	var realPath = path.resolve( req.url.substr('/file'.length) );
	
	userSessionCmd(uKey, function(user) {
		userId = user;
		if ( userChild.hasOwnProperty(user) ) {
			var m = {o: 'access_check', d: realPath, c: 'r', uid: accessCheckUID++};
//~ console.log('FileServer:', m);
			if ( accessCheckUID > 1000000 ) accessCheckUID = 1;
			accessCheckMap[ m.uid ] = function(m) {
				if ( m.r ) {
					console.log('Serving: ', m.d);
					sendfile.call(res, m.d);
				}
				else {
					console.log('WARN: Failed Serving', m.d);
					res.end();
				}
			};
			userChild[user].send(m);
		}
		else {
			console.log('User file access failed [0]: UKEY=%s, FILE=%s', uKey, req.url);
			res.end();
		}
	}, function() {
		if (!userId) {
			console.log('User file access failed [1]: UKEY=%s, FILE=%s', uKey, req.url);
			res.end();
		}
	})
	
});

app.get('/', function (req, res) {
	var xtcTag = '<!--XTC-->'
		, indexTpl = fs.readFileSync(__dirname + '/public/start.html', 'utf-8')
		, idxStart = indexTpl.indexOf(xtcTag)
		, tpls = fs.readdirSync(__dirname + '/tpls')
		, skins = fs.readdirSync(__dirname + '/skins')
		, data
		, ext
		, skin, skinTpls
	;
	
	res.set('Content-Type', 'text/html;charset=utf-8');
	res.write( indexTpl.substr(0, idxStart) );
	

	//inject the skins
	console.log('skins', skins);
	for(var s=0; s<skins.length; s++) {
		skin = skins[s];
		res.write( "\r\n<template id=\"xtc-skin-"+skin+"\">\r\n <script type=\"text/javascript\"> if (!xtc.skins.skin1) xtc.skins.skin1 = { }; </script>\r\n" );
		skinTpls =  fs.readdirSync(__dirname + '/skins/'+skin);
		
		//write the main skin file first
		res.write( fs.readFileSync(__dirname + '/skins/' + skin + '/xtc-skin-'+skin+'.html') );
		
		//then all the rest...
		var skinIdx = 'xtc-skin-'+skin+'.html';
		for(var t=0; t<skinTpls.length; t++) {
			if ( skinTpls[t] == skinIdx ) continue; //skip main index file that we sent out at the beginning
			res.write( fs.readFileSync(__dirname + '/skins/' + skin + '/' + skinTpls[t]) );
		}
		
		
		res.write( "\r\n</template>\r\n" );
	}
	

	//inject the templates
	for(var i=0; i<tpls.length; i++) {
		ext = path.extname(tpls[i]);
		if ( ext != '.html' ) continue;
		
		data = fs.readFileSync(__dirname + '/tpls/' + tpls[i]);
		res.write(data);
		res.write("\r\n");
	}
	
	
	
	res.write( indexTpl.substr(idxStart+xtcTag.length) );
	res.end();
});


//Socket.io Config
io.set('log level', 1);

server.listen(app.get('port'), function(){
  console.log('xtc is running on port ' + app.get('port'));
});

var sendfile = function(path, options, fn){
	var self = this
		, req = self.req
		, next = this.req.next
		, options = options || {}
		, done;

	// support function as second arg
	if ('function' == typeof options) {
		fn = options;
		options = {};
	}

	// socket errors
	req.socket.on('error', error);

	// errors
	function error(err) {
		if (done) return;
		done = true;

		// clean up
		cleanup();
		if (!self.headerSent) self.removeHeader('Content-Disposition');

		// callback available
		if (fn) return fn(err);

		// list in limbo if there's no callback
		if (self.headerSent) return;

		// delegate
		next(err);
	}

	// streaming
	function stream() {
		if (done) return;
		cleanup();
		if (fn) self.on('finish', fn);
	}

	// cleanup
	function cleanup() {
		req.socket.removeListener('error', error);
	}

	// transfer
	var file = customSender(req, path);
	if (options.root) file.root(options.root);
	file.hidden(true);
	file.maxage(options.maxAge || 0);
	file.on('error', error);
	file.on('directory', next);
	file.on('stream', stream);
	file.pipe(this);
	this.on('finish', cleanup);
};

function onFileAccessCheckResult(m) {
//~ console.log('xtc => access_check RESPONSE: ', m, Object.keys(accessCheckMap));
	if ( !accessCheckMap.hasOwnProperty(m.uid) ) return;
	var cb = accessCheckMap[m.uid];
	if ( cb ) {
		cb(m);
		delete accessCheckMap[m.uid];
	}
	
};


function uuid(
  a                  // placeholder
){
  return a           // if the placeholder was passed, return
    ? (              // a random number from 0 to 15
      a ^            // unless b is 8,
      Math.random()  // in which case
      * 16           // a random number from
      >> a/4         // 8 to 11
      ).toString(16) // in hexadecimal
    : (              // or otherwise a concatenated string:
      [1e7] +        // 10000000 +
      -1e3 +         // -1000 +
      -4e3 +         // -4000 +
      -8e3 +         // -80000000 +
      -1e11          // -100000000000,
      ).replace(     // replacing
        /[018]/g,    // zeroes, ones, and eights with
        uuid            // random hex digits
      )
}

//Run and pipe shell script output
function run_shell(cmd, args, cb, end) {
    var spawn = require('child_process').spawn,
        child = spawn(cmd, args),
        me = this;
    child.stdout.on('data', function (buffer) { cb(me, buffer); });
    child.stdout.on('end', end);
}

function on_user_login(socket,usr,uid) {
	var env = process.env;
	var cwd = process.cwd;
	
	var nfo = user_info(usr);
console.log('USERINFO', usr, nfo);

	var cp_opt = {
		//in,out,err
		stdio: ['ignore', 'ignore', 'ignore'],
		env: {'HOME': nfo.home},
		cwd: nfo.home,
		detached: false,
		uid: nfo.uid,
		gid: nfo.gid,
	};
	var child = child_process.fork(__dirname+'/xtcWS.js', [], cp_opt);
	child.on('message', function(m) {
//~ console.log('child message:',m.o=='access_check', m);
		if ( m.o=='access_check' ) return onFileAccessCheckResult(m);
		socket.emit('d', m);
	});
	if ( !userChild.hasOwnProperty(usr) ) userChild[usr] = child;
	socket.emit('sessionKey', {user: usr, key: uid, home: nfo.home, dirname: __dirname});
	
	sessDb.serialize(function() {
		var stmt = sessDb.prepare("insert or replace into sessions(key,user) values(?,?)");
		stmt.run(uid, usr);
		stmt.finalize();
	});

	socket.on('d', function(m) {
		child.send(m);
	});

	socket.on('disconnect', function() {
		console.log('websocket client gone byebye!');
		if ( child ) {
			if ( child === userChild[usr] ) delete userChild[usr];
			child.send({o: 'die'});
		}
	});

}

function userSessionCmd(key, okCb, waitCb) {
	return sessDb.get("SELECT user FROM sessions WHERE key=?", key, function(err, row) {
		if ( !row || err ) return okCb();
		return okCb(row.user);
	}).wait(waitCb);
}

io.sockets.on('connection', function (socket) {
	//we spawn a new child after socket login with user's crap and start routing from there...
	var userid, uid;
	console.log('New Websocket Connection started!');
	//~ socket.emit('autherror', 'hello world');
	
	socket.on("login", function(usr,pwd) {
		if ( userid ) return;
		console.log('User login', usr);
		pam.authenticate(usr, pwd, function(err) {
			if(err) {
				socket.emit('autherror', 'Login Failed');
			}
			else {
				console.log("Authenticated: ", usr);
				uid = uuid();
				on_user_login(socket,usr,uid);
			}
		});
	});

	socket.on("relog", function(uid) {
		console.log('User resume', uid);
		if ( !uid.match(/^[a-zA-Z0-9\-]+$/) ) {
			console.log('Invalid UUID used for relog!', uid);
			socket.close();
		}
		
		userSessionCmd(uid, function(user) {
			if ( !user ) return;
			console.log("Resuming session for: "+user);
			userid = user;
			on_user_login(socket, user, uid);
		}, function() {
			if ( !userid ) socket.emit('autherror', 'Failed to resume session');
		});
		
	});
	

	return;
	/*
	socket.on("resize", function(data){
		if ( !term ) return; //not yet open?
		term.resize(data.cols, data.rows);
	});
	
	socket.on("data", function(data){
		if ( !term ) return; //not yet open?
		term.write(data);
	});
	
	socket.on("bash", function(data){
		if ( term ) return; //already open?!
		term =  pty.spawn('bash', [], {
							name: 'xterm-color',
							cols: 80,
							rows: 30,
							cwd: process.env.HOME,
							env: process.env
						});
		term.on('data', function(data) {
			socket.emit("data", data);
		});
 });
	
 socket.on("screen", function(data){
   socket.type = "screen";
   ss = socket;
   console.log("Screen ready...");
 });
 socket.on("remote", function(data){
   socket.type = "remote";
   console.log("Remote ready...");
 });

 socket.on("controll", function(data){
	console.log(data);
   if(socket.type === "remote"){

     if(data.action === "tap"){
         if(ss != undefined){
            ss.emit("controlling", {action:"enter"});
            }
     }
     else if(data.action === "swipeLeft"){
      if(ss != undefined){
          ss.emit("controlling", {action:"goLeft"});
          }
     }
     else if(data.action === "swipeRight"){
       if(ss != undefined){
           ss.emit("controlling", {action:"goRight"});
           }
     }
   }
 });

 socket.on("video", function(data){

    if( data.action === "play"){
    var id = data.video_id,
         url = "http://www.youtube.com/watch?v="+id;

    var runShell = new run_shell('youtube-dl',['-o','%(id)s.%(ext)s','-f','/18/22',url],
        function (me, buffer) {
            me.stdout += buffer.toString();
            socket.emit("loading",{output: me.stdout});
            console.log(me.stdout);
         },
        function () {
            //child = spawn('omxplayer',[id+'.mp4']);
            omx.start(id+'.mp4');
        });
    }

 });*/
});