require.paths = ['/root/.node_modules'];
var ios = require('socket.io'); 
var mongo = require('mongoskin');
var conffile = require('./include/configs.js');
var router = require('./include/router.js');
var rooms = require('./include/rooms.js');
var fserv = require('./include/fileserv.js');
var plugins = require('./include/plugins.js');



global.time = function(){return parseInt(new Date().getTime()/1000)};
global.isset = function(vr){return typeof(vr)!=='undefined'};
global.obLen = function(ob){var cc=0; for(var i in ob) cc++; return cc};
global.obj2arr = function(ob){var ar=[]; for(var i in ob) ar.push(i); return ar};


global.config = [];
global.startTime = time();
global.anonims = {};
global.allUsers = {};
global.allRooms = {};
global.login2nick = {};


conffile.readConfig(function(data){
	config = data;

	global.db = mongo.db(config['mongoServer']+':'+config['mongoPort']+'/'+config['mongoBaseName']+'?auto_reconnect');
	global.dbusers = db.collection('users');
	global.dbmess = db.collection('messages');
	global.dbrooms = db.collection('rooms');
	global.dbhist = db.collection('history');
	global.dbhistEv = db.collection('historyEvents');
	
	global.io = ios.listen(config['socketPort'] * 1);
		
	global.serverHost = config['serverIp'];
		
	// Очищаем сокеты - все юзеры разлогинены
	dbusers.update({'socket': {$ne:''}}, {$set: {'socket':''}}, {'multi':true}, function(err,res){});
	// Очищаем комнаты от юзеров
	dbrooms.update({}, {$set: {'userscount':0, 'users':{}}}, {'multi':true}, function(err,res){});
	
	// Запоминаем ники всех юзеров	
	dbusers.find({}).toArray(function(e,r){
		for(var i=0; i < r.length; i++){
			login2nick[r[i].login] = r[i].nick;	
		}
	});
	

	
	
	
	io.set('log level', 1);

	
io.sockets.on('connection', function (socket) {

	socket.profile = {};
	socket.isLogin = false;
	socket.rooms = [];
	
	socket.on('message', function(data){
		router.rout(data, socket);
	});


	
	socket.on('disconnect', function() {
	
		// Разлогиниваем юзера когда он отключается
		dbusers.update({'socket':socket.id}, {$set: {'socket':''}}, function(err,res){});
		rooms.leaveAllRooms(socket);
		//console.log('Client disconnected: ' + socket.handshake.address.address);
		delete socket;
		
	});
	
	//console.log('Client connected: ' + socket.handshake.address.address);
	
});

fserv.startHttp();
	
plugins.load('testbot.js');	
	
});