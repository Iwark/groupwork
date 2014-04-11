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

Trolley.remove({},function(){});

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
    console.log("client is closed.");
    clients = clients.filter(function(client, index){
      if(client.socket === ws){
        console.log("ws found.");
        if(client.hasOwnProperty('user_id')){
          console.log("user found.");
          actions.removeUserFromTrolley(User, Trolley, client.user_id);
        }
        return false;
      }else{
        return true;
      }
    });
  });

  ws.on('error',function(){
    console.log("error!");
  });

  ws.on('message', function(msg){
    console.log('"' + msg + '"を受信');
    var data = JSON.parse(msg);
    if(data.hasOwnProperty('login')){
      if(!data.login.hasOwnProperty('name') || !data.login.name){
        data.login.name = '新入り';
      }
      var sendData = {};
      if(data.login.hasOwnProperty('facebook')){
        User.findOne({ facebook: data.login.facebook }, function(err, user) {
          if(!err && user){
            sendData.user = user;
            ws.send(JSON.stringify(sendData));
            clients.forEach(function(client){
              if(client.socket === ws) client.user_id = user._id;
            });
            console.log("send:::"+JSON.stringify(sendData));
          }else if(!err){
            actions.createUser(User, data.login, function(user){
              sendData.user = user;
              ws.send(JSON.stringify(sendData));
              clients.forEach(function(client){
                if(client.socket === ws) client.user_id = user._id;
              });
              console.log("send:::"+JSON.stringify(sendData));
            });
          }else console.log("error login:"+err);
        });
      }else if(data.login.hasOwnProperty('device_id')){
        User.findOne({ device_id: data.login.device_id },function(err, user){
          if(!err && user){
            sendData.user = user;
            ws.send(JSON.stringify(sendData));
            clients.forEach(function(client){
              if(client.socket === ws) client.user_id = user._id;
            });
            console.log("send:::"+JSON.stringify(sendData));
          }else if(!err){
            actions.createUser(User, data.login, function(user){
              sendData.user = user;
              ws.send(JSON.stringify(sendData));
              clients.forEach(function(client){
                if(client.socket === ws) client.user_id = user._id;
              });
              console.log("send:::"+JSON.stringify(sendData));
            });
          }else console.log("error login:"+err);
        });
      }
    }else if(data.hasOwnProperty('get_trolleys')){
      Trolley.find({ 
        $or: [
          { "updated_at": {"$gte":Date.now()-12000}, "current_num":1 }, 
          { "updated_at": {"$gte":Date.now()-15000, "$lte":Date.now()-8000 }, 
          "current_num" : {"$gte":1} }
        ]}, function(err, docs) {
          if(!err){
            var sendData = {};
            sendData.trolleys = docs;
            console.log("send:::"+JSON.stringify(sendData));
            ws.send(JSON.stringify(sendData));
          }else{
            console.log("err:::"+err);
          }
      });
    }else if(data.hasOwnProperty('ride_trolley')){
      var sendData = {};
      if(data.ride_trolley.hasOwnProperty('_id') && data.ride_trolley._id){
        Trolley.findOne({ _id: data.ride_trolley._id}, function(err, trolley){
          if(!err && trolley){
            User.findOne({ _id:data.user_id}, function(err, user){
              if(!err){
                trolley.users.push(user._id);
                trolley.save(function(err){
                  if(err) console.log(err);
                  else{
                    Trolley.findOne({ _id: user.trolley_id}, function(err, tr){
                      if(!err && tr){
                        tr.users = tr.users.filter(function(u,i){
                          if(String(u) == String(user._id)) return false;
                          else return true;
                        });
                        if(tr.users.length == 0) tr.remove();
                        else tr.save(function(err){});
                      }
                    });
                    user.trolley_id = trolley._id;
                    user.save(function(err){
                      if(err) console.log('error savingUser: '+err);
                    });
                    sendData.trolley = trolley;
                    sendData.users = [user];
                    var done = 0;
                    for(var i = 0; i < trolley.users.length; i++){
                      User.findOne({ _id: trolley.users[i]}, function(err, u){
                        if(!err && u){
                          if(u !== user) sendData.users.push(u);
                          done ++;
                          if(done == trolley.users.length){
                            ws.send(JSON.stringify(sendData));
                            console.log("sending::" + JSON.stringify(sendData));
                          }
                        }
                      });
                    }
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
          if(!err && user){
            trolley.users.push(user._id);
            trolley.save(function(err){
              if(err) console.log(err);
              else{
                user.trolley_id = trolley._id;
                user.save(function(err){
                  if(err) console.log('error savingUser: '+err);
                });
                sendData.users = [user];
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
      if(data.reply_answer.hasOwnProperty('user_id')){
        User.findOne({ _id: data.reply_answer.user_id}, function(err, user){
          if(!err && user){
            Trolley.findOne({ _id: user.trolley_id }, function(err, trolley){
              if(!err && trolley){
                if(data.reply_answer.hasOwnProperty('result')){
                  if(data.reply_answer.result == "correct"){
                    trolley.corrects++;
                    user.corrects[trolley.quiz.category-1] ++;
                  }else{
                    trolley.wrongs++;
                    user.wrongs[trolley.quiz.category-1] ++;
                  }
                  user.save(function(err){
                    if(err) console.log("err saving user ...");
                  });
                  trolley.save(function(err){
                    if(!err){
                      if(trolley.corrects + trolley.wrongs == trolley.users.length){
                        var sendData = {};
                        if(trolley.corrects > trolley.users.length / 2 ){
                          actions.getNextQuiz(Trolley,trolley._id,quizes,function(tr){
                            sendData.result = "correct";
                            sendData.trolley = tr;
                            actions.sendMessageToTrolley(Trolley, trolley._id,clients,JSON.stringify(sendData),function(){
                              // console.log('sent to users in trolley correct.');
                            });
                          });
                        }else if(trolley.wrongs > trolley.users.length / 2 ){
                          sendData.result = "wrong";
                          sendData.trolley = trolley;
                          actions.sendMessageToTrolley(Trolley, trolley._id,clients,JSON.stringify(sendData),function(){
                            // console.log('sent to users in trolley wrong.');
                          });
                        }else{
                          sendData.result = "same";
                          sendData.trolley = trolley;
                          actions.sendMessageToTrolley(Trolley, trolley._id,clients,JSON.stringify(sendData),function(){
                            // console.log('sent to users in trolley same.');
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
          }else{
            console.log('error findOneUser: '+err);
          }
        });
      }
    }else if(data.hasOwnProperty('move_character')){
      if(data.move_character.hasOwnProperty('user_id')){
        User.findOne({ _id: data.move_character.user_id }, function(err, user){
          if(!err && user){
            if(data.move_character.hasOwnProperty('x')) user.x = data.move_character.x;
            if(data.move_character.hasOwnProperty('y')) user.y = data.move_character.y;
            if(data.move_character.hasOwnProperty('z')) user.z = data.move_character.z;
            user.save(function(err){
              if(!err){
                Trolley.findOne({ _id: user.trolley_id }, function(err, trolley){
                  if(!err && trolley){
                    var sendData = {};
                    sendData.trolley = trolley;
                    sendData.users = [user];
                    var done = 0;
                    for(var i = 0; i < trolley.users.length; i++){
                      User.findOne({ _id: trolley.users[i]}, function(err, u){
                        if(!err && u){
                          if(u !== user) sendData.users.push(u);
                          done ++;
                          if(done == trolley.users.length){
                            actions.sendMessageToTrolley(Trolley, trolley._id,clients,JSON.stringify(sendData),function(){
                              // console.log('sent trolley to users in trolley same.');
                            });
                          }
                        }
                      });
                    }
                  }
                });
              }
            });
          }else console.log("some error happens");
        });
      }
    }else if(data.hasOwnProperty('send_message')){
      if(data.send_message.hasOwnProperty('user_id')){
        var sendData = {};
        if(data.send_message.hasOwnProperty('message')) 
          sendData.message = data.send_message.message;
        else if(data.send_message.hasOwnProperty('emotion'))
          sendData.emotion = data.send_message.emotion;

        User.findOne({ _id: data.send_message.user_id },function(err, user){
          if(!err && user){
            sendData.user = user;
            actions.sendMessageToTrolley(Trolley, user.trolley_id,clients,JSON.stringify(sendData),function(){
              // console.log('sent message to users in trolley same.');
            });
          }else{
            console.log("err finding user:"+err);
          }
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
        }else if(data.is_continue.hasOwnProperty('user_id')){
          User.findOne({ _id: user_id },function(err, user){
            if(!err && user){
              Trolley.findOne({ _id: user.trolley_id }, function(err, trolley){
                if(!err && trolley){
                  user.money += trolley.current_num * 500;
                  user.save(function(err){
                    if(!err){
                      actions.removeUserFromTrolley(User, Trolley, user._id);
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