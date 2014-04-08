//モデル作成
var mongoose = require('mongoose');
var schema = require('./schema.js');
for (var key in schema){
  mongoose.model(key, schema[key]);
}
var User = mongoose.model('User');
var Trolley = mongoose.model('Trolley');
mongoose.connect('mongodb://localhost/trolley_quiz');

var actions = require('./actions.js');

// クイズの読み込み
var quizes = require('./quizes.js');

var http = require('http');
var plainHttpServer = http.createServer(function(req, res){
	res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('Hello');
}).listen(8080);

var WSServer = require('ws').Server;
var wss = new WSServer({ port: 8081 });

var clients = [];

wss.on('connection', function(ws){
  clients.push({ socket: ws });
  //ログアウト
  ws.on('close',function(){
    clients = clients.filter(function(client, index){
      if(client.socket === ws){
        if(client.hasOwnProperty('user_id')){
          actions.removeUserFromTrolley(User, client.user_id);
        }
        return false;
      }else{
        return true;
      }
    });
  });

  ws.on('message', function(msg){
    console.log('"' + msg + '"を受信');
    var data = JSON.parse(msg);
    if(data.hasOwnProperty('login')){
      var sendData;
      if(data.login.hasOwnProperty('facebook')){
        User.findOne({ facebook: data.login.facebook }, function(err, user) {
          console.log('user(f):'+user);
          ws.send(JSON.stringify(actions.loginUser(User, err, user, data.login)));
        });
      }else if(data.login.hasOwnProperty('device_id')){
        User.findOne({ device_id: data.login.device_id },function(err, user){
          console.log('user:'+user);
          ws.send(JSON.stringify(actions.loginUser(User, err, user, data.login)));
        });
      }
    }else if(data.hasOwnProperty('get_trolleys')){
      Trolley.find({ }, function(err, docs) {
        var sendData = {};
        sendData.trolleys = docs;
        console.log("send:::"+JSON.stringify(sendData));
        ws.send(JSON.stringify(sendData));
      });
    }else if(data.hasOwnProperty('ride_trolley')){
      var sendData = {};
      if(data.ride_trolley.hasOwnProperty('_id')){
        Trolley.findOne({ _id: data.ride_trolley._id}, function(err, trolley){
          if(!err){
            User.findOne({ _id:data.user_id}, function(err, user){
              if(!err){
                trolley.users.push(user);
                trolley.save(function(err){
                  if(err) console.log(err);
                  else{
                    user.trolley_id = trolley._id;
                    user.save(function(err){
                      console.log('error savingUser: '+err);
                    });
                    sendData.trolley = trolley;
                    ws.send(JSON.stringify(sendData));
                  }
                });
              }else{
                console.log('error findOneUser: '+err);
              }
            });
          }else{
            console.log('error findOneTrolley: '+err);
          }
        });
      }else{
        //新しいトロッコの生成
        var trolley = new Trolley({
          category: data.ride_trolley.category,
          current_num: 0,
          sec: 5,
          corrects: 0
        });
        User.findOne({ _id:data.user_id}, function(err, user){
          if(!err){
            trolley.users.push(user);
            trolley.save(function(err){
              if(err) console.log(err);
              else{
                user.trolley_id = trolley._id;
                user.save(function(err){
                  console.log('error savingUser: '+err);
                });
                sendData.trolley = trolley;
                ws.send(JSON.stringify(sendData));
              }
            });
          }else{
            console.log('error findOneUser: '+err);
          }
        });
      }
    }
  });
});