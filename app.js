require('newrelic');//sends data to new relic
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var manga = require('./routes/mangaList');
var info = require('./routes/info');
var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var morgan  = require('morgan')
var serveStatic = require('serve-static');
var mongoose = require('mongoose');





var test = require('./routes/manga');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser());
app.use(morgan());
app.use(require('body-parser')());
app.use(require('method-override')())
//app.use(express.favicon());
//app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
    app.use(require('errorhandler')());
}


app.get('/', routes.index);
//app.get('/users', user.list);

app.get('/read', manga.read);
//app.get('/updates', manga.updates);
//app.get('/info', manga.info);


app.post('/login', manga.login);
app.post('/follow', manga.follow);
//app.get('/follows', manga.follows);

//app.post('/search', manga.search);

app.get('/version', info.version);
app.get('/message', info.message);


app.get('/updates', test.fetchUpdates);
app.get('/info', test.info);
app.get('/follows', test.follows);
app.get('/search', test.search);
app.get('/pages', test.pages);


http.createServer(app).listen(app.get('port'), function(){
    mongoose.connect('mongodb://camanjj:bankai8998@oceanic.mongohq.com:10097/app22035243', function(err, res){
        if (err) {
            console.log ('ERROR connecting:' + err);
        } else {
            console.log ('Succeeded connected');
        }
    });
    console.log('Express server listening on port ' + app.get('port'));
});
