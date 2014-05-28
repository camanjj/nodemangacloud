var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var ChapterSchema = new Schema({

    link: {
        type: String,
        index: true
    },
    pages: [String],
    manga: {
        type: Schema.ObjectId,
        ref: 'Manga'
    },
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }

});

var MangaSchema = new Schema({
    mangaId: {
        type: String,
        index: true
    },
    mangaName: String,
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
});

var NewsSchema = new Schema({
    title: String,
    message: String,
    status: String,
    createdAt: {
        type: Date,
        default: Date.now()
    },
    updatedAt: {
        type: Date,
        default: Date.now()
    }
});

exports.chapterModel = mongoose.model('Chapter', ChapterSchema);
exports.mangaModel = mongoose.model('Manga', MangaSchema);
exports.newsModel = mongoose.model('News', NewsSchema);