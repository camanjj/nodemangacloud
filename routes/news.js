/**
 * Created by cameronjackson on 5/18/14.
 */
var models = require('./model');
var Promise = require('promise');
var moment = require('moment');


exports.createNews = function(request, response) {

    if (request.body.key !== 'XttygSrvcWEnc4sJXr') {
        response.send(500, 'Need key');
        return;
    }

    var News = models.newsModel;
    var object = request.body;
    var news = new News({
        title: object.title,
        message: object.message,
        status: object.status
    });


    news.save(function(err, object, affectedCount) {
        if (!err) {
            response.send(200);
        } else {
            response.send(500, err);
        }
    });

};

exports.editNews = function(request, response) {

    var News = models.newsModel;

    if (request.body.key !== 'XttygSrvcWEnc4sJXr') {
        response.send(500, 'Need key');
        return;
    }

    var objectId = request.body.id;
    var newMessage = request.body.message;
    console.log(newMessage);

    News.update({
            _id: objectId
        }, {
            $set: {
                message: newMessage,
                updatedAt: Date.now()
            }
        },
        function(err, model) {
            if (err) {
                response.send(500, err);
                return;
            }

            response.send(200, 'OK');

        });

};

exports.fetchNews = function(request, response) {

    var News = models.newsModel;

    var query = News.find({})
        .sort('-createdAt')
        .select('title message createdAt status')
        .limit(10);

    query.exec().then(function(news) {
        response.send(news);
    }, function(error) {
        response.send(500, error);
    });
};

exports.newsSince = function(request, response) {

    var News = models.newsModel;

    //gets the date from the request
    var date = new Date(request.body.date);

    console.log(date);

    //query to find any 'URGENT' news that was made after the date passed
    News
        .findOne({})
        .where('status').equals('Urgent')
        .where('createdAt').gt(date)
        .exec(function(error, model) {

            if (error || !model) {
                response.send(204, {});
            } else {
                response.send(model);
            }

        });
};