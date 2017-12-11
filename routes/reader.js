const cheerio = require('cheerio');
const request = require('request');
const models = require('./model');

const baseUrl = "https://bato.to";

function getMangaPage(pageUrl, cookies) {
    
    let options = (url) => { return {
        url: pageUrl,
        headers: {
            Cookie: cookies,
            Referer: baseUrl+"/reader",
            Host: "bato.to",
            "User-Agent": "Paw/3.1.5 (Macintosh; OS X/10.13.1) GCDHTTPRequest"
        }
    }}

    return new Promise((resolve, reject) => {
        request(options(pageUrl), (err, resp, body) => {
            if (!err)
                resolve(body)
            else
                reject(err);
    
        })
    })
}

exports.pages = function(req, res, callback) {

    const id = req.query.page.split("#")[1];//"ab254c955fbaddb3";
    let pageUrl = baseUrl + "/areader?id="+id+"&p="+1;
    
    getMangaPage(pageUrl, req.headers.cookie).then(body => {

        const $ = cheerio.load(body);
        let pageSelect = $("#page_select");
        let images = [];
        if (pageSelect.length > 0) {
            // manga mode
            console.log("Manga Mode")

            
            let select = pageSelect.first();
            let pageCount = select.children().length
            
            let promises = [[1,$("#comic_page").attr('src')]];
            for (let i = 2; i <= pageCount; i++) {
                let curUrl = baseUrl + "/areader?id="+id+"&p="+i;
                let promise = getMangaPage(curUrl, req.headers.cookie).then(body => {
                    const html = cheerio.load(body);
                    return [i, html("#comic_page").attr('src')];
                })
                promises.push(promise)
            }

            return Promise.all(promises).then(arr => {
                console.log(arr)
                return arr.sort((a,b) => {return a[0]-b[0]}).map(e => e[1]);
            })

        } else {
            // webtoon mode
            $("div[style=\"text-align:center;\"] img").each(function (i, element) {
                images.push($(this).attr('src'))
            })
            return images;
        }

    }).then(images => {
        res.send(images);
    }).catch(err => {
        console.log(err);
        res.sendStatus(400);
    })
} 
