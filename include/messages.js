var tools = require('./tools.js');

function sendMessage(param, s){
	var text = pWrap(param['text']);
	var user_to = pWrap(param['to']);
	var user_from = s.profile.login;
	
	if(user_from==user_to){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'tomyself'});
		return false;	
	}
	
	if(!s.isLogin){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	
	if(s.loginMode == 'anonim'){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'notuser'});
		return false;
	}	
	
	if(text.length==0 || text.length>config['messagePrivateMaxLength']){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'badtext'});
		return false;
	}

	dbusers.findOne({'login':user_to}, function(err,res){
		if(res){
			if(res['socket']!=''){
				// сообщение доставляется сразу
				dbmess.insert({'to':user_to, 'from':user_from, 'text':text, 'read':0, 'status':1, 'date':time()}, function(err,res){});
				io.sockets.socket(res['socket']).json.send({'type':'recmes', 'from':user_from, 'text':text});
				s.json.send({'type':'sendmess', 'status':'ok'});
			} else {
				// сообщение ждет юзера
				dbmess.insert({'to':user_to, 'from':user_from, 'text':text, 'read':0, 'status':0, 'date':time()}, function(err,res){});
				s.json.send({'type':'sendmess', 'status':'offline'});			
			}
		} else {		
			s.json.send({'type':'sendmess', 'status':'error', 'reason':'notfound'});
		}
	
	});	
}
function checkNewMessages(s){
	var isRecive = false;
	var user = s.profile.login;
	
	dbmess.find({'to':user, 'status':0}).toArray(function(err,res){
		for(var i=0; i<res.length; i++){
			isRecive = true;
			s.json.send({'type':'recmes', 'from':res[i]['from'], 'text':res[i]['text'], 'date':res[i]['date']});
		}
		if(isRecive){
			dbmess.update({'to': user, 'status':0}, {$set: {'status':1}}, {'multi':true}, function(err,res){});
		}		
	});
		
}
function getMessages(param, s){
	var user = pWrap(s.profile.login);
	var order = pWrap(param['order']);
	var from = pWrap(param['from']);
	var ds = pWrap(param['datestart']);
	var de = pWrap(param['dateend']);
	var ol = pWrap(param['onlylast']);
	
	
	if(!s.isLogin){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	
	if(s.loginMode == 'anonim'){
		s.json.send({'type':'sendmess', 'status':'error', 'reason':'notuser'});
		return false;
	}	
	
	if(order=='asc') order = 1; else order = -1;
	
	var dat = [];
	if(ol!=''){
		var criteria = {'to':user};
		var lim = ol*1;
		if(lim > 1000) lim = 1000;
		if(from != '') criteria['from'] = from;
		dbmess.find(criteria, {limit:lim, sort:{'date':order}}).toArray(function(err,res){
			for(var i=0; i < res.length; i++){
				dat[dat.length] = {'from':res[i]['from'], 'text':res[i]['text'], 'date':res[i]['date']};
			}		
			s.json.send({'type':'getmessages', 'status':'ok', 'count':dat.length, 'data':dat});
		});	
	} else {
		var criteria = {'to':user, $and:[{'date': {$gte:ds}}, {'date':{$lte:de}}]};
		if(from!='') criteria['from'] = from;
		dbmess.find(criteria, {limit:1000, sort:{'date':order}}).toArray(function(err,res){
			for(var i=0; i<res.length; i++){
				dat[dat.length] = {'from':res[i]['from'], 'text':res[i]['text'], 'date':res[i]['date']};
			}		
			s.json.send({'type':'getmessages', 'status':'ok', 'count':dat.length, 'data':dat});
		});
	}
	
}

function getAdminMessages(param, s){
	var user = pWrap(param['user']);
	var order = pWrap(param['order']);

	if(user==''){
		s.json.send({'type':'getmessages', 'status':'error', 'reason':'nouser'});
		return false;
	}
	

}

function pWrap(par){
	return isset(par) ? par : '';
}

exports.sendMessage = sendMessage;
exports.checkNewMessages = checkNewMessages;
exports.getMessages = getMessages;