var cheerio = require('cheerio');
var request = require('request');
var zlib = require('zlib');
var numeral = require('numeral');
var util = require('util');
var Promise = require('promise');
var async = require('async');
var models = require('./model');
var sugar = require('sugar');

var helper = require('./helper');



var baseUrl = "http://bato.to";
//baseUrl + /comic/_/comics/shoulder-tacke-yasuzaki-man-r12807


exports.fetchUpdates = function (req, res) {

    var pageLink;
    if (!req.query.page || req.query.page === 1) 
        pageLink = baseUrl;
    else {
        //allows paging to the request
        pageLink = util.format(baseUrl + '?p=%d', req.query.page);
    }

    helper.setOptions(req, pageLink, 'GET').then(helper.requestp).then(function(data) {

        console.log('scan updates');


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
                mpi.imageLink = mpi.imageLink;//"http://s0ivpv.cloudimage.io/s/crop/320x100/" + helper.getImageFromThumbnail(mpi.imageLink);
                mpi.link = image.parent().attr('href');
                mpi.title = $(this).find('td a').last().text();
                mpi.mangaId = helper.getMangaIdFromString(mpi.link);

            } else {

                var chapter = {};
                var info = $(this).find('td a').first();

                chapter.title = info.text();
                chapter.link = (baseUrl + info.attr('href'));

                chapter.language = self.find('td div').attr('title');

                var groupInfo = self.find('td a').last();

                chapter.group = groupInfo.text();
                chapter.groupLink = groupInfo.attr('href');

                var updateTime = $(this).find('td').last().text().trim();
                updateTime = updateTime.replace("-", "");
                // console.log(updateTime);
                // console.log(Date.create(updateTime))
                chapter.updateTime = updateTime;//Date.create(updateTime);

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

    helper.setOptions(req, req.query.page, 'GET').then(helper.requestp).then(function(data) {

        var $ = cheerio.load(data.toString());
        var manga = {};

        manga.title = $('.ipsType_pagetitle').first().text().trim();
        manga.link = req.query.page;
        manga.mangaId = helper.getMangaIdFromString(manga.link);

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
                    manga.genre = []
                    $(this).find('a span').each(function(i, element){
                        manga.genre.push($(this).text().trim());
                    });
                    // manga.genre = tableData;
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
        $('.chapters_list .chapter_row').each(function(i, element) {

            var chapter = {};

            $(this).find('td').each(function(i, element) {

                switch (i) {

                    case 0:
                        var title = $(this).find('a').first();
                        chapter.title = title.text().trim();
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

    helper.setOptions(req, pageLink, 'GET').then(helper.requestp).then(function(data) {

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
                        mpi.mangaId = helper.getMangaIdFromString(mpi.link);

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

    helper.setOptions(req, pageLink, 'GET').then(helper.requestp).then(function(data) {

        console.log('Got page');
        var $ = cheerio.load(data);

        var mpis = [];

        var firstElement = null;

        $('div a[href^="/comic/_/comics/"]').each(function(i, element){
           if (firstElement === null && $(this).text()){
                var manga = {};
                manga.id = helper.getMangaIdFromString($(this).attr('href'));
                manga.link = baseUrl + $(this).attr('href');
                manga.title = $(this).text();


                mpis.push(manga);

           }
        });


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
    var query = req.originalUrl
    console.log(query)
    var url = util.format(baseUrl + query);

    helper.setOptions(req, url, 'GET').then(helper.requestp).then(function(data) {

        var $ = cheerio.load(data);

        var results = [];
        $('.chapters_list tr[class!=header]').each(function(i, element) {

            if ($(this).find('td').length !== 1) {

                var result = {};

                var title = $(this).find('strong a').first();

                result.title = title.text();
                result.link = title.attr('href');
                result.mangaId = helper.getMangaIdFromString(result.link);

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


/**
 *  follows or unfollows a manga.js
 *  @param {Request} req - request hat has the cookies for credentialing
 *  @property {object} req.headers.cookie -  cookies need for credentialing
 *  @property {object} params.action - follow/unfollow
 *  @property {strng} params.rid - the id for the manga.js
 *  @property {object} params.sKey - the key needed to follow manga.js
 *  @property {object} params.session - the seesion id for the user
 */
exports.follow = function(req, res) {

    var key = req.body.sKey;

    console.log(key)

    
        var action = req.body.action === 'follow' ? 'save' : 'unset';
        var session = req.body.session;
        var rid = (req.body.rid).substr(1);


        //to follow set do equal to save, to unfollow set do equal to unset
        var url = util.format('http://bato.to/forums/index.php?s=%s&&app=core&module=ajax&section=like&do=%s&secure_key=%s&f_app=ccs&f_area=ccs_custom_database_3_records&f_relid=%s', session, action, key, rid);
        helper.setOptions(req, url, 'POST').then(function(options){

            options['form'] = {
                'like_notify': 1,
                'like_freq': 'immediate',
                'like_anon': 0
            };
            
            return helper.requestp(options);

        }).then(function(data) {

            console.log("Got the data")

            //stores the html in a cheerio object
            var $ = cheerio.load(data);
            var text = $('a').first().text();

            var result = {};


            if (action === 'save') {
                //returns bool representing if the follow was a success
                result.success = text === 'Unfollow';
                res.send(result);
            } else {
                //returns bool representing if the unfollow was a success
                result.success = text === 'Follow';
                res.send(result);
            }

        });
};

function getParameterByName(name, url) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(url);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
