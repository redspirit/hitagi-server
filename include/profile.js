im = require('imagemagick');
var fs = require("fs");
var tools = require('./tools.js');
var ObjectID = require('mongodb').ObjectID;

function setProfile(param, s){
	var puser = pWrap(param['user']);
	var udata = isset(param['userdata']) ? param['userdata'] : {};
	
	if(!s.isLogin){
		sendErrorSet('notlogin', s);
		return false;
	}
	
	var priv = s.profile['privilege'];
	if(priv == 3){
		sendErrorSet('notallowed', s);
		return false;
	}
	if(priv == 2 && s.profile.login != puser){
		sendErrorSet('notallowed', s);
		return false;
	}
	
	if(isset(udata['nickname']))
		if(udata['nickname'].length < 3 || udata['nickname'].length > 15){
			sendErrorSet('wrongnick', s);
			return false;				
		}	
	
	if(isset(param['visible'])){
		var v = param['visible'];
		if(!(v==0 || v==1 || v==2)){
			sendErrorSet('wrongvisible', s);
			return false;			
		}
	}
	
	var pdata = {};
	if(isset(udata['nickname'])) pdata['nick'] = udata['nickname'];
	if(isset(udata['gender'])) pdata['gender'] = udata['gender'];
	if(isset(udata['birthday'])) pdata['birthday'] = udata['birthday'];
	if(isset(udata['realname'])) pdata['realname'] = udata['realname'];
	if(isset(udata['country'])) pdata['country'] = udata['country'];
	if(isset(udata['email'])) pdata['email'] = udata['email'];
	if(isset(udata['homepage'])) pdata['homepage'] = udata['homepage'];
	if(isset(udata['phone'])) pdata['phone'] = udata['phone'];
	if(isset(udata['icq'])) pdata['icq'] = udata['icq'];
	if(isset(udata['skype'])) pdata['skype'] = udata['skype'];
	if(isset(udata['twitter'])) pdata['twitter'] = udata['twitter'];
	if(isset(udata['facebook'])) pdata['facebook'] = udata['facebook'];
	if(isset(udata['vk'])) pdata['vk'] = udata['vk'];
	pdata['profile_visible'] = v;
	
	dbusers.findOne({'login':puser}, function(err,res){
		if(res){
			dbusers.updateById(res['_id'], {$set: pdata}, function(err, result){});
			s.json.send({'type':'setprofile', 'status':'ok'});
		} else {
			sendErrorSet('notexists', s);
		}
	});
	
};

function getProfile(param, s){
	var puser = pWrap(param['user']);
	var priv = s.profile.privilege;
	
	if(!s.isLogin){
		sendErrorGet('notlogin', s);
		return false;
	}
	
	dbusers.findOne({'login':puser}, function(err,res){
		if(res){
			var vis = res['profile_visible'];
			
			if(priv == 3 && vis != 0){
				sendErrorGet('notallowed', s);
				return false;
			}
			if(priv == 2 && vis == 2 && s.profile['login'] != puser){
				sendErrorGet('notallowed', s);
				return false;			
			}
			
			var pdata = {};
			if(isset(res['nick'])) pdata['nickname'] = res['nick'];
			if(isset(res['gender'])) pdata['gender'] = res['gender'];
			if(isset(res['birthday'])) pdata['birthday'] = res['birthday'];
			if(isset(res['realname'])) pdata['realname'] = res['realname'];
			if(isset(res['country'])) pdata['country'] = res['country'];
			if(isset(res['email'])) pdata['email'] = res['email'];
			if(isset(res['homepage'])) pdata['homepage'] = res['homepage'];
			if(isset(res['phone'])) pdata['phone'] = res['phone'];
			if(isset(res['icq'])) pdata['icq'] = res['icq'];
			if(isset(res['skype'])) pdata['skype'] = res['skype'];
			if(isset(res['twitter'])) pdata['twitter'] = res['twitter'];
			if(isset(res['facebook'])) pdata['facebook'] = res['facebook'];
			if(isset(res['vk'])) pdata['vk'] = res['vk'];
			
			s.json.send({'type':'getprofile', 'status':'ok', 'user':puser, 'privilege':res['privilege'], 'userdata':pdata, 'visible':vis});
		} else {
			sendErrorGet('notexists', s);
		}
	});	

};

