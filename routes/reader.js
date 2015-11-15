var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var Promise = require('promise');
var async = require('async');
var models = require('./model');
var sugar = require('sugar');
var phantom = require('phantom')

var helper = require('./helper');
var Nightmare = require('nightmare');
var vo = require('vo');



function GetFirstPage(req, res) {


  console.log('Get First Page');
  console.log(req.query.page)

  var nightmare = Nightmare();
  return Promise.resolve(nightmare
    .goto(req.query.page)
    .wait(5000)
    .evaluate(function() {

        var numberOfPages = document.getElementById('page_select')
        var title = document.title;

        if (!numberOfPages) {
            var images = [];


            var tags = document.querySelectorAll("img[alt=\"" + title + "\"]")
            var tag
            for (var i = 0; i < tags.length; i++) {
                images.push(tags[i].src);
            }

            return images;
        } else {
            // $('#page_select').first().find('option').length;
            return {page: document.querySelector("#comic_page").src, count: numberOfPages.options.length};
        }

    })).then(function(html) {
        console.log(html)
        nightmare.end();
        return html;
    })

} 


exports.pages = function(req, res) {

    if (!req.query.page) {
        res.status(400);
        res.send('Missing paramater page');
        return;
    }

    // this is the format for the url to get the html for the first page
    // http://bato.to/areader?id=ab254c955fbaddb3&p=1


    var Manga = models.mangaModel;
    var query = Manga.findOne({
        'link': req.query.page
    });
    query.select('pages link');

    //Check if the chapter is already saved in the database
    query.exec().then(function(chapter) {

        if (chapter !== null && chapter !== undefined) {
            res.send(chapter.pages);
            return Promise.done(); //ends the promise tree
        } else {
            console.log('Not in databse');
            return GetFirstPage(req, res);
        }

    }, function(error) {

        console.log(error);
        if (error !== 'stop')
            return helper.setOptions(req, req.query.page, 'GET');

    }).then(function(data) {



        var images = [];

        if (data instanceof Array) { //webtoon mode or occurs when the there are currently no pages in the chapter

            // var chapter_select = $('select[name=chapter_select]').first();

            // //this occurs when the manga page does not exist
            // //for example this occurs when the link exist but the manga is put on hold
            // if (chapter_select.html() === null) {
            //     res.send(500, 'This sometimes occurs when a recetly added manga does not have any pages in the reader. I would try again later');
            //     return;
            // }

            console.log("Webtoon")
            console.log(data)

            images = data;
            res.send(images);
        } else { //manga.js mode


            var imageLink = data.page;

            res.set('Etag', 'stream');
            res.write('', 'utf-8'); //just to send a response to the client

            if (imageLink.indexOf('img0000') != -1) { //new manga.js

                console.log("New Manga");

                var numberOfPages = data.count;

                var p = {
                    page: numberOfPages,
                    link: 'start'
                };
                res.write(JSON.stringify(p) + '\n');

                //get the prefix and suffix of the image url
                var prefix = imageLink.substring(0, imageLink.lastIndexOf('img') + 3);
                var suffix = imageLink.substring(imageLink.lastIndexOf('.'));
                for (var i = 1; i <= numberOfPages; i++) {
                    var page = numeral(i * .000001).format('.000000')
                    page = page.substring(1);

                    link = (prefix + page + suffix);

                    res.write(JSON.stringify({
                        page: i,
                        link: link
                    }) + '\n');

                }
                // response.send(images);
                res.end()
                return




            } else {


                // Old manga page

                

                images.push(imageLink);

                var mangaAll = $('.moderation_bar ul li a').first();
                var link = mangaAll.attr('href');
                var mId = link.substr(link.lastIndexOf('r'));
                var mName = mangaAll.text();

                var promises = [];
                $('#page_select').first().find('option').each(function(e, el) {
                    var url = $(this).val();
                    var func = helper.makePageFunction(url, res, e + 1);
                    promises.push(func);
                });

                //inital response indicating the amount of pages
                var p = {
                    page: promises.length,
                    link: 'start'
                };
                res.write(JSON.stringify(p) + '\n');

                // get the pages asynchronisly 4 at a time
                async.parallelLimit(promises, 4, function(err, results) {

                    if (err === undefined) {

                        // Add the manga to the databse if there was no error

                        var manga = new Manga({
                            mangaId: mId,
                            mangaName: mName,
                            link: req.query.page,
                            pages: results
                        });

                        manga.save();

                        //end the response
                        res.end();

                    } else {
                        // There was an error getting the manga pages
                        console.log(err);
                        res.end();
                    }

                });
            }

        }
    });
};
