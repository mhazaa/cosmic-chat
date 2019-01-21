module.exports = function(app){
  var bodyParser = require('body-parser');
  app.use(bodyParser.urlencoded({ extended: true }));
  app.post('/line', function(req, res){
    var data = JSON.parse(req.body.data);
    var string = '';
    for(var i=1; i<data.x.length; i++){
      string += 'new CollisionLine('+data.x[i-1]+','+data.y[i-1]+','+data.x[i]+','+data.y[i]+');\n'
    }
    console.log(string);
    res.send(string);
  });
  app.post('/box', function(req, res){
    var data = JSON.parse(req.body.data);
    data = data.collisionBox;
    var string = '';
    for(var i=0; i<data.length; i++){
      string += 'new CollisionBox('+data[i].x+','+data[i].y+','+data[i].w+');\n'
    }
    console.log(string);
    res.send(string);
  });
}
