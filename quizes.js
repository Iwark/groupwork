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

module.exports = quizes