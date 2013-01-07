var express = require('express');
var app = express();

app.use(express.bodyParser());
app.post('/api', function(req, res){
	console.log(req.body);
	res.send('API READY');
});

app.listen(8081);