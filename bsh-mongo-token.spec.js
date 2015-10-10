var should = require('should');
var bshPool = require('bsh-mongo-pool');
var bshToken;
beforeEach(function() {
    return bshPool.init('mongodb://localhost/tokenTest')
        .then(function(result) {
            bshToken = require('./bsh-mongo-token');
        });
});

describe('BSH Token Tests', function () {
    it('should create a token', function () {
        return bshToken.createToken('test','someUser',['all']);
    });
    it ('should report cleanup not started', function () {
        return bshToken.cleanup().should.be.false;
    });
    it ('should start a cleanup', function () {
        bshToken.cleanup(1);
    });
});