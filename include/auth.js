var mess = require('./messages.js');
var rooms = require('./rooms.js');
var tools = require('./tools.js');

function logInUser(param, s){
	var mode = pWrap(param['mode']);
	var login = pWrap(param['login']);
	var nick = pWrap(param['nickname']);	
	var pass = pWrap(param['pass']);
	var clientId = pWrap(param['client']);
	var isMobile = pWrap(param['mobile']);
	var platform = pWrap(param['platform']);

	if(s.isLogin){
		sendError('alreadyauth', s);
		return false;
	}
	
	if(mode=='user'){
		// Ïðîâåðÿåì äàííûå þçåðà
		dbusers.findOne({'login':login, 'pass':pass}, function(err,res){
			if(res){
				if(res['socket']==''){
				
					if(res['block']==1){
						// Þçåð çàáëîêèðîâàí
						s.json.send({'type':'auth', 'status':'error', 'reason':'userblocked','message':res['block_reason']});
						return false;
					}
				
					dbusers.updateById(res['_id'], {$set: {'socket':s.id, 'last_login':time(), 'client':clientId, 'mobile':isMobile}}, function(err,res){});
				
					s.isLogin = true;
					s.loginMode = 'user';
					s.profile.login = login;
					s.profile.nick = res['nick'];
					s.profile.privilege = res['privilege'];
					s.profile.client = clientId;
					s.profile.avaindex = res['ava_index'];
					s.profile.statustext = res['statustext'];
					s.profile.state = res['state'];
					s.profile.profvisible = res['profile_visible'];	
					s.profile.avaurl = 'http://'+serverHost+':'+config['httpPort']+'/avatar/' + login + '?' + res['ava_index'];
				
					allUsers[login] = s.profile;
					login2nick[login] = res['nick'];
				
					if(!isset(res['textcolor'])) res['textcolor'] = '000000';
					s.json.send({
						'type':'auth',
						'status':'ok',
						'login':login,
						'privilege':res['privilege'],
						'nickname':res['nick'],
						'statustext':res['statustext'],
						'state':res['state'],
						'textcolor':res['textcolor'],
						'url':s.profile.avaurl
					});
				
					mess.checkNewMessages(s);
				
				
				} else {
					sendError('alreadyauth', s);
				}
			} else {
				sendError('wrongauth', s);
			}
		});
	}
	if(mode=='anonim'){
		// Çàëîãèðîâàíèå àíîíèìà

		if(nick.length < 3 || nick.length > config['maxNickLength']){
			sendError('wrongnick', s);
			return false;				
		}

		dbusers.findOne({'nick':nick}, function(err,res){
			if(res){
				sendError('busynick', s);
				return false;							
			} else {

				s.isLogin = true;
				s.loginMode = 'anonim';
				s.profile.nick = nick;
				s.profile.privilege = 3;
			
				anonims[s.id] = {
					'nick':nick,
					'logindate':time(),
					'ip':s.handshake.address.address
				};

				s.json.send({
					'type':'auth',
					'status':'ok',
					'privilege':3,
					'nickname':nick
				});
			
			}

		});

		
	}
}

