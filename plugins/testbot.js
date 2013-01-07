function initBot(includes){
	var info = {
		name:'Testovich',
		version:'0.1',
	}
	var helpFile = '';
	var parser = new includes.xml.Parser();
	var weatherCountres;
	
	function reciveMess(s, mes){
		info.onRecive(s, mes);
	}

	includes.fs.readFile(config['serverDir']+'/plugins/testbot_help.html', function (err, data) {
		helpFile = String(data);
	});
	includes.fs.readFile(config['serverDir']+'/plugins/cities.xml', function (err, data) {
		parser.parseString(data, function (err, result){
			weatherCountres = result.cities.country;
		});
	});	

	info.send = function (rec){
		m = rec.text;
		rec.save = true;
		rec.toall = true;
		rec.proc = false;
		
		var rg = /^!([а-яА-Я]+) (.*)/gi;
		var found = rg.exec(m+' ');
		if(found){
			var com = found[1];
			var mess = trim(found[2], ' ');
			var param = mess.split(' ');

			if(com=='время'){
				m = 'Ваше время: '+ date('j F Y года, l, H:i');
				rec.toall = false;
			} else if(com=='я'){
				m = '<b>'+rec.nick+'</b> '+mess;
				rec.toall = true;
			} else if(com=='справка'){
				m = helpFile;
				rec.toall = false;
			} else if(com=='нг'){
				m = 'До Нового Года осталось: '+ng();
				rec.toall = false;
			} else if(com=='песня'){
				m = rec.nick+' предлагает послушать <a target="_blank" href="http://vk.com/audio?q='+encodeURIComponent(mess)+'">'+mess+'</a>';
				if(mess == '') m = 'Введите название песни, например: !песня страна лимония';
				rec.toall = true;
			} else if(com=='погода'){
				if(mess == '') 
					m = 'Введите город, например: !погода москва';
				else {
					mess = mess.toLowerCase();
					m = 'Город "'+mess+'" не найден. Убедитесь в правильности написания города';
					for(var stran in weatherCountres){
						for(var gor in weatherCountres[stran].city){
							var city = weatherCountres[stran].city[gor];
							if(city['_'].toLowerCase() == mess){
								getWeather(rec, {name:city['_'], region:city.$.part, country:city.$.country, id:city.$.id});
								m = 'Получение прогноза погоды...';
							};
						}
					}
		
				}
				rec.toall = true;			
			} else {
				m = 'Неизвестная команда "'+com+'"';
				rec.toall = false;	
			}
			
			rec.proc = true;
			rec.save = false;
		}
		
		rec.text = m;
		
		return rec;
	}


	function getWeather(rec, city){
		var p = {};
		getPage('http://export.yandex.ru/weather-ng/forecasts/'+city.id+'.xml', function(txt){
		
			parser.parseString(txt, function (err, result){
				var fact = result.forecast.day[0];
				var tom = result.forecast.day[1];
				
				p.fact = {
					date:fact.$.date,
					sunrise:fact.sunrise[0],
					sunset:fact.sunset[0],
					day:{
						temp:fact.day_part[4].temperature[0],
						type:fact.day_part[4].weather_type[0],
						wind:fact.day_part[4].wind_speed[0]
					},
					night:{
						temp:fact.day_part[5].temperature[0],
						type:fact.day_part[5].weather_type[0],
						wind:fact.day_part[5].wind_speed[0]
					}			
				};
				p.tomorrow = {
					date:tom.$.date,
					sunrise:tom.sunrise[0],
					sunset:tom.sunset[0],
					day:{
						temp:tom.day_part[4].temperature[0],
						type:tom.day_part[4].weather_type[0],
						wind:tom.day_part[4].wind_speed[0]
					},
					night:{
						temp:tom.day_part[5].temperature[0],
						type:tom.day_part[5].weather_type[0],
						wind:tom.day_part[5].wind_speed[0]
					}
				};

				
				var prognoz = '<b>Прогноз погоды:</b><br />'+city.country+', '+city.region+', '+city.name+'<br /><br /><b>Сегодня '+p.fact.date+':</b><br />Днем '+p.fact.day.temp+' С, '+p.fact.day.type+', скорость ветра '+p.fact.day.wind+' м/с<br />Ночью '+p.fact.night.temp+' С, '+p.fact.night.type+', скорость ветра '+p.fact.night.wind+' м/с.<br />Восход в '+p.fact.sunrise+', заход в '+p.fact.sunset+'<br /><br /><b>Завтра '+p.tomorrow.date+':</b><br />Днем '+p.tomorrow.day.temp+' С, '+p.tomorrow.day.type+', скорость ветра '+p.tomorrow.day.wind+' м/с<br />Ночью '+p.tomorrow.night.temp+' С, '+p.tomorrow.night.type+', скорость ветра '+p.tomorrow.night.wind+' м/с.<br />Восход в '+p.tomorrow.sunrise+', заход в '+p.tomorrow.sunset;
				reciveMess(rec.socket, prognoz);
				
			});		
		
		});
	
	}
	function getPage(pageurl, callback) {
		var options = {
			host: includes.url.parse(pageurl).host,
			port: 80,
			path: includes.url.parse(pageurl).pathname
		};
		var text = '';
		includes.http.get(options, function(res) {
			res.on('data', function(data) {
					text += data;
				}).on('end', function() {
					callback(text);
				});
			});
	};

	
	return info;

}



