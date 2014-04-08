module.exports={
  loginUser: function(err, user, login){
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
        device_id: login.device_id
      });
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