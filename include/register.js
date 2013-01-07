function registerUser(param, s){
	var login = pWrap(param['login']);
	var nick = pWrap(param['nickname']);	
	var pass = pWrap(param['pass']);

	// Залогиневшись регистрировать аккаунты может только рут-админ
	if(s.isLogin && s.profile['privilege'] != 0){
		sendError('alreadyauth', s);
		return false;
	}	
	
	// Проверка на заблокированые слова
	for(var i=0; i<config['busyLogins'].length-1; i++){
		if(config['busyLogins'][i] == login || config['busyLogins'][i] == nick){
			sendError('busynicklogin', s);
			return false;
		}
	}
	
	/* Проверка введенных данных для регистрации */
	if(pass.length != 40) {
		sendError('wrongpass', s);
		return false;
	}
	
	if(!/^[\w-]{3,15}$/i.test(login)){
		sendError('wronglogin', s);
		return false;		
	}
	
	if(nick.length < 3 || nick.length > config['maxNickLength']){
		sendError('wrongnick', s);
		return false;				
	}
	
	/* Проверка юзера на IP бан*/
	
	dbusers.findOne({'login':login}, function(err, result){
		if(!result){
			dbusers.findOne({'nick':nick}, function(err, result){
				if(!result){
				
					/* Записываем данные юзера в базу */
					var newuser = {
						'login':login,
						'nick':nick,
						'pass':pass,
						'socket':'',
						'ip':s.handshake.address.address,
						'reg_date': time(),
						'statustext':'',
						'state':0,
						'privilege':2,
						'gender':0,
						'block_reason':'',
						'last_login':0,
						'ava_index':0,
						'vk_id':0,
						'client':0,
						'rating':0,
						'mess_count': 0,
						'textcolor':'#000',
						'block':0, // - заблокирован ли юзер 0 - нет, 1 - да
						'profile_visible':1 // - профиль видят только зареганные
					};
					
					dbusers.insert(newuser, function(err, result){
						/* уведомляем клиента */
						sendOk(s);
					});						
				} else {
					sendError('busynick', s);
				}
			});
		} else {
			sendError('busylogin', s);
		}
	});

}

function vkReg(param, s){
	var login = pWrap(param['login']);
	var nick = pWrap(param['nickname']);	
	var mid = pWrap(param['mid']);
	var vkurl = pWrap(param['url']);
	var rn = pWrap(param['realname']);	

	if(s.isLogin){
		s.json.send({'type':'vkreg', 'status':'error', 'reason':'alreadyauth'});
		return false;
	}	
	
	// Проверка на заблокированые слова
	for(var i=0; i<config['busyLogins'].length-1; i++){
		if(config['busyLogins'][i] == login || config['busyLogins'][i] == nick){
			s.json.send({'type':'vkreg', 'status':'error', 'reason':'busynicklogin'});
			return false;
		}
	}
	
	/* Проверка введенных данных для регистрации */
	if(mid==''){
		s.json.send({'type':'vkreg', 'status':'error', 'reason':'nomid'});
		return false;
	}
	
	if(!/^[\w-]{3,25}$/i.test(login)){
		s.json.send({'type':'vkreg', 'status':'error', 'reason':'wronglogin'});
		return false;		
	}
	
	if(nick.length < 3 || nick.length > config['maxNickLength']){
		s.json.send({'type':'vkreg', 'status':'error', 'reason':'wrongnick'});
		return false;				
	}
	
	/* Проверка юзера на IP бан */
	
	dbusers.findOne({'login':login}, function(err, result){
		if(!result){
			dbusers.findOne({'nick':nick}, function(err, result){
				if(!result){
				
					/* Записываем данные юзера в базу */
					var newuser = {
						'login':login,
						'nick':nick,
						'pass':'-',
						'socket':'',
						'ip':s.handshake.address.address,
						'reg_date': time(),
						'statustext':'',
						'state':0,
						'privilege':2,
						'gender':0,
						'block_reason':'',
						'last_login':0,
						'ava_index':0,
						'vk_id':mid*1,
						'vk':vkurl,
						'realname':rn,
						'client':0,
						'rating':0,
						'mess_count': 0,
						'textcolor':'#000',
						'block':0, // - заблокирован ли юзер 0 - нет, 1 - да
						'profile_visible':1 // - профиль видят только зареганные
					};
					
					dbusers.insert(newuser, function(err, res){});
					s.json.send({'type':'vkreg', 'status':'ok'});
					
				} else {
					s.json.send({'type':'vkreg', 'status':'error', 'reason':'busynick'});
				}
			});
		} else {
			s.json.send({'type':'vkreg', 'status':'error', 'reason':'busylogin'});
		}
	});

}

function adminReg(param, s){
	var login = pWrap(param['login']);
	var nick = pWrap(param['nickname']);	
	var pass = pWrap(param['pass']);

	if(s.isLogin){
		s.json.send({'type':'adminreg', 'status':'error', 'reason':'notlogin'});
		return false;
	}	
	
	if(s.profile.privilege >= 2){
		s.json.send({'type':'adminreg', 'status':'error', 'reason':'notallowed'});
		return false;
	}	
	
	// Проверка на заблокированые слова
	for(var i=0; i<config['busyLogins'].length-1; i++){
		if(config['busyLogins'][i] == login || config['busyLogins'][i] == nick){
			s.json.send({'type':'adminreg', 'status':'error', 'reason':'busynicklogin'});
			return false;
		}
	}
	
	/* Проверка введенных данных для регистрации */
	if(pass.length != 40) {
		s.json.send({'type':'adminreg', 'status':'error', 'reason':'wrongpass'});
		return false;
	}
	
	if(!/^[\w-]{3,15}$/i.test(login)){
		s.json.send({'type':'adminreg', 'status':'error', 'reason':'wronglogin'});
		return false;		
	}
	
	if(nick.length < 3 || nick.length > config['maxNickLength']){
		s.json.send({'type':'adminreg', 'status':'error', 'reason':'wrongnick'});
		return false;				
	}
	
	/* Проверка юзера на IP бан*/
	
	dbusers.findOne({'login':login}, function(err, result){
		if(!result){
			dbusers.findOne({'nick':nick}, function(err, result){
				if(!result){
				
					/* Записываем данные юзера в базу */
					var newuser = {
						'login':login,
						'nick':nick,
						'pass':pass,
						'socket':'',
						'ip':'0.0.0.0',
						'reg_date': time(),
						'statustext':'',
						'state':0,
						'privilege':2,
						'gender':0,
						'block_reason':'',
						'last_login':0,
						'ava_index':0,
						'vk_id':0,
						'client':0,
						'rating':0,
						'block':0, // - заблокирован ли юзер 0 - нет, 1 - да
						'profile_visible':1 // - профиль видят только зареганные
					};
					
					dbusers.insert(newuser, function(err, result){});	
					s.json.send({'type':'adminreg', 'status':'ok', 'login':login, 'nick':nick});

				} else {
					s.json.send({'type':'adminreg', 'status':'error', 'reason':'busynick'});
				}
			});
		} else {
			s.json.send({'type':'adminreg', 'status':'error', 'reason':'busylogin'});
		}
	});

}

function sendError(reason, s){
	s.json.send({'type':'register', 'status':'error', 'reason':reason});
}
function sendOk(s){
	s.json.send({'type':'register', 'status':'ok'});
}
function pWrap(par){
	return isset(par) ? par : '';
}

exports.registerUser = registerUser;
exports.vkReg = vkReg
exports.adminReg = adminReg