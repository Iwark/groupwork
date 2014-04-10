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
      if(!data.login.hasOwnProperty('name') || !data.login.name){
        data.login.name = '新入り';
      }
      var sendData;
      if(data.login.hasOwnProperty('facebook')){
        User.findOne({ facebook: data.login.facebook }, function(err, user) {
          ws.send(JSON.stringify(actions.loginUser(User, err, user, data.login)));
        });
      }else if(data.login.hasOwnProperty('device_id')){
        User.findOne({ device_id: data.login.device_id },function(err, user){
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
                      if(err) console.log('error savingUser: '+err);
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
          category: parseInt(data.ride_trolley.category),
          current_num: 0,
          sec: 5,
          updated_at: Date.now(),
          history: [],
          corrects: 0,
          wrongs: 0
        });
        User.findOne({ _id:data.user_id}, function(err, user){
          if(!err){
            trolley.users.push(user);
            trolley.save(function(err){
              if(err) console.log(err);
              else{
                user.trolley_id = trolley._id;
                user.save(function(err){
                  if(!err) console.log('error savingUser: '+err);
                });
                actions.getNextQuiz(Trolley,trolley._id,quizes,function(tr){
                  sendData.trolley = tr;
                  ws.send(JSON.stringify(sendData));
                });
              }
            });
          }else{
            console.log('error findOneUser: '+err);
          }
        });
      }
    }else if(data.hasOwnProperty('reply_answer')){
      if(data.reply_answer.hasOwnProperty('trolley_id')){
        Trolley.findOne({ _id: data.reply_answer.trolley_id }, function(err, trolley){
          if(!err){
            if(data.reply_answer.hasOwnProperty('result')){
              if(data.reply_answer.result == "correct"){
                trolley.corrects++;
                if(data.reply_answer.hasOwnProperty('user_id')){
                  User.findOne({ _id: data.reply_answer.user_id}, function(err, user){
                    if(!err){
                      user.corrects[trolley.quiz.category-1] ++;
                    }else{
                      console.log("err finding one user:"+err);
                    }
                  });
                }
              }else{
                trolley.wrongs++;
                if(data.reply_answer.hasOwnProperty('user_id')){
                  User.findOne({ _id: data.reply_answer.user_id}, function(err, user){
                    if(!err){
                      user.wrongs[trolley.quiz.category-1] ++;
                    }else{
                      console.log("err finding one user:"+err);
                    }
                  });
                }
              }
              trolley.save(function(err){
                if(!err){
                  if(trolley.corrects + trolley.wrongs == trolley.users.length){
                    var sendData = {};
                    if(trolley.corrects > trolly.users.length / 2 ){
                      actions.getNextQuiz(Trolley,trolley._id,quizes,function(tr){
                        sendData.result = "correct";
                        sendData.trolley = tr;
                        actions.sendMessageToTrolley(trolley._id,clients,JSON.stringify(sendData),function(){
                          console.log('sent to users in trolley correct.');
                        });
                      });
                    }else if(trolley.wrongs > trolly.users.length / 2 ){
                      sendData.result = "wrong";
                      sendData.trolley = trolley;
                      actions.sendMessageToTrolley(trolley._id,clients,JSON.stringify(sendData),function(){
                        console.log('sent to users in trolley wrong.');
                      });
                    }else{
                      sendData.result = "same";
                      sendData.trolley = trolley;
                      actions.sendMessageToTrolley(trolley._id,clients,JSON.stringify(sendData),function(){
                        console.log('sent to users in trolley same.');
                      });
                    }
                  }
                }
              });
            }
          }else{
            console.log('error findOneTrolley: '+err);
          }
        });
      }
    }else if(data.hasOwnProperty('move_character')){
      if(data.move_character.hasOwnProperty('user_id')){
        User.findOne({ _id: data.move_character.user_id }, function(err, user){
          if(data.move_character.hasOwnProperty('x')) user.x = data.move_character.x;
          if(data.move_character.hasOwnProperty('y')) user.y = data.move_character.y;
          if(data.move_character.hasOwnProperty('z')) user.z = data.move_character.z;
          user.save(function(err){
            if(!err){
              Trolley.findOne({ _id: user.trolley_id }, function(err, trolley){
                if(!err){
                  var sendData = {};
                  sendData.trolley = trolley;
                  actions.sendMessageToTrolley(trolley._id,clients,JSON.stringify(sendData),function(){
                    console.log('sent trolley to users in trolley same.');
                  });
                }
              });
            }
          });
        });
      }
    }else if(data.hasOwnProperty('send_message')){
      if(data.send_message.hasOwnProperty('trolley_id')){
        var sendData = {};
        if(data.send_message.hasOwnProperty('message')) 
          sendData.message = data.send_message.message;
        else if(data.send_message.hasOwnProperty('emotion'))
          sendData.emotion = data.send_message.emotion;
        actions.sendMessageToTrolley(data.send_message.trolley_id,clients,JSON.stringify(sendData),function(){
          console.log('sent message to users in trolley same.');
        });
      }
    }else if(data.hasOwnProperty('is_continue')){
      if(data.is_continue.hasOwnProperty('result')){
        if(data.is_continue.result == "true" && data.is_continue.hasOwnProperty('trolley_id')){
          actions.getNextQuiz(Trolley,data.is_continue.trolley_id,quizes,function(tr){
            var sendData = {};
            sendData.trolley = tr;
            ws.send(JSON.stringify(sendData));
          });
        }else if(data.is_continue.hasOwnProperty('user_id') && data.is_continue.hasOwnProperty('trolley_id')){
          User.findOne({ _id: user_id },function(err, user){
            if(!err){
              Trolley.findOne({ _id: data.is_continue.trolley_id }, function(err, trolley){
                if(!err){
                  user.money += trolley.current_num * 500;
                  user.save(function(err){
                    if(!err){
                      actions.removeUserFromTrolley(User,user._id);
                      var sendData = {};
                      sendData.continue_result = "OK";
                      ws.send(JSON.stringify(sendData));
                    }else{
                      console.log("err saving user:"+err);
                    }
                  });
                }else{
                  console.log("err finding one trolley "+err);
                }
              });
            }else{
              console.log("err finding user:"+err);
            }
          });
        }
      }
    }
  });
});