function stripBB(str){ return str.replace(/\[[^\]]+\]/g, '')}
function date(f,k){var h,e,g=/\\?([a-z])/gi,l,m=function(e,f){return(e+="").length<f?Array(++f-e.length).join("0")+e:e},s="Воскресенье Понедельник Вторник Среда Четверг Пятница Суббота января февраля марта апреля мая июня июля августа сентября октября ноября декабря".split(" ");l=function(f,g){return e[f]?e[f]():g};e={d:function(){return m(e.j(),2)},D:function(){return e.l().slice(0,3)},j:function(){return h.getDate()},l:function(){return s[e.w()]},N:function(){return e.w()||7},S:function(){var f=e.j();return 4<
f&&21>f?"th":{1:"st",2:"nd",3:"rd"}[f%10]||"th"},w:function(){return h.getDay()},z:function(){var f=new Date(e.Y(),e.n()-1,e.j()),g=new Date(e.Y(),0,1);return Math.round((f-g)/864E5)+1},W:function(){var f=new Date(e.Y(),e.n()-1,e.j()-e.N()+3),g=new Date(f.getFullYear(),0,4);return m(1+Math.round((f-g)/864E5/7),2)},F:function(){return s[6+e.n()]},m:function(){return m(e.n(),2)},M:function(){return e.F().slice(0,3)},n:function(){return h.getMonth()+1},t:function(){return(new Date(e.Y(),e.n(),0)).getDate()},
L:function(){return 1===(new Date(e.Y(),1,29)).getMonth()|0},o:function(){var f=e.n(),g=e.W();return e.Y()+(12===f&&9>g?-1:1===f&&9<g)},Y:function(){return h.getFullYear()},y:function(){return(e.Y()+"").slice(-2)},a:function(){return 11<h.getHours()?"pm":"am"},A:function(){return e.a().toUpperCase()},B:function(){var e=3600*h.getUTCHours(),f=60*h.getUTCMinutes(),g=h.getUTCSeconds();return m(Math.floor((e+f+g+3600)/86.4)%1E3,3)},g:function(){return e.G()%12||12},G:function(){return h.getHours()},h:function(){return m(e.g(),
2)},H:function(){return m(e.G(),2)},i:function(){return m(h.getMinutes(),2)},s:function(){return m(h.getSeconds(),2)},u:function(){return m(1E3*h.getMilliseconds(),6)},e:function(){throw"Not supported (see source code of date() for timezone on how to add support)";},I:function(){var f=new Date(e.Y(),0),g=Date.UTC(e.Y(),0),h=new Date(e.Y(),6),k=Date.UTC(e.Y(),6);return 0+(f-g!==h-k)},O:function(){var e=h.getTimezoneOffset(),f=Math.abs(e);return(0<e?"-":"+")+m(100*Math.floor(f/60)+f%60,4)},P:function(){var f=
e.O();return f.substr(0,3)+":"+f.substr(3,2)},T:function(){return"UTC"},Z:function(){return 60*-h.getTimezoneOffset()},c:function(){return"Y-m-d\\Th:i:sP".replace(g,l)},r:function(){return"D, d M Y H:i:s O".replace(g,l)},U:function(){return h.getTime()/1E3|0}};this.date=function(e,f){h="undefined"===typeof f?new Date:f instanceof Date?new Date(f):new Date(1E3*f);return e.replace(g,l)};return this.date(f,k)}
function ng(){now=new Date;ex=new Date(2013,0,1,0,0,0);hours=now.getHours();minutes=now.getMinutes();seconds=now.getSeconds();timeStr=""+hours;timeStr+=(10>minutes?":0":":")+minutes;timeStr+=(10>seconds?":0":":")+seconds;date=now.getDate();month=now.getMonth()+1;year=now.getYear();dateStr=""+date;dateStr+=(10>month?"/0":"/")+month;dateStr+="/"+year;ostStr="";x=(ex.getTime()-now.getTime())/1E3;ostStr=Math.floor(x/60/60)+" \u0447. ";ostStr=ostStr+Math.floor(60*(x/60/60-Math.floor(x/60/60)))+" \u043c\u0438\u043d. ";
x=60*(60*(x/60/60-Math.floor(x/60/60))-Math.floor(60*(x/60/60-Math.floor(x/60/60))));ostStr=ostStr+Math.floor(x)+" \u0441\u0435\u043a. ";x=1E3*(x-Math.floor(x));return ostStr};
function trim(b,a){return ltrim(rtrim(b,a),a)}function ltrim(b,a){return b.replace(RegExp("^["+(a||"\\s")+"]+","g"),"")}function rtrim(b,a){return b.replace(RegExp("["+(a||"\\s")+"]+$","g"),"")};