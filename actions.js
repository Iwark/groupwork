module.exports={
  loginUser: function(User, err, user, login){
    var sendData = {};
    if(err){
      console.log('error loginUser:'+err);
    }else if(user){
      console.log('1:'+user);
      sendData.user = user;
    }else if(login.hasOwnProperty('facebook') && login.facebook.length > 0){
      user = new User({
        name: login.name,
        facebook: login.facebook
      });
      console.log('2:'+user);
      user.save(function(err){
        if(err) console.log('error saving user:'+err);
      });
      sendData.user = user;
    }else if(login.hasOwnProperty('device_id') && login.device_id.length > 0){
      user = new User({
        name: login.name,
        device_id: login.device_id
      });
      console.log('3:'+user);
      user.save(function(err){
        if(err) console.log('error saving user:'+err);
      });
      sendData.user = user;
    }
    console.log("send:::"+JSON.stringify(sendData));
    return sendData;
  },
  removeUserFromTrolley: function(User, user_id){
    User.findOne({ _id: user_id}, function(err, user){
      if(!err && user.trolley_id){
        Trolley.findOne({ _id: user.trolley_id}, function(err, trolley){
          if(!err){
            trolley.users = trolley.users.filter(function(u, i){
              if(u._id === user_id) return false;
              else return true;
            });
            if(trolley.users.length == 0) trolley.remove();
            else trolley.save(function(err){
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
  }
}