/**
 * Created by cameronjackson on 5/18/14.
 */
var models = require('./model');
var Promise = require('promise');
var Nightmare = require('nightmare');



// var nightmare = Nightmare();
// Promise.resolve(nightmare
//   .goto('http://bato.to/reader#ab254c955fbaddb3')
//   .wait(3000)
//   .evaluate(function() {

//     // var numberOfPages = jQuery('#page_select').first().find('option').length;
//     // var title = document.title;

//     if (false) {
//       var images = [];
//       jQuery('img').filter(function(i, el) {
//             return jQuery(this).attr('alt') === title;
//         }).each(function(i, el) {
//             images.push(jQuery(this).attr('src'));
//         });

//         return images;
//     } else {

//       return document.querySelector("#comic_page").src;
//     }

//     // return document.querySelector("#comic_page").src;
//   }
// )).then(function(html) {
//     console.log("result", html);
//     return nightmare.end();
// }).then(function(result) {

// }, function(err) {
//    console.log(err); // notice that `throw`ing in here doesn't work
// });



exports.createNews = function(request, response) {


    //stop people from creating news with a secret key
    if (request.body.key !== 'XttygSrvcWEnc4sJXr') {
        response.send(500, 'Need key');
        return;
    }

    var News = models.newsModel;
    var object = request.body;
    var news = new News({
        title: object.title,
        message: object.message,
        status: object.status,
        version: object.version
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

    //stop people from accessing the news with a secret key
    if (request.body.key !== 'XttygSrvcWEnc4sJXr') {
        response.send(500, 'Need key');
        return;
    }

    var objectId = request.body.id;
    var newMessage = request.body.message;
    // console.log(newMessage); //debug point

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

    if (request.query.version === 'beta') {} else
        query.where('version').ne('beta');

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

    //query to find any 'URGENT' news that was made after the date passed
    var query = News
        .findOne({})
        .where('status').equals('Urgent')
        .where('createdAt').gt(date);

    if (request.query.version === 'beta') {} else
        query.where('version').ne('beta');

    query.exec(function(error, model) {

        if (error || !model) {
            response.send(204, {});
        } else {
            response.send(model);
        }

    });
};