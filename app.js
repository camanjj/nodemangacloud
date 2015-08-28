require('newrelic'); //sends data to new relic
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');

var manga = require('./routes/mangaList');
var info = require('./routes/info');
var test = require('./routes/manga');
var news = require('./routes/news');



var http = require('http');
var path = require('path');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var serveStatic = require('serve-static');
var mongoose = require('mongoose');


var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(morgan('short'));
app.use(require('method-override')());
//app.use(express.favicon());
//app.use(app.router);
//app.use(express.static(path.join(__dirname, 'public')));

var DATABASE_URL = process.env.MONGO_URL;

// development only
if (DATABASE_URL == null || DATABASE_URL == '') {
    DATABASE_URL = 'mongodb://127.0.0.1:27017';
    app.use(require('errorhandler')());
}


// app.get('/', routes.index);
app.get('/', test.fetchUpdates);
//app.get('/users', user.list);

app.get('/read', manga.read);
//app.get('/updates', manga.updates);
//app.get('/info', manga.info);


app.post('/login', manga.login);
app.post('/follow', test.follow);
//app.get('/follows', manga.follows);

//app.post('/search', manga.search);

app.get('/version', info.version);
app.get('/message', info.message);


app.get('/updates', test.fetchUpdates);
app.get('/info', test.info);
app.get('/follows', test.follows);
app.get('/all/follows', test.listFollows);
app.get('/search', test.search);
app.get('/pages', test.pages);


//for news
app.get('/news', news.fetchNews);
app.post('/news', news.createNews);
app.post('/news/edit', news.editNews);
app.post('/news/urgent', news.newsSince);


http.createServer(app).listen(app.get('port'), function() {


    mongoose.connect(DATABASE_URL, function(err, res) {
        if (err) {
            console.log('ERROR connecting:' + err);
        } else {
            console.log('Succeeded connected');
        }
    });
    var db = mongoose.connection;
    db.on('error', function(error) {
        console.log(error);
    });


    console.log('Express server listening on port ' + app.get('port'));

});