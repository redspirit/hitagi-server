var tools = require('./tools.js');

function globPriv(param, s){
	var priv = pWrap(param['priv']) * 1;
	var puser = pWrap(param['user']);
	var user = s.profile.login;	
	var myPriv = s.profile.privilege;
	
	if(!s.isLogin){
		s.json.send({'type':'globprivilege', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	if(priv!=1 && priv!=2 && priv!=4){	
		s.json.send({'type':'globprivilege', 'status':'error', 'reason':'badpriv'});
		return false;
	}
	
	dbusers.findOne({'login':puser}, function(err,res){
		if(res){
			var upriv = res['privilege'];
			if(upriv==0){
				s.json.send({'type':'globprivilege', 'status':'error', 'reason':'notallowed'});
				return false;			
			}
			if(upriv==3){
				s.json.send({'type':'globprivilege', 'status':'error', 'reason':'notallowed'});
				return false;			
			}
			if(upriv==1 && myPriv==1){
				s.json.send({'type':'globprivilege', 'status':'error', 'reason':'notallowed'});
				return false;			
			}
			
			dbusers.updateById(res['_id'], {$set: {'privilege':priv}}, function(err, result){});
			dbusers.find({'socket':{$ne:''}}).toArray(function(err,res2){
				for(var i=0; i<res2.length; i++){
					io.sockets.socket(res2[i]['socket']).json.send({'type':'globprivilege', 'status':'ok', 'user':puser, 'priv':priv});
				}
			});				
		
		} else {
			s.json.send({'type':'globprivilege', 'status':'error', 'reason':'notfound'});
		}
	});
	
}

function roomPriv(param, s){
	var priv = pWrap(param['priv']) * 1;
	var puser = pWrap(param['user']);
	var room = pWrap(param['room']);
	var user = s.profile.login;	
	var myPriv = s.profile.privilege;

	if(!s.isLogin){
		s.json.send({'type':'roomprivilege', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	if(priv!=0 || priv!=2){	
		s.json.send({'type':'roomprivilege', 'status':'error', 'reason':'badpriv'});
		return false;
	}

	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
			if(res.owner != user || myPriv != 0 || myPriv != 1){
				s.json.send({'type':'roomprivilege', 'status':'error', 'reason':'notallowed'});
				return false;			
			}
			if(priv == 0){ //ставим на участника
				dbrooms.update({'name':room},{$pull:{'moderators':puser}}, function(err,resu){});
			}
			if(priv == 2){ // ставим на модера
				dbrooms.update({'name':room},{$addToSet:{'moderators':puser}}, function(err,resu){});
			}
			
			var rusers = res.users;
			for(var key in rusers){
				var us = rusers[key];
				io.sockets.socket(us['s']).json.send({'type':'roomprivilege', 'status':'ok', 'user':puser, 'priv':priv});
			}			
			
		} else {
			s.json.send({'type':'roomprivilege', 'status':'error', 'reason':'noroom'});		
		}
	});	
	
}

function banOn(param, s){
	var user = pWrap(param['user']);
	var room = pWrap(param['room']);	
	var reason = pWrap(param['reason']);
	var btime = pWrap(param['time'])*1;	
	var me = s.profile.login;
	var myPriv = s.profile.privilege;
	
	if(!s.isLogin){
		s.json.send({'type':'banon', 'status':'error', 'reason':'notlogin'});
		return false;
	}	
	
	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
			getUserPrivs(me, room, function(meprev){
				// проверяем привилегия того, кто ставит
				if(meprev.global <= 2 && (meprev.room == 1 || meprev.room == 2)){
					getUserPrivs(user, room, function(usprev){
						if(usprev.global <= 1 || usprev.room == 1){
							s.json.send({'type':'banon', 'status':'error', 'reason':'notallow'});
							return false;
						}
					
						var rusers = res.users;
						var ba = res.banned;
						ba[user] = {
							'reason':reason,
							'by':me,
							'expires':time()+(btime*60),
							'total':btime,
							'start':time()
						}

						tools.sendUsersToRoom(room, {'type':'banon', 'status':'ok', 'user':user, 'reason':reason, 'time':btime});

						delete rusers[user];
						delete allRooms[room][user];
						dbrooms.updateById(res['_id'], {$set: {'users':rusers, 'banned':ba}}, function(err, result){});						
					});
				} else {
					s.json.send({'type':'banon', 'status':'error', 'reason':'notallow'});
					return false;
				}
			});
		} else {
			s.json.send({'type':'banon', 'status':'error', 'reason':'noroom'});		
		}
	});
	
}
function banOff(param, s){

}
function voiceOff(param, s){

}
function voiceOn(param, s){

}
function kick(param, s){
	var user = pWrap(param['user']);
	var room = pWrap(param['room']);	
	var me = s.profile.login;
	var myPriv = s.profile.privilege;

	if(!s.isLogin){
		s.json.send({'type':'kick', 'status':'error', 'reason':'notlogin'});
		return false;
	}

	dbrooms.findOne({'name':room}, function(err,res){
		if(res){
			getUserPrivs(me, room, function(meprev){
				// проверяем привилегия того, кто ставит
				if(meprev.global <= 2 && (meprev.room == 1 || meprev.room == 2)){
					getUserPrivs(user, room, function(usprev){
						if(usprev.global <= 1 || usprev.room == 1){
							s.json.send({'type':'kick', 'status':'error', 'reason':'notallow'});
							return false;
						}
					
						var rusers = res.users;

						tools.sendUsersToRoom(room, {'type':'kick', 'status':'ok', 'user':user});						

						delete rusers[user];
						delete allRooms[room][user];
						dbrooms.updateById(res['_id'], {$set: {'users':rusers}}, function(err, result){});						
					});
				} else {
					s.json.send({'type':'kick', 'status':'error', 'reason':'notallow'});
					return false;
				}
			});
		} else {
			s.json.send({'type':'kick', 'status':'error', 'reason':'noroom'});		
		}
	});		
	
	
}
/*
	Если room - пустая строка, то возвращаются только глобальные права
*/
function getUserPrivs(login, room, callback){
	var rezul = {};
	dbusers.findOne({'login':login}, function(err,res){
		if(res){
			var upriv = res['privilege'];
			if(room!='') dbrooms.findOne({'name':room}, function(err,res2){
				if(res2){
					var us = res2.users[login];
					var roomPriv = 0;
					
					if(res2['owner']==login) roomPriv = 1;
					if(isset(res2.moderators[login])) roomPriv = 2;
					if(isset(res2.novoiced[login])) roomPriv = 3;
					if(isset(res2.banned[login])) roomPriv = 4;					
					
					if(isset(us)){
						rezul.global = upriv;
						rezul.icon = us.priv;
						rezul.room = roomPriv;	
						callback(rezul);
					} else {
						callback('nouserinroom');
					}
				} else {
					callback('noroom');
				}
			}); else {
				rezul.global = upriv;
				callback(rezul);
			}
		} else {
			callback('nouser');
		}
	});
}

function pWrap(par){
	return isset(par) ? par : '';
}

exports.globpriv = globPriv;
exports.roompriv = roomPriv;
exports.banon = banOn,
exports.banoff = banOff,
exports.voiceon = voiceOn,
exports.voiceoff = voiceOff,
exports.kick = kick