var http = require('http');
var WSServer = require('ws').Server;
var url = require('url');

var mongoose = require('mongoose');

// 定義フェーズ
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  name: {type:String, default: '新入り' },
  facebook: String
});

var TrolleySchema = new Schema({
  current_num: {type: Number, default:0},
  users: [UserSchema],
  sec: {type: Number, default:5},
  corrects: {type: Number, default:0}
});

mongoose.model('User', UserSchema);
mongoose.model('Trolley', TrolleySchema);

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
    if(data.hasOwnProperty('user')){
      User.find({ facebook: data.user.facebook }, function(err, docs) {
        var sendData = {};
        if(docs.length > 0){
          sendData.user = docs[0];
        }else if(data.user.hasOwnProperty('facebook') &&
          data.user.facebook.length > 0){
          var user = new User({
            name: data.user.name,
            facebook: data.user.facebook
          });
          user.save(function(err){
            if(err) console.log(err);
          });
          sendData.user = user;
        }
        console.log("send:::"+JSON.stringify(sendData));
        ws.send(JSON.stringify(sendData));
      });
    }
  });
});