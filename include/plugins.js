var vm = require('vm');
var fs = require("fs");
var xml2js = require('xml2js');
var http = require('http');
var url = require('url');

var botSender;

function loadPlugin(filename){
	fs.readFile(config['serverDir']+'/plugins/'+filename, function (err, data) {
		if(!err){	
		
        	try{
				startExec(vm.createScript(data));
        	}catch(e){
				console.log('Plugin error: ', e);
        	}		
		
		} else {
			console.log('Error Load Module');
		}
	});
}

function reloadPlugin(){

}


function startExec(script){
	script.runInThisContext();
	var bot = initBot({fs:fs, http:http, url:url, xml:xml2js});

	console.log('Bot init: ' + bot.name);

	exports.botSender = bot.send;

	bot.onRecive = function(s, mes){
		s.json.send({'type':'chat', 'isbot':1, 't':mes});
	}
	
}

exports.load = loadPlugin;