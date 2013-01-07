var qs = require('querystring');
var url = require("url");

var reg = require('./register.js');

function query(req, res){
	var path = url.parse(req.url).pathname;
	var params = qs.parse(url.parse(req.url).query);
	var chunks = path.split('/');
	var com = chunks[2];
		
	if(com=='check'){
		if(params.pass == config['adminPass']){
			sendq('ok', res)
		} else {
			sendq('error', res)		
		}
	} else if(com=='register'){

		//params.login
		//params.nick
		//params.pass
		
		//reg
		
	} else {
		sendq('Access error', res)	
	}

}

function sendq(text, res){
	res.writeHead(200, {"Content-Type": "text/plain"});
	res.write(text);	
	res.end();
}


/*
    if (req.method == 'POST') {
		res.writeHead(200, {"Content-Type": "text/plain"});
		if(req.url!='/api'){
			res.write("Access error...");
		} else {
			var body = '';
			req.on('data', function (data) {
				body += data;
			});
			req.on('end', function () {
				var POST = qs.parse(body);
				var command = POST.command;
				var pass = POST.pass;
				if(pass==config['adminPass']){
				
					res.write("OK OK OK!");
					res.end();
					
				} else {
					res.write("Access error...");
					res.end();
				}
			});
		}
				
    }
	*/
	
exports.query = query;