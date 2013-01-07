var fs = require("fs");

function readConfig(onOk){
	fs.open("hitagiserver/server.cfg", "r", 0644, function(err, file_handle) {
	if (!err) {
		fs.read(file_handle, 10000, null, 'ascii', function(err, data) {
			if (!err) {
			
				var lines = data.split(';');
				var conf = {};				
				for(var i=0; i<lines.length-1; i++){
					var pair = lines[i].split('=');
					conf[trim(pair[0], '\n ')] = trim(pair[1], '\n ');
				}

				conf['author'] = 'Tayanchin Alexey';
				conf['version'] = '0.1 dev';
				conf['releaseDate'] = '07.09.2012';
				conf['homepage'] = 'http://redspirit.ru/';				
				
				var blogins = conf['busyLogins'].split('|');
				conf['busyLogins'] = [];				
				for(i=0; i<blogins.length-1; i++){
					conf['busyLogins'].push(trim(blogins[i],' '));
				}
				
				onOk(conf);	

			} else {
				console.log('Error: Can not read config file');
				return false;
			}
		});
	} else {
		console.log('Error: Can not open config file');
		return false;
	}
	});
};

function trim(str, chars) { 
	return ltrim(rtrim(str, chars), chars); 
} 
 
function ltrim(str, chars) { 
	chars = chars || "\\s"; 
	return str.replace(new RegExp("^[" + chars + "]+", "g"), ""); 
} 
 
function rtrim(str, chars) { 
	chars = chars || "\\s"; 
	return str.replace(new RegExp("[" + chars + "]+$", "g"), ""); 
}

exports.readConfig = readConfig;