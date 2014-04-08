module.exports={
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