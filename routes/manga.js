var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var Promise = require('promise');
var async = require('async');
var models = require('./model');


var baseUrl = "http://bato.to";
//baseUrl + /comic/_/comics/shoulder-tacke-yasuzaki-man-r12807

function getMangaIdFromString(link){
    return link.substring(link.lastIndexOf('-')+1);
}

exports.fetchUpdates = function (req, res) {

    var pageLink;
    if (!req.query.page || req.query.page === 1) 
        pageLink = baseUrl;
    else {
        //allows paging to the request
        pageLink = util.format(baseUrl + '?p=%d', req.query.page);
    }

    setOptions(req, pageLink, 'GET').then(requestp).then(function(data) {


        var $ = cheerio.load(data.toString());

        var mpis = [];
        var mpi;
        $('.ipb_table tr[class!=header]').each(function(i, element) {

            var self = $(this);
            if ($(this).find('td').length == 2) {
                //used to ignore the first blank row
                if (mpi !== undefined)
                    mpis.push(mpi);

                mpi = {};
                mpi.chapters = [];
                //gets the image element
                var image = $(this).find('img').first();
                mpi.imageLink = image.attr('src');
                mpi.link = image.parent().attr('href');
                mpi.title = $(this).find('td a').last().text();
                mpi.mangaId = getMangaIdFromString(mpi.link);

            } else {

                var chapter = {};
                var info = $(this).find('td a').first();

                chapter.title = info.text();
                chapter.link = info.attr('href');

                chapter.language = self.find('td div').attr('title');

                var groupInfo = self.find('td a').last();

                chapter.group = groupInfo.text();
                chapter.groupLink = groupInfo.attr('href');


                chapter.updateTime = $(this).find('td').last().text().trim();

                //adds this chapter to the manga preview item
                mpi.chapters.push(chapter);
            }
        });

        res.send(mpis);

    }, function(err) {
        res.send(500, {
            'error': "error connecting to batoto"
        });
        console.error("%s; %s", err.message, url);
        console.log("%j", err.res.statusCode);
    });

};

exports.info = function(req, res) {

    if (!req.query.page) {
        res.send(400, 'Missing paramater page');
        return;
    }

    setOptions(req, req.query.page, 'GET').then(requestp).then(function(data) {

        var $ = cheerio.load(data.toString());
        var manga = {};

        manga.title = $('.ipsType_pagetitle').first().text().trim();
        manga.link = req.query.page;
        manga.mangaId = getMangaIdFromString(manga.link);

        var infoTable = $('.ipsBox').first();
        manga.image = infoTable.find('img').first().attr('src');


        //if the user is signed in, show if the user is currently following the manga.js or not
        var followingSection = $('div.__like.right a').first();
        if (followingSection.length > 0) {
            manga.following = followingSection.text().indexOf('Unfollow') !== -1;
            // gets the amount of people that are following the manga
            manga.followers = $('div.__like.right strong').first().text(); 
        }

        manga.mature = infoTable.children('div').last().text();

        //collectes the manga.js information from the table
        $('.ipb_table').first().find('tr').each(function(i, element) {

            var tableData = $(this).find('td').last().text();
            switch (i) {

                case 0:
                    manga.altNames = tableData;
                    break;
                case 1:
                    manga.author = tableData;
                    break;
                case 2:
                    manga.artist = tableData;
                    break;
                case 3:
                    manga.genre = tableData;
                    break;
                case 4:
                    manga.mangaType = tableData;
                    break;
                case 5:
                    manga.status = tableData;
                    break;
                case 6:
                    manga.summary = tableData;
                    break;
            }
        });


        var chapters = [];

        //collects the chapters
        $('.chapters_list tr[class!=header]').each(function(i, element) {

            var chapter = new Object();

            $(this).find('td').each(function(i, element) {

                switch (i) {

                    case 0:
                        var title = $(this).find('a').first();
                        chapter.title = title.text();
                        chapter.link = title.attr('href');
                        break;
                    case 1:
                        chapter.language = $(this).find('div').first().attr('title');
                        break;
                    case 2:
                        var group = $(this).find('a').first();
                        chapter.group = group.text();
                        chapter.groupLink = group.attr('href');
                        break;
                    case 3:
                        var uploader = $(this).find('a').first();
                        chapter.uploader = uploader.text();
                        chapter.uploaderLink = uploader.attr('href');
                        break;
                    case 4:
                        chapter.updateTime = $(this).text().trim();
                        break;
                }

            });

            if ($(this).attr('id') !== 'no_chap_avl' && chapter.updateTime !== undefined)
                chapters.push(chapter);

        });

        manga.chapters = chapters;

        res.send(manga);


    }, function(error) {
        res.send(500, {
            'error': "error connecting to batoto"
        });
        console.error("%s; %s", err.message, url);
        console.log("%j", err.res.statusCode);
    });
};

