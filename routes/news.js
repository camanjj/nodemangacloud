/**
 * Created by cameronjackson on 5/18/14.
 */
var models = require('./model');
var Promise = require('promise');

exports.createNews = function(request, response){

    if(request.body.key !== 'XttygSrvcWEnc4sJXr'){
        response.send(500, 'Need key')
        return;
    }

    var News = models.newsModel;
    var object = request.body;
    var news = new News({title:object.title, message:object.message});
    news.save(function(err, object, affectedCount){
        if(err == null){
            response.send(200, 'succcess');
        } else {
            response.send(500, err);
        }
    });

};

exports.fetchNews = function(request, response){

    var News = models.newsModel;

    var query = News.find({})
        .sort('-createdAt')
        .select('title message createdAt updatedAt')
        .limit(10);

    query.exec().then(function(news){
        response.send(news);
    }, function(error){
        response.send(500, error);
    });
};