var http = require('http');
var WSServer = require('websocket').server;
var url = require('url');

var plainHttpServer = http.createServer(function(req, res){
		res.writeHead(200, { 'Content-Type': 'text/html' });
        console.log("aaa");
        res.end('Hello');
}).listen(3000);

var webSocketServer = new WSServer({ httpServer: plainHttpServer });
var accept = ['localhost', '127.0.0.1', '172.16.201.22'];

webSocketServer.on('connect', function(req){
        console.log("ddd");
});

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