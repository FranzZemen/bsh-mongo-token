(function () {
    'use strict';

    var log = require('bunyan').createLogger({name: 'bsh-mongo-token', level: 'info'});
    var pool = require('bsh-mongo-pool');
    var collection = 'tokens';

    module.exports.collection = function (col) {
        log.warn({before:collection, after:col}, 'Changing mongo collection');
        collection = col;
    };


    module.exports.createToken = function (token, context, user, roles, tokenSessionTimeout, tokenFinalTimeout) {
        log.trace({token: token, context: context, user: user, roles: roles, tokenSessionTimeout: tokenSessionTimeout, tokenFinalTimeout:tokenFinalTimeout},'createToken');
        var now = Date.now();
        return pool.db().collection(collection).insertOne({
            token:token,
            context:context,
            user:user,
            roles:roles,
            created: now,
            updated: now,
            expiration: now + tokenSessionTimeout,
            finalExpiration: now + tokenFinalTimeout
        }).then(function (result) {
            log.trace({result:result, token:token},'createToken result');
            return token;
        });
    };


    module.exports.touchToken = function (token, tokenSessionTimeout, tokenFinalTimeout) {
        log.trace({token:token, tokenSessionTimeout: tokenSessionTimeout, tokenFinalTimeout:tokenFinalTimeout},'touchToken');
        var now = Date.now();
        return pool.db().collection(collection).updateOne({
                token:token
            }, {
                updated: now,
                expiration: now + tokenSessionTimeout,
                finalExpiration: now + tokenFinalTimeout})
            .then(function (result) {
                log.trace({result:result}, 'touchToken result');
                return token;
            });
    };

    module.exports.checkToken = function (token, role) {
        log.trace({token:token, role:role},'checkToken');
        var query = {token: token, expiration: {$gt: Date.now()}, finalExpiration: {$gt: Date.now()}, roles :{$all: [role]}};
        return pool.db().collection(collection).findOne(query)
            .then(function(tokenData) {
                return tokenData ? tokenData.token : null;
            });
    };

    module.exports.deleteToken = function (token) {
        log.trace({token:token},'deleteToken');
        return pool.db().collection(collection).deleteOne({token: token});
    };

    module.exports.deleteExpiredTokens = function () {
        log.trace('deleteExpiredTokens');
        pool.db().collection(collection).deleteMany({expiration: {$lt: Date.now()}})
            .then(function (result) {
                log.trace('deleteExpiredTokens done');
                return true;
            }, function (err) {
                log.error(err);
                throw err;
            });
    };
})();
