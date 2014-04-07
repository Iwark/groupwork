var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
  name: {type:String, default: '新入り' },
  facebook: String
});
var TrolleySchema = new Schema({
  category: {type: String, default:'' },
  current_num: {type: Number, default:0},
  users: [UserSchema],
  sec: {type: Number, default:5},
  corrects: {type: Number, default:0}
});

module.exports = {
  user: UserSchema,
  trolley: TrolleySchema
};