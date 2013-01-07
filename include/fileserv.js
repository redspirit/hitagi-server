var http = require("http");
var im = require('imagemagick');
var fs = require("fs");
var url = require("url");
var api = require('./api.js');

var noavaname = 'noavatar.gif';
var cachecontr = 'max-age=2592000, must-revalidate';
var servname = 'Hitagi Chat Server';

function startHttp(){
	http.createServer(servCallback).listen(config['httpPort'] * 1);	
}

function servCallback(req, res) {
	var pathname = url.parse(req.url).pathname.substr(1);
	var chunks = pathname.split('/');

	if(chunks[0]=='avatar'){
		// отдаем аватарку
		var par = chunks[1].split('?');
		var userId = par[0];
		fs.readFile(config['serverDir']+'/avatars/'+userId+'.jpg', function (err, data) {
			if(!err){
				res.writeHead(200, {
					"Server": servname,
					'Cache-Control': cachecontr,
					"Content-Type": "image/jpeg", 
					"Content-Length": data.length
				});
				res.write(data);
				res.end();
			} else {
				loadNoava(res);
			}
		});
	} else if (chunks[0]=='image') {
	// отдаем картинку
		var exts = chunks[1].split('.');
		var name = exts[0];
		var ext = exts[1];
	
		fs.readFile(config['serverDir']+'/share_images/orig/'+chunks[1], function (err, data) {
			if(!err){
				res.writeHead(200, {
					"Server": servname,
					'Cache-Control': cachecontr,
					"Content-Type": "image/"+ext, 
					"Content-Length": data.length
				});
				res.write(data);
				res.end();
			} else {
				loadNoImaga(res);
			}
		});	
		
	} else if (chunks[0]=='thumb') {
	// отдаем превьюшку
		var exts = chunks[1].split('.');
		var name = exts[0];
		var ext = exts[1];
	
		fs.readFile(config['serverDir']+'/share_images/optim/'+chunks[1], function (err, data) {
			if(!err){
				res.writeHead(200, {
					"Server": servname,
					'Cache-Control': cachecontr, 					
					"Content-Type": "image/"+ext, 
					"Content-Length": data.length
				});
				res.write(data);
				res.end();
			} else {
				loadNoImaga(res);
			}
		});		
	
	} else if(chunks[0]=='api'){
		api.query(req, res);
	} else {
		res.writeHead(200, {"Content-Type": "text/plain"});
		res.write("Error. Invalid query");
		res.end();		
	}

}

function uploadImage(param, s){
	var data = param['file'];
	var user = s.profile.login;
	
	if(!s.isLogin){
		s.json.send({'type':'uploadimage', 'status':'error', 'reason':'notlogin'});
		return false;
	}		

	var n = data.indexOf('/')+1;
	var ext = data.substring(n, data.indexOf(';'));
	var bmp = new Buffer(data.substring(data.indexOf(',')+1), 'base64');
	var inf = {'date':time(), 'user':user, 'type':ext};
	db.collection('files').insert(inf, function(err,res){
		var nid = inf['_id'];		
		var orig_name = config['serverDir']+'/share_images/orig/'+nid+'.'+ext;
		var optim_name = config['serverDir']+'/share_images/optim/'+nid+'.'+ext;	
	
		fs.writeFile(orig_name, bmp, function (err) {
			if(!err){

				im.identify([orig_name+'[0]'], function(err, output){
					if(err){
						s.json.send({'type':'uploadimage', 'status':'error', 'reason':'read'});
						return false;
					}
	  				var fldat = output.split(' ');
	  				var realext = fldat[1];
					var sizes = fldat[2].split('x');
					var sizeX = sizes[0] * 1, sizeY = sizes[1] * 1;
					
//					console.log(sizeX, sizeY);

					if(realext != 'GIF' && (sizeX>600 || sizeY > 600)){
						im.resize({
							srcPath: orig_name,
							dstPath: optim_name,
							width: 600,
							height: 600
						}, function(err, stdout, stderr){
							s.json.send({
								'type':'uploadimage', 
								'status':'ok', 
								'urlThumb':'http://'+serverHost+':'+config['httpPort']+'/thumb/'+nid+'.'+ext,
								'urlImage':'http://'+serverHost+':'+config['httpPort']+'/image/'+nid+'.'+ext,
								'user':user
							});
						});
					} else {
						s.json.send({
							'type':'uploadimage', 
							'status':'ok', 
							'urlImage':'http://'+serverHost+':'+config['httpPort']+'/image/'+nid+'.'+ext,
							'user':user
						});
					}				

				});	
			
			} else {
				s.json.send({'type':'uploadimage', 'status':'error', 'reason':'upload'});
			}
		});
	
	});
	
	
}

function loadNoava(res){
	fs.readFile(config['serverDir']+'/avatars/'+noavaname, function (err, data) {
		res.writeHead(200, {
			"Server": servname,
			'Cache-Control': cachecontr, 							
			"Content-Type": "image/gif", 
			"Content-Length": data.length
		});
		res.write(data);
		res.end();
	});	
}

function loadNoImaga(res){
	fs.readFile(config['serverDir']+'/share_images/noimage.png', function (err, data) {
		res.writeHead(200, {
			"Server": servname,
			'Cache-Control': cachecontr, 		
			"Content-Type": "image/png", 
			"Content-Length": data.length
		});
		res.write(data);
		res.end();
	});	
}

exports.startHttp = startHttp;
exports.uploadImage = uploadImage;
