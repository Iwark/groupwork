/**
 * Module dependencies.
 */
 
var express = require('express');
var WSServer = require('websocket').server;
var url = require('url');
var path = require('path');
 
var app = express();
var server = require('http').createServer(app);
 
app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});
 
app.configure('development', function(){
  app.use(express.errorHandler());
});
 
server.listen(app.get('port'))

var webSocketServer = new WSServer({ httpServer: server });
var accept = ['localhost', '127.0.0.1'];

webSocketServer.on('request', function(req){
	req.origin = req.origin || '*';
	if(accept.indexOf(url.parse(req.origin).hostname) === -1){
		req.reject();
		console.log(req.origin + 'からのアクセスは許可されていません。');
		return;
	}

	var websocket = req.accept(null, req.origin);

	websocket.on('message',function(msg){
		console.log('"' + msg.utf8Data + '"を' + req.origin + 'から受信');
		if(msg.utf8Data === 'Hello'){
			websocket.send('WebSocketサーバからこんにちは！');
		}
	});

	websocket.on('close', function(code, desc){
		console.log('接続解除：' + code + '-' + desc);
	});
});