exports.follows = function(req, res) {


    var pageLink = '';

    if (!req.query.page || req.query.page === 1)
        pageLink = baseUrl + '/myfollows';
    else {
        pageLink = util.format(baseUrl + '/myfollows?p=%d', req.query.page);
    }

    setOptions(req, pageLink, 'GET').then(requestp).then(function(data) {

        var $ = cheerio.load(data);

        var mpis = [];

        $('.ipb_table tr[class!=header]').each(function(i, element) {

            var mpi = {};
            mpi.chapters = [];
            var chapter = {};
            $(this).find('td').each(function(e, el) {

                switch (e) {
                    case 1:
                        var title = $(this).find('a').first();
                        mpi.title = title.text();
                        mpi.link = title.attr('href');
                        mpi.mangaId = getMangaIdFromString(mpi.link);

                        var chapterTitle = $(this).find('a').last();
                        chapter.title = chapterTitle.text();
                        chapter.link = chapterTitle.attr('href');

                        break;
                    case 2:
                        chapter.language = $(this).find('div').first().attr('title');
                        break;
                    case 3:
                        var groupTitle = $(this).find('a').first();
                        chapter.group = groupTitle.text();
                        chapter.groupLink = groupTitle.attr('href');
                        break;
                    case 4:
                        chapter.updateTime = $(this).text();
                        break;
                }

            });

            mpi.chapters.push(chapter);
            mpis.push(mpi);
            chapter = {};


        });
        res.send(mpis);

    }, function(error) {
        res.send(500, {
            'error': "error connecting to batoto"
        });
        console.error("%s; %s", err.message, url);
        console.log("%j", err.res.statusCode);
    });
};

exports.listFollows = function(req, res){

    var pageLink = baseUrl + '/myfollows';

    setOptions(req, pageLink, 'GET').then(requestp).then(function(data) {

        console.log('Got page');
        var $ = cheerio.load(data);

        var mpis = [];

        var firstElement = null;

        $('div a[href^="/comic/_/comics/"]').each(function(i, element){
           if (firstElement === null && $(this).text()){
                var manga = {};
                manga.id = getMangaIdFromString($(this).attr('href'));
                manga.link = baseUrl + $(this).attr('href');
                manga.title = $(this).text();


                mpis.push(manga);

           }
        });

       

        // console.log(firstElement);


        res.send(mpis);

    }, function(error) {
        res.send(500, {
            'error': "error connecting to batoto"
        });
        console.error("%s; %s", err.message, url);
        console.log("%j", err.res.statusCode);
    });
}

exports.search = function(req, res) {

    var term = req.query.term;
    var url = util.format(baseUrl + '/search?name=%s&name_cond=c&dosubmit=Search', term);

    setOptions(req, url, 'GET').then(requestp).then(function(data) {

        var $ = cheerio.load(data);

        var results = [];
        $('.chapters_list tr[class!=header]').each(function(i, element) {

            if ($(this).find('td').length !== 1) {

                var result = {};

                var title = $(this).find('strong a').first();

                result.title = title.text();
                result.link = title.attr('href');
                result.mangaId = getMangaIdFromString(result.link);

                if (result.title !== "")
                    results.push(result);
            }

        });

        res.send(results);

    }, function(error) {
        res.send(500, {
            'error': "error connecting to batoto"
        });
        console.error("%s; %s", err.message, url);
        console.log("%j", err.res.statusCode);
    });

};

