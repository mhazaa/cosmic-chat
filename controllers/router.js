module.exports = function(app){
  app.get('', function(req, res){
  	var path = require('path');
    res.sendFile(path.resolve('views/index.html'));
  });
  app.get('/home', function(req, res){
  	res.redirect('/');
  });
}
