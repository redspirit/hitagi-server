var rega = require('./register.js');
var auth = require('./auth.js');
var profile = require('./profile.js');
var mess = require('./messages.js');
var room = require('./rooms.js');
var fserv = require('./fileserv.js');
var priv = require('./priveleges.js');

var ways = {
	'getserverinfo': serverInfo,
	'register': rega.registerUser,
	'vkreg': rega.vkReg,
	'adminreg': rega.adminReg,	
	'vkauth': auth.vkAuth,
	'auth': auth.logIn,
	'logout': auth.logOut,	
	'getprofile': profile.get,
	'setprofile': profile.set,
	'setavatar': profile.setavatar,
	'deluser':auth.delUser,
	'blockuser':auth.blockUser,
	'globprivilege': priv.globpriv,
	'roomprivilege': priv.roompriv,
	'sendmess':mess.sendMessage,
	'getmessages':mess.getMessages,
	'createroom':room.createRoom,
	'joinroom':room.joinRoom,
	'leaveroom':room.leaveRoom,
	'chat':room.chat,
	'chatcorrect':room.chatcorrect,	
	'settopic':room.settopic,
	'uploadimage':fserv.uploadImage,
	'erasemessage': room.eraseMes,
	'setstatus': profile.setstatus,
	'setstate': profile.setstate,
	'saverating': profile.saverating,
	'banon': priv.banon,
	'banoff': priv.banoff,
	'voiceon': priv.voiceon,
	'voiceoff': priv.voiceoff,
	'kick': priv.kick
};

function router(data, socket){
	var mtype = data['type'];
	
	if(typeof(ways[mtype])=='function') 
		ways[mtype](data, socket);
	else
		socket.json.send({'type':'error', 'reason':'unknowcommand'});

	return true;
}

/************************* Server Info ********************/
function serverInfo(param, s){

	var dat = {
		'type':'getserverinfo',
		'status':'ok',
		'servername':config['serverName'],
		'serverversion':config['version'],
		'author':config['author'],
		'homepage':config['homepage'],
		'uptime':time()	- startTime
	};
	
	dbusers.find().count(function(err, result){
		dat['totalusers'] = result;
		db.collection('rooms').find().count(function(err, result){
			dat['totalrooms'] = result;
			s.json.send(dat);
		});
	});
	return true;
}


exports.rout = router;