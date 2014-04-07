var http = require('http');
var WSServer = require('ws').Server;
var url = require('url');

var mongoose = require('mongoose');

var schema = require('./schema.js');

// 定義フェーズ
mongoose.model('User', schema.user);
mongoose.model('Trolley', schema.trolley);

// 使用フェーズ
mongoose.connect('mongodb://localhost/trolley_quiz');

var User = mongoose.model('User');
var Trolley = mongoose.model('Trolley');

// var mongoServer = new mongo.Server('localhost', 27017);
// var mongoClient = new mongo.Db('quotes', mongoServer);

var plainHttpServer = http.createServer(function(req, res){
	res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('Hello');
}).listen(8080);

var wss = new WSServer({ port: 8081 });

var connections = [];

wss.on('connection', function(ws){
  connections.push(ws);
  ws.on('close',function(){
    connections = connections.filter(function(conn, i){
      return (conn === ws) ? false : true;
    });
  });

  ws.on('message', function(msg){
    console.log('"' + msg + '"を受信');
    var data = JSON.parse(msg);
    if(data.hasOwnProperty('login')){
      User.find({ facebook: data.login.facebook }, function(err, docs) {
        var sendData = {};
        if(docs.length > 0){
          sendData.user = docs[0];
        }else if(data.login.hasOwnProperty('facebook') &&
          data.login.facebook.length > 0){
          var user = new User({
            name: data.login.name,
            facebook: data.login.facebook
          });
          user.save(function(err){
            if(err) console.log(err);
          });
          sendData.user = user;
        }
        console.log("send:::"+JSON.stringify(sendData));
        ws.send(JSON.stringify(sendData));
      });
    }else if(data.hasOwnProperty('get_trolleys')){
      Trolley.find({ }, function(err, docs) {
        var sendData = {};
        sendData.trolleys = docs;
        console.log("send:::"+JSON.stringify(sendData));
        ws.send(JSON.stringify(sendData));
      });
    }
  });
});