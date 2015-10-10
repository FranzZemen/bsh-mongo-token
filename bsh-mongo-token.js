(function () {
    'use strict';

    var log = require('bunyan').createLogger({name: 'bsh-mongo-token', level: 'info'});
    var pool = require('bsh-mongo-pool');
    var collection = 'tokens';

    /**
     * Set the mongo collection name for token storage.  Default is 'tokens'.
     * @param col
     */
    module.exports.collection = function (col) {
        log.warn({before:collection, after:col}, 'Changing mongo collection');
        collection = col;
    };


    /**
     * Supports creation of a token.  Creates a token in the token collection.  The implementation should
     * persist the token and use the timeout parameters to persist the time at which the token will timeout. Typically
     * that would be now + timeout, in milliseconds.
     * @param token The token (alpha numeric, should support size of 1024 although typically it will be 16)
     * @param context A context string used for third party reporting.
     * @param user The user (string).  Typically a username.
     * @param roles An array of strings which are the roles the user is authorized for during the session.
     * @param tokenSessionTimeout The session timeout
     * @param tokenFinalTimeout The overall timeout.
     * @return promise whose success value is the token
     */
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

    /**
     * Support touching of a token, or refreshing its timeout.  Pesisted times at which the session and overall timeout
     * will occur whould be refreshed, typically using now + timeout, in milliseconds.
     * @param token
     * @param tokenSessionTimeout
     * @param tokenFinalTimeout
     * @return promise whose success value is the token
     */
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

    /**
     * Check if a non expired token supports a role.  The implementation should query for the token, the existence of the role
     * (as set by createToken) and that it hasn't expired (now is less than the persisted expirations).  The implementation
     * should allow for an empty, undefined or null role.
     * @param token
     * @param role as a string
     * @return a promise whose success value is the token or null if expired
     */
    module.exports.checkToken = function (token, role) {
        log.trace({token:token, role:role},'checkToken');
        var query = {token: token, expiration: {$gt: Date.now()}, finalExpiration: {$gt: Date.now()}};
        if (role) {
            query.roles = {$all: [role]};
        }
        return pool.db().collection(collection).findOne(query)
            .then(function(tokenData) {
                return tokenData ? tokenData.token : null;
            });
    };

    /**
     * Explicitly delete a token.  Typically would be called if a user logs off and for security reasons, the token
     * should be deleted and not allowed to simply expire.  The implementation should remove or expire the token.
     * @param token
     * @return promise whose success value is true
     */
    module.exports.deleteToken = function (token) {
        log.trace({token:token},'deleteToken');
        return pool.db().collection(collection).deleteOne({token: token})
            .then(function (result) {
                log.trace('deleteToken done');
                return true;
            });
    };

    /**
     * Deletes any expired tokens.  Might be called periodically (such as by bsh-token, if configured for that). The
     * implementation should delete all expired tokens.
     * @return promise whose success value is true
     */
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