function vkAuth(param, s){
	var mid = pWrap(param['uid'])*1;
	var hash = pWrap(param['hash']);
	var clientId = pWrap(param['client']);
	var isMobile = pWrap(param['mobile']);	
	var platform = pWrap(param['platform']);
	
	if(s.isLogin){
		s.json.send({'type':'vkauth','status':'error','reason':'alreadyauth'});
		return false;
	}
	
	if(hash==''){
		s.json.send({'type':'vkauth','status':'error','reason':'nohash'});
		return false;
	}
	
	// Ïðîâåðÿåì äàííûå þçåðà
	dbusers.findOne({'vk_id':mid}, function(err,res){
		if(res){
			if(res['socket']==''){
			
				if(res['block']==1){
					// Þçåð çàáëîêèðîâàí
					s.json.send({'type':'vkauth', 'status':'error', 'reason':'userblocked','message':res['block_reason']});
					return false;
				}
			
				if(platform == "android") {
					
					if(hash != tools.md5(config['vkAppIdAndroid'] + mid + config['vkAppKeyAndroid'])){
						s.json.send({'type':'vkauth', 'status':'error', 'reason':'wronghash'});
						return false;
					}
					
				} else {
				
					if(hash != tools.md5(config['vkAppId'] + mid + config['vkAppKey'])){
						s.json.send({'type':'vkauth', 'status':'error', 'reason':'wronghash'});
						return false;
					}
					
				}
			
				dbusers.updateById(res['_id'], {$set: {'socket':s.id, 'last_login':time(), 'client':clientId, 'mobile':isMobile}}, function(err,res){});
			
				s.isLogin = true;
				s.loginMode = 'user';
				s.profile.login = res['login'];
				s.profile.nick = res['nick'];
				s.profile.privilege = res['privilege'];
				s.profile.client = clientId;					
				s.profile.avaindex = res['ava_index'];
				s.profile.statustext = res['statustext'];
				s.profile.state = res['state'];				
				s.profile.profvisible = res['profile_visible'];
				s.profile.avaurl = 'http://'+serverHost+':'+config['httpPort']+'/avatar/' + res['login'] + '?' + res['ava_index'];
			
				allUsers[res['login']] = s.profile;
				login2nick[res['login']] = res['nick'];
				
						
				if(!isset(res['textcolor'])) res['textcolor'] = '000000';
				s.json.send({
					'type':'vkauth',
					'status':'ok',
					'login':res['login'],
					'privilege':res['privilege'],
					'nickname':res['nick'],
					'statustext':res['statustext'],
					'state':res['state'],
					'textcolor':res['textcolor'],
					'url': s.profile.avaurl			
				});
			
				mess.checkNewMessages(s);
			
			} else {
				s.json.send({'type':'vkauth','status':'error','reason':'alreadyauth'});
			}
		} else {
			s.json.send({'type':'vkauth','status':'error','reason':'wrongauth'});
		}
	});

}

function logOut(param, s){
	if(!s.isLogin){
		s.json.send({'type':'logout','status':'error','reason':'notlogin'});
		return false;	
	}

	if(s.loginMode=='anonim'){
		s.isLogin = false;
		delete anonims[s.id];
		s.json.send({'type':'logout','status':'ok'});
		return false;
	}
	
	rooms.leaveAllRooms(s);
	
	dbusers.update({'socket':s.id}, {$set: {'socket':''}}, function(err,res){});
	s.json.send({'type':'logout','status':'ok'});
	s.isLogin = false;
	
}

function delUser(param, s){
	var us = pWrap(param['user']);

	if(!s.isLogin){
		s.json.send({'type':'deluser','status':'error','reason':'notlogin'});
		return false;
	}
	
	if(s.profile.privilege>1){
		s.json.send({'type':'deluser','status':'error','reason':'notallow'});
		return false;
	}
		
	dbusers.findOne({'login':us}, function(err,res){
		if(res){
			if(res['privilege']==0){
				s.json.send({'type':'deluser','status':'error','reason':'notallow'});
				return false;			
			}
			dbusers.removeById(res['_id'], function(err,res){});
			s.json.send({'type':'deluser','status':'ok'});
		} else {
			sendError('notexists', s);
		}
	});
	
}

function blockUser(param, s){
	var us = pWrap(param['user']);
	var act = pWrap(param['action']);
	var rs = pWrap(param['reason']);
	
	if(!s.isLogin){
		s.json.send({'type':'blockuser','status':'error','reason':'notlogin'});
		return false;
	}
	
	if(s.profile.privilege>1 || s.profile.login == us){
		s.json.send({'type':'blockuser','status':'error','reason':'notallow'});
		return false;
	}
		
	dbusers.findOne({'login':us}, function(err,res){
		if(res){
			if(s.profile.privilege==1 && res['privilege']==0){
				s.json.send({'type':'blockuser','status':'error','reason':'notallow'});
				return false;
			}
			dbusers.updateById(res['_id'], {$set: {'block': act,'block_reason':rs}}, function(err,res){});
			s.json.send({'type':'blockuser','status':'ok'});
		} else {
			sendError('notexists', s);
		}
	});
}

function sendError(reason, s){
	s.json.send({'type':'auth', 'status':'error', 'reason':reason});
}
function pWrap(par){
	return isset(par) ? par : '';
}

exports.logIn = logInUser;
exports.logOut = logOut;
exports.delUser = delUser;
exports.blockUser = blockUser;
exports.vkAuth = vkAuth;
