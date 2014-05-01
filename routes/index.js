
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', { title: 'Manga Loop', message: 'This page is not used. ' +
      'Why are you even on this page? Hmm. Ok, gonna start tracking your IP. (but not really)' });
};