exports.pages = function(req, res) {

    if (!req.query.page) {
        res.status(400);
        res.send('Missing paramater page');
        return;
    }

    var Chapter = models.chapterModel;
    var query = Chapter.findOne({
        'link': req.query.page
    });

    query.select('pages link');
    query.exec().then(function(chapter) {

        if (chapter !== null && chapter !== undefined) {
            res.send(chapter.pages);
            return Promise.done(); //ends the promise tree
        } else {
            console.log('Not in databse');
            return setOptions(req, req.query.page, 'GET');
        }

    }, function(error) {

        console.log(error);
        if (error !== 'stop')
            return setOptions(req, req.query.page, 'GET');

    }).then(requestp).then(function(data) {


        console.log('got data');
        var $ = cheerio.load(data);

        var numberOfPages = $('#page_select').first().find('option').length;

        var title = $('head title').text();

        var images = [];

        if (!numberOfPages) { //webtoon mode or occurs when the there are currently no pages in the chapter

            var chapter_select = $('select[name=chapter_select]').first();

            //this occurs when the manga page does not exist
            //for example this occurs when the link exist but the manga is put on hold
            if (chapter_select.html() === null) {
                res.send(500, 'This sometimes occurs when a recetly added manga does not have any pages in the reader. I would try again later');
                return;
            }

            console.log('webtoon');
            $('img').filter(function(i, el) {
                return $(this).attr('alt') === title;
            }).each(function(i, el) {
                images.push($(this).attr('src'));
            });

            res.send(images);
        } else { //manga.js mode

            res.set('Etag', 'stream');
            res.write('', 'utf-8'); //just to send a response to the client

            var imageLink = $('#comic_page').attr('src');
            images.push(imageLink);

            var mangaAll = $('.moderation_bar ul li a').first();
            var link = mangaAll.attr('href');
            var mId = link.substr(link.lastIndexOf('r'));
            var mName = mangaAll.text();

            var promises = [];
            $('#page_select').first().find('option').each(function(e, el) {
                var url = $(this).val();
                var func = makePageFunction(url, res, e + 1);
                promises.push(func);
            });

            //inital response indicating the amount of pages
            var p = {
                page: promises.length,
                link: 'start'
            };
            res.write(JSON.stringify(p) + '\n');

            async.parallelLimit(promises, 4, function(err, results) {
            // async.series(promises, function(err, results){

                if (err === undefined) {
                    //need to check if the manga exist and if the chapter exist
                    var Manga = models.mangaModel;
                    Manga.findOne({
                        'mangaId': mId
                    }).exec(function(err, manga) {
                        if (manga === null) {
                            manga = new Manga({
                                mangaId: mId,
                                mangaName: mName
                            });
                            manga.save();
                        }

                        var chpr = new Chapter({
                            link: req.query.page,
                            pages: results,
                            manga: manga._id
                        });

                        chpr.save();
                        res.end();
                    });
                } else {
                    console.log(err);
                    res.end();
                }

            });

        }
    });
};

function setOptions(req, url, method) {

    var cookies;
    if (req !== null) {

        cookies = req.headers.cookie;
    } else {
        cookies = stringCookies;
    }
    var options = {
        uri: url,
        method: method,
        headers: {
            'content-type': 'text/html',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'accept-encoding': "gzip,deflate",
            'Connection': 'keep-alive',
            'Cookie': cookies
        }
    };

    return Promise.resolve(options);
}

function requestp(options) {
    return new Promise(function(resolve, reject) {
        var req = request(options);
        req.on('response', function(res) {
            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        resolve(decoded.toString());
                    });
                } else if (encoding == 'deflate') {
                    zlib.inflate(buffer, function(err, decoded) {
                        resolve(decoded.toString());
                    });
                } else {
                    resolve(buffer.toString());
                }
            });
        });
    });
}

function makePageFunction(url, response, page) {

    return function(callback) {
        var resp = response;
        var req = request({
            url: url
        });
        req.on('response', function(res) {

            var chunks = [];
            res.on('data', function(chunk) {
                chunks.push(chunk);
            });

            res.on('end', function() {
                var buffer = Buffer.concat(chunks);
                var encoding = res.headers['content-encoding'];
                if (encoding == 'gzip') {
                    zlib.gunzip(buffer, function(err, decoded) {
                        var image = findImage(decoded.toString());
                        handleImage(image, resp, page, callback);
                    });
                } else {
                    var image = findImage(buffer.toString());
                    handleImage(image, resp, page, callback);
                }
            });
        });
    };
}

function findImage(html) {
    var $ = cheerio.load(html);
    var image = $('#comic_page').attr('src');
    return image;
}

function handleImage(image, resp, page, callback) {


    console.log(image);

    if (image === undefined) {
        resp.write(JSON.stringify({
            page: page,
            link: 'failed'
        }) + '\n');

        callback(new Error("Failed to get an image"), null);
        return;
    }

    resp.write(JSON.stringify({
        page: page,
        link: image
    }) + '\n');


    callback(null, image);
}