(function () {
    'use strict';

    var log = require('bunyan').createLogger({name: 'token', level: 'trace'});
    var db = require('bsh-mongo-pool').db();
    var uuid = require('uuid');
    var Q = require('q');

    var sessionTimeout = 3600000;
    var finalTimeout = 86400 * 365 * 100 * 1000;
    var interval;
    var deleting;

    /**
     * Set the session timeout in milliseconds.  If this is never called, it is one hour
     * @param timeout
     */
    module.exports.setSessionTimeout = function (timeout) {
        sessionTimeout = timeout;
    };

    /**
     * Set the final timeout in milliseconds.  If this is never called, it is one hundred years.
     * @param timeout
     */
    module.exports.setFinalTimeout = function (timeout) {
        finalTimeout = timeout;
    };

    /**
     * If frequency is not provided, returns truthy if the cleanup was started false otherwise.  The truthy value is the frequency it was started with.
     * If frequency is provided start the token cleanup sequence after and every frequency millis.  If it was already started, it will stop and restart.
     * @param frequency in milliseconds
     * @return false if not started, the frequency if started.
     */
    var truthyFrequency = undefined;
    module.exports.cleanup = function (frequency) {
        if (frequency) {
            log.trace({frequency:frequency},'cleanup');
            if (interval) {
                clearInterval(interval);
            }
            truthyFrequency = frequency;
            interval = setInterval(function () {
                module.exports.deleteExpiredTokens();
            }, truthyFrequency);
            log.trace({truthyFrequency:truthyFrequency},'cleanup started');
            return truthyFrequency;
        } else {
            log.trace({truthyFrequency:truthyFrequency},'cleanup result');
            return interval ? truthyFrequency : false;
        }
    };

    /**
     * Stop the token cleanup sequence
     * @param frequency
     */
    module.exports.stopCleanup = function (frequency) {
        if (interval) {
            clearInterval(interval);
            interval = undefined;
            truthyFrequency = undefined;
        }
    };


    /**
     *
     * @param context Defines the context for which the token is being created
     * @param user A user handle, such as an id.
     * @param roles An array of role names that are allowed by this token
     * @param tokenSessionTimeout optional session timeout for this token only in milliseconds (uses default if not set, see setSessionTimeout)
     * @param tokenFinalTimeout optional final timeout for this token only in milliseconds (uses default if not set, see setFinalTimeout).  If provided tokenSessionTimeout must also be provided.
     * @returns {*|promise} A promise that resolves to the token
     */
    module.exports.createToken = function (context, user, roles, tokenSessionTimeout, tokenFinalTimeout) {
        log.trace({context: context, user: user, roles: roles, tokenSessionTimeout: tokenSessionTimeout, tokenFinalTimeout:tokenFinalTimeout},'createToken');
        tokenSessionTimeout = tokenSessionTimeout || sessionTimeout;
        tokenFinalTimeout = tokenFinalTimeout || finalTimeout;
        var buffer = new Array(16);
        var token = uuid.unparse(uuid.v4(null, buffer));
        var now = Date.now();
        return db.collection('tokens').insertOne({
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
     * Update a token's expiration.  Typically called because a client confirms session activity.
     * @param token
     * @param tokenSessionTimeout optional.  See createToken.
     * @param tokenFinalTimeout optional.  See createToken.
     * @returns {*|promise} A promise that resolves to the token
     */
    module.exports.touchToken = function (token, tokenSessionTimeout, tokenFinalTimeout) {
        log.trace({token:token, tokenSessionTimeout: tokenSessionTimeout, tokenFinalTimeout:tokenFinalTimeout},'touchToken');
        tokenSessionTimeout = tokenSessionTimeout || sessionTimeout;
        tokenFinalTimeout = tokenFinalTimeout || finalTimeout;
        var now = Date.now();

        return db.collection('tokens').updateOne({
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
     * Check to see if there is an unexpired token for a given role
     * @param token The token to check for.
     * @param role The role to check for.  Optional
     * @param touch Touch the token after checking.  If role is provided, optional, otherwise should not be provided.  Defaults to false.
     * @returns {*|promise} A promise that resolves to found or not found.  Does not indicate if expired.
     */
    module.exports.checkToken = function (token, role, touch) {
        log.trace({token:token, role:role, touch:touch},'checkToken');
        role = role || [];
        touch = touch || false;

        var query = {token: token, expiration: {$gt: Date.now()}, finalExpiration: {$gt: Date.now()}, roles :{$all: [role]}};

        return db.collection('tokens').findOne(query)
            .then(function(tokenData) {
                if (tokenData) {
                    if (touch) {
                        return module.exports.touchToken(token);
                    } else {
                        return tokenData.token;
                    }
                } else {
                    return null;
                }
            })
            .then(function(token) {
                var tokenFound = token ? true : false;
                log.trace({tokenFound: tokenFound}, 'checkToken result');
                return tokenFound;
            });
    };
    /**
     * Delete a token.  Only deletes if no other delete operation is in progress.
     * @param token
     * @returns {*|promise} A promise that evaulates to true if delete was run against mongo (whether or not something was deleted).
     */
    module.exports.deleteToken = function (token) {
        if (!deleting) {
            deleting = true;
            return db.collection('tokens').deleteOne({token: token})
                .then(function(result) {
                    deleting = false;
                    return true;
                });
        } else {
            return Q.fcall(function () {return false;});
        }
    };

    /**
     * Delete expired tokens.  Only deletes if no other delete operation is in progress.
     * @returns {*|promise} A promise that evaulates to true if delete was run against mongo (whether or not something was deleted).
     */
    module.exports.deleteExpiredTokens = function () {
        log.trace('deleteExpiredTokens');
        if (!deleting) {
            log.trace('deleteExpiredTokens deleting');
            deleting = true;
            return db.collection('tokens').deleteMany({expiration: {$lt: Date.now()}})
                .then(function (result) {
                    deleting = false;
                    log.trace('deleteExpiredTokens done');
                    return true;
                }, function (err) {
                    log.error(err);
                    throw err;
                });
        } else {
            log.trace('deleteExpiredTokens already deleting, not deleting again');
            return Q.fcall(function () {return false;});
        }
    };
})();
