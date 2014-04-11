module.exports={
  loginUser: function(User, err, user, login){
    var sendData = {};
    if(err){
      console.log('error loginUser:'+err);
    }else if(user){
      sendData.user = user;
    }else if(login.hasOwnProperty('facebook') && login.facebook.length > 0){
      user = new User({
        name: login.name,
        facebook: login.facebook
      });
      user.save(function(err){
        if(err) console.log('error saving user:'+err);
      });
      sendData.user = user;
    }else if(login.hasOwnProperty('device_id') && login.device_id.length > 0){
      user = new User({
        name: login.name,
        device_id: login.device_id,
        corrects: [0,0,0,0,0,0],
        wrongs: [0,0,0,0,0,0]
      });
      user.save(function(err){
        if(err) console.log('error saving user:'+err);
      });
      sendData.user = user;
    }
    console.log("send:::"+JSON.stringify(sendData));
    return sendData;
  },
  removeUserFromTrolley: function(User, Trolley, user_id){
    User.findOne({ _id: user_id}, function(err, user){
      if(!err && user.trolley_id){
        Trolley.findOne({ _id: user.trolley_id}, function(err, trolley){
          if(!err && trolley){
            trolley.users = trolley.users.filter(function(u, i){
              if(u._id === user_id) return false;
              else return true;
            });
            if(trolley.users.length == 0){
              console.log('トロッコ除去');
              trolley.remove();
              user.trolley_id = null;
              user.save(function(err){});
            }else trolley.save(function(err){
              if(!err){
                user.trolley_id = null;
                user.save(function(err){});
              }
            });
          }else{
            console.log('error findOneTrolley: '+ err);
          }
        });
      }
    });
  },
  getNextQuiz: function(Trolley, trolley_id, quizes_list, cb){

    Trolley.findOne({ _id: trolley_id }, function(err, trolley){
      if(!err){
        var quizes = quizes_list[trolley.category-1];
        var history = trolley.history;
        var rest_quizes = quizes.filter(function(quiz, i){
          history.forEach(function(num){
            if(num === quiz.index) return false;
          });
          return true;
        });

        if(rest_quizes.length == 0){
          rest_quizes = quizes;
          trolley.history = [];
        } 
        var quiz = rest_quizes[Math.floor(Math.random()*rest_quizes.length)];
        trolley.history.push(quiz.index);
        trolley.corrects = 0;
        trolley.correct_way = Math.floor(Math.random(2)+1);
        trolley.current_num++;
        trolley.updated_at = Date.now();
        trolley.quiz = quiz;
        trolley.save(function(err){
          if(!err){
            cb(trolley);
          }
        });
      }else{
        console.log('err findOneTrolley:'+err);
      }
    });
  },
  sendMessageToTrolley: function(Trolley, trolley_id, clients, message, cb){
    Trolley.findOne({ _id: trolley_id }, function(err, trolley){
      if(!err){
        console.log(clients);
        tr_clients = clients.filter(function(client, index){
          if(client.hasOwnProperty('user_id')){
            for(var i = 0; i < trolley.users.length; i++){
              if(String(trolley.users[i]._id) == String(client.user_id)){
                return true;
              } 
            }
          }
          return false;
        });
        console.log(tr_clients);
        tr_clients.forEach(function(client){
          client.socket.send(message);
        });
        cb();
      }else{
        console.log('error findingTrolley:'+err);
      }
    });
  }
}