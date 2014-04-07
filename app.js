var http = require('http');
var WSServer = require('ws').Server;
var url = require('url');

var mongoose = require('mongoose');

var schema = require('./schema.js');

var fs = require('fs');
var lineList = fs.readFileSync('QuizList.csv').toString().split('\r\n');
lineList.shift();
var quizKeyList = ['index','category','contents','correct_answer','wrong_answer'];
var quizes=[[],[],[],[],[],[]];
while(lineList.length){
  var line = lineList.shift();
  console.log(line);
  var doc = {};
  line.split(',').forEach(function (entry, i) {
    doc[quizKeyList[i]] = entry;
  });
  quizes[doc.category-1].push(doc);
}
console.log(quizes[0]);

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
    }else if(data.hasOwnProperty('ride_trolley')){
      var sendData = {};
      if(data.ride_trolley.hasOwnProperty('_id')){
        Trolley.findOne({ _id: data.ride_trolley._id}, function(err, trolley){
          if(!err){
            User.findOne({ _id:data.user_id}, function(err, user){
              if(!err){
                trolley.users.push(user);
                sendData.trolley = trolley;
                ws.send(JSON.stringify(sendData));
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