function setAvatar(param, s){
	var data = param['file'];
	var user = s.profile.login;
		
	if(!s.isLogin){
		s.json.send({'type':'setavatar', 'status':'error', 'reason':'notlogin'});
		return false;
	}	

	var n = data.indexOf('/')+1;
	var ext = data.substring(n, data.indexOf(';'));
	var bmp = new Buffer(data.substring(data.indexOf(',')+1), 'base64');
	var tmp_name = config['serverDir']+'/avatars/tmp/'+user+'.'+ext;
	var dest_name = config['serverDir']+'/avatars/'+user+'.jpg';
	var addGif = (ext == 'gif') ? '[0]' : '';
	
	fs.writeFile(tmp_name, bmp, function (err) {
		if(!err){
			im.crop({srcPath: tmp_name+addGif, dstPath: dest_name, width: 80, height: 80, quality: 0.96}, function(err, stdout, stderr){
  				if(!err){
					fs.unlink(tmp_name);
					
					dbusers.update({'login':user}, {$inc:{'ava_index':1}}, function(){});
					dbhistEv.insert({'user':user, 'event':5, 'date':time()}, function(err,res){});
					s.profile.avaindex++;
					
					dbusers.find({'socket':{$ne:''}}).toArray(function(err,res){
						for(var i=0; i<res.length; i++){
							io.sockets.socket(res[i]['socket']).json.send({'type':'setavatar', 'status':'ok', 'user':user, 'url':'http://'+serverHost+':'+config['httpPort']+'/avatar/'+user+'?'+s.profile.avaindex});
						}
					});	
					
					//tools.sendUsersToRoom(res.room, {'type':'erasemessage', 'status': 'ok', 'mid':mid});
					
				} else {
					console.log('Error uploading Avatar');
				}
			});
		} else {
			console.log('Error uploading Avatar');
		}
	});	

}

function setStatus(param, s){
	var text = pWrap(param['text']);
	var user = s.profile.login;
	if(!s.isLogin){
		s.json.send({'type':'setstatus', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	text = text.substring(0,90);
	dbusers.update({'login':user}, {$set: {'statustext':text}}, function(err, result){});
	dbusers.find({'socket':{$ne:''}}).toArray(function(err,res){
		for(var i=0; i<res.length; i++){
			io.sockets.socket(res[i]['socket']).json.send({'type':'setstatus', 'status':'ok', 'user':user, 'text':text});
		}
	});
	dbhistEv.insert({'user':user, 'event':6, 'text':text, 'date':time()}, function(err,res){});
}

function setState(param, s){
	var val = pWrap(param['val']) * 1;
	var user = s.profile.login;
	if(!s.isLogin){
		s.json.send({'type':'setstate', 'status':'error', 'reason':'notlogin'});
		return false;
	}	
	dbusers.update({'login':user}, {$set: {'state':val}}, function(err, result){});
	dbusers.find({'socket':{$ne:''}}).toArray(function(err,res){
		for(var i=0; i<res.length; i++){
			io.sockets.socket(res[i]['socket']).json.send({'type':'setstate', 'status':'ok', 'user':user, 'val':val});
		}
	});	
	dbhistEv.insert({'user':user, 'event':7, 'value':val, 'date':time()}, function(err,res){});	
}

function saveRating(param, s){
	var val = pWrap(param['val']) * 1;
	var mid = pWrap(param['mid']);
	var vuser = s.profile.login;	

	if(!s.isLogin){
		s.json.send({'type':'saverating', 'status':'error', 'reason':'notlogin'});
		return false;
	}
	if(mid==''){
		s.json.send({'type':'saverating', 'status':'error', 'reason':'nomid'});
		return false;	
	}
	
	dbhist.findOne({'_id':new ObjectID(mid)}, function(err,res){
		if(res){
		// определяем юзера сообщения
		
			if (in_array(vuser, res.voted)){
				s.json.send({'type':'saverating', 'status':'error', 'reason':'alreadyvoted'});
				return false;
			}
			if (vuser==res.user){
				s.json.send({'type':'saverating', 'status':'error', 'reason':'isowner'});
				return false;
			}
		
			dbusers.update({'login':res.user}, {$inc:{'rating':val}}, function(err, result){
				dbusers.findOne({'login':res.user}, function(err,res2){
					s.json.send({'type':'saverating', 'status':'ok', 'user':res.user, 'rating':res2.rating, 'nick':res2.nick});
				});
			});
			
			dbhist.update({'_id':new ObjectID(mid)}, {$addToSet:{'voted':vuser}}, function(err, resu){});
			
		} else {
			s.json.send({'type':'saverating', 'status':'error', 'reason':'nomessage'});
		}
	});

	
}

function in_array(needle, haystack, strict) {
	var found = false, key, strict = !!strict;
	for (key in haystack) {
		if ((strict && haystack[key] === needle) || (!strict && haystack[key] == needle)) {
			found = true;
			break;
		}
	}
	return found;
}

function sendErrorSet(reason, s){
	s.json.send({'type':'setprofile', 'status':'error', 'reason':reason});
}
function sendErrorGet(reason, s){
	s.json.send({'type':'getprofile', 'status':'error', 'reason':reason});
}
function pWrap(par){
	return isset(par) ? par : '';
}

exports.set = setProfile;
exports.get = getProfile;
exports.setavatar = setAvatar;
exports.setstatus = setStatus;
exports.setstate = setState;
exports.saverating = saveRating;