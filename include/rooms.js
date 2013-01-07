var tools = require('./tools.js');
var plugins = require('./plugins.js');
var ObjectID = require('mongodb').ObjectID;

function createRoom(param, s){
	var name = pWrap(param['name']);
	var capt = pWrap(param['caption']);
	
	if(!s.isLogin){
		s.json.send({'type':'createroom', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	if(name==''){
		s.json.send({'type':'createroom', 'status':'error', 'reason':'noname'});
		return false;	
	}
	if(capt==''){
		s.json.send({'type':'createroom', 'status':'error', 'reason':'nocapt'});
		return false;	
	}
	
	dbrooms.findOne({'name':name}, function(err,res){
		if(!res){
			var room = {
				'name':name,
				'caption':capt,
				'createdate':time(),
				'owner':s.profile.login,
				'allowanonim':1,
				'banned':{},
				'novoiced':{},
				'moderators':{},
				'users':{},
				'totalmessages':0,
				'userscount':0,
				'topic':''
			};
			dbrooms.insert(room, function(err,res){});
			s.json.send({'type':'createroom', 'status':'ok'});	
		} else {
			s.json.send({'type':'createroom', 'status':'error', 'reason':'busyname'});		
		}
	});
	
}

function joinRoom(param, s){
	var room = pWrap(param['room']);
	var count = pWrap(param['count']);	
	var user = s.profile.login;

	if(!s.isLogin){
		s.json.send({'type':'joinroom', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	
	if(count=='') count = config['lastMessagesLimit'];
	
	var inroom = false;
	for(var i in s.rooms){
		if(s.rooms[i] == room) inroom = true;
	}
	if(inroom){
		s.json.send({'type':'joinroom', 'status':'error', 'reason':'alreadyinroom'});
		return false;	
	}
			
	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
			var rusers = res.users;
			var usersList = {};
			var base = [];
			var priva = 0;
			if(user == res.owner) priva = 1
			if(isset(res.moderators[user])) priva = 2;
			if(isset(res.novoiced[user])) priva = 3;
			if(isset(res.banned[user])){
				var exp = res.banned[user].expires;
				if(time() >= exp){
					delete res.banned[user];
					dbrooms.updateById(res['_id'], {$set: {'banned':res.banned}}, function(err, result){});
				} else {
					s.json.send({'type':'joinroom', 'status':'banned', 'expires': exp-time()});
					return false;				
				}
			}
	
			if(!isset(allRooms[room])) allRooms[room] = {};
			allRooms[room][user] = s.id;

			rusers[user] = time();
			dbrooms.updateById(res['_id'], {$set: {'users':rusers, 'userscount':obLen(rusers)}}, function(err, result){});
			
			var forSend = {
				'login': user,
				'nick': s.profile.nick,
				'client': s.profile.client,
				'avaurl': s.profile.avaurl,
				'state': s.profile.state,
				'statustext': s.profile.statustext,
				'roomPriv': priva,
				'globPriv': s.profile.privilege
			}
			
			dbusers.find({'login': {$in: obj2arr(rusers)}}, {sort:{'last_login':1}}).toArray(function(err1, res1){
				for(var i=0; i < res1.length; i++){
					// объект юзеров для отправки
					
					var priva2 = 0;
					if(res1[i].login == res.owner) priva2 = 1
					
					if(isset(res.moderators[res1[i].login])) priva2 = 2;
					if(isset(res.novoiced[res1[i].login])) priva2 = 3;				
				
					var fullUser = {
						'login': res1[i].login,
						'nick': res1[i].nick,
						'client': res1[i].client,
						'avaurl': 'http://'+serverHost+':'+config['httpPort']+'/avatar/' + res1[i].login + '?' + res1[i].ava_index,
						'state': res1[i].state,
						'statustext': res1[i].statustext,
						'roomPriv': priva2,
						'globPriv': res1[i].privilege
					}
					
					if(s.profile.privilege <= 1) fullUser.ip = res1[i].ip;
					usersList[fullUser.login] = fullUser;
					if(fullUser.login != user){
						io.sockets.socket(res1[i].socket).json.send({'type':'userjoined', 'room':room, 'name':user, 'data':forSend});
					}
				}
				
				dbhist.find({'room':room, 'text':{$exists:true}, 'deleted':{$exists:false}}, {limit:count, sort:{'date': -1}}).toArray(function(err2, res2){
					for(i=0; i < res2.length; i++){
						var ms = {'u':res2[i]['user'],'d':res2[i]['date'],'c':res2[i]['cl'],'t':res2[i]['text'],'id':res2[i]['_id']}
						ms.n = login2nick[res2[i]['user']];
						base.push(ms);
					}
					s.json.send({'type':'joinroom', 'status':'ok', 'name':room, 'caption':res.caption, 'topic':res.topic, 'count':obLen(rusers), 'users':usersList, 'messages':base.reverse()});
					
				});
				
				
			});
			
			// сохраняем комнату в списке открытых комнат на сокете	
			s.rooms.push(room);
			
			// Сохраним в хистори активность захода в эту комнату
			dbhistEv.insert({'room':room, 'user':user, 'event':1, 'date':time()}, function(err,res){});

		} else {
			s.json.send({'type':'joinroom', 'status':'error', 'reason':'noroom'});
		}
	});
	
}
function leaveRoom(param, s){
	var room = pWrap(param['room']);

	if(!s.isLogin){
		s.json.send({'type':'leaveroom', 'status':'error', 'reason':'notlogin'});
		return false;
	}

	var inroom = false;
	for(var i in s.rooms){
		if(s.rooms[i] == room) inroom = true;
	}
	if(!inroom){
		s.json.send({'type':'leaveroom', 'status':'error', 'reason':'notinroom'});
		return false;	
	}
	
	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
		
			var rusers = res.users;
			delete rusers[s.profile.login];
			delete allRooms[room][s.profile.login];
			var pdata = {
				'userscount':obLen(rusers),
				'users': rusers
			};
			
			for(i=0; i<s.rooms.length; i++) if(s.rooms[i] == room) delete s.rooms[i]; // BUG с удаленем элемента из массива
		
			dbrooms.updateById(res['_id'], {$set: pdata}, function(err, result){});
	
			s.json.send({'type':'leaveroom', 'status':'ok'});

			tools.sendUsersToRoom(room, {'type':'userleaved', 'name':s.profile.login, 'room':room});			
			
			// Сохраним в хистори активность выхода
			dbhistEv.insert({'room':room, 'user':s.profile.login, 'event':2, 'date':time()}, function(err,res){});
			
		} else {
			s.json.send({'type':'leaveroom', 'status':'error', 'reason':'noroom'});		
		}
	});	
	
}

function leaveAllRooms(s){
	for(var r in s.rooms){
		leaveRoom({room:s.rooms[r]}, s);
	}
	s.rooms = [];
}

function chat(param, s){
	var room = pWrap(param['room']);
	var text = pWrap(param['text']);
	var color = pWrap(param['cl']);	

	if(!s.isLogin){
		s.json.send({'type':'chat', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	
	if(color=='') color = '000000';
	
	if(!isset(allRooms[room][s.profile.login])){
		s.json.send({'type':'chat', 'status':'error', 'reason':'notinroom'});
		return false;	
	}
		
	if(s.profile.privilege >= 2) text = escapeHtml(text);
	
	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
		
			var bt = plugins.botSender({text:text, room:room, user:s.profile.login, nick:s.profile.nick, socket:s});
			text = bt.text;
		
			var rusers = res.users;
			var insdat = {'room':room, 'user':s.profile.login, 'text':text, 'cl':color, 'date':time()};		
			
			if(bt.save){
				dbrooms.updateById(res['_id'], {$inc: {'totalmessages':1}}, function(err, result){});
				dbusers.update({'login':s.profile.login}, {$inc: {'mess_count':1}, $set: {'textcolor':color}});
				dbhist.insert(insdat, savemess);			
			} else {
				savemess(true, {});			
			}
			
			function savemess(err,res){
				var messag = {'type':'chat', 'u':s.profile.login, 'c':color, 't':text, 'id':insdat['_id']};
				if(bt.proc) messag.isbot = 1;
				if(bt.toall){
					tools.sendUsersToRoom(room, messag);
				} else {				
					s.json.send(messag);
				}
			}
			
		} else {
			s.json.send({'type':'chat', 'status':'error', 'reason':'noroom'});		
		}
	});	
	
	
}

function chatcorrect(param, s){
	var text = pWrap(param['text']);
	var user = s.profile.login;
	
	if(!s.isLogin){
		s.json.send({'type':'chatcorrect', 'status':'error', 'reason':'notlogin'});
		return false;
	}	
	
	dbhist.findOne({'user':user}, {sort:{'date':-1}}, function(err,res){
		dbhist.updateById(res['_id'], {$set: {'text':text}}, function(e,r){});
		tools.sendUsersToRoom(res.room, {'type':'chatcorrect', 'status':'ok', 'newtext':text, 'mid':res['_id']});
	});
	
}

function setTopic(param, s){
	var room = pWrap(param['room']);
	var topic = pWrap(param['topic']);
	
	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
		
			// Проверка прав
		
			tools.sendUsersToRoom(room, {'type':'settopic', 'status':'ok', 'room':room, 'topic':topic});
			
			dbrooms.updateById(res['_id'], {$set: {'topic':topic}}, function(err, result){});
		} else {
			s.json.send({'type':'settopic', 'status':'error', 'reason':'noroom'});	
		}
	});
	
}

function eraseMes(param, s){
	var mid = pWrap(param['mid']);
	
	if(!s.isLogin){
		s.json.send({'type':'erasemessage', 'status':'error', 'reason':'notlogin'});
		return false;
	}

	if(s.profile.privilege > 1){
		s.json.send({'type':'erasemessage', 'status':'error', 'reason':'noprivilege'});
		return false;
	}	
	
	dbhist.updateById(mid, {$set: {'deleted':1}}, function(err, result){});
	dbhist.findOne({'_id':new ObjectID(mid)}, function(err,res){
		if(res){
			tools.sendUsersToRoom(res.room, {'type':'erasemessage', 'status': 'ok', 'mid':mid});
			dbusers.update({'login':res.user}, {$inc: {'mess_count':-1, 'rating':-5}});
		} else {
			s.json.send({'type':'erasemessage', 'status':'error', 'reason':'notfound'});
		}
	});

}

function pWrap(par){
	return isset(par) ? par : '';
}
function clone(x){
	return JSON.parse(JSON.stringify(x));
}
function clearSockets(obj, clIp){
	for(var i in obj){	
		delete obj[i]['s'];
		if(clIp) delete obj[i]['ip'];
	}
	return obj;
}
function escapeHtml(unsafe) {
  return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
}

exports.createRoom = createRoom;
exports.joinRoom = joinRoom;
exports.leaveRoom = leaveRoom;
exports.chat = chat;
exports.chatcorrect = chatcorrect;
exports.leaveAllRooms = leaveAllRooms;
exports.settopic = setTopic;
exports.eraseMes = eraseMes;