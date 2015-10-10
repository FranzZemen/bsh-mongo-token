var should = require('should');
var bshPool = require('bsh-mongo-pool');
var bshMongoToken = require('./bsh-mongo-token');

beforeEach(function() {
    return bshPool.init('mongodb://localhost/tokenTest');
});

describe('BSH Token Tests', function () {
    it('should create a token', function () {
        return bshMongoToken.createToken('12345','test','someUser',['all']);
    });
});