var chai = require('chai'),
    should = chai.should(),
    expect = chai.expect,
    _ = require('underscore'),
    testRunner = require('..').TestRunner.setup();

var C = {};


describe('js.data.Entity', function () {

    var EntityClass;

    before(function (done) {
        testRunner.requireClasses({
            Entity: 'js/data/Entity',
            List: 'js/core/List'
        }, C, done);

        EntityClass = C.Entity.inherit('app.entity.Entity', {
            schema: {
                name: String
            }
        });
    });

    describe('#validate', function () {

        it('should validate required fields', function () {
            var entity = new EntityClass();

            entity.validate({}, function (err) {
                expect(err).not.to.exist;
                expect(entity.isValid()).to.be.equal(false);
                expect(entity.fieldError('name')).to.exist;
            });
        });

        it('should validate the types of the attributes', function () {
            EntityClass = C.Entity.inherit('app.entity.Entity', {
                schema: {
                    name: String,
                    isMale: Boolean,
                    birthDate: Date,
                    age: Number,
                    subEntity: C.Entity
                }
            });

            var entity = new EntityClass({
                name: 123,
                isMale: "asd",
                birthDate: '123123',
                age: "12",
                subEntity: "asd"
            });

            entity.validate({}, function (err) {
                expect(err).not.to.exist;
                expect(entity.isValid()).to.be.equal(false);
                expect(entity.fieldError('name')).to.exist;
                expect(entity.fieldError('isMale')).to.exist;
                expect(entity.fieldError('birthDate')).to.exist;
                expect(entity.fieldError('age')).to.exist;
                expect(entity.fieldError('subEntity')).to.exist;
            });

        });

        it('should validate sub entity', function(){
            var SubEntityClass = C.Entity.inherit('app.entity.SubEntity', {
                schema: {
                    name: String
                }
            });

            EntityClass = C.Entity.inherit('app.entity.Entity', {
                schema: {
                    name: String,
                    subEntity: SubEntityClass
                }
            });

            var subEntity  = new SubEntityClass({

            });
            var entity = new EntityClass({
                name: "Test",
                subEntity: subEntity
            });

            entity.validate({}, function(err){
                expect(err).not.to.exist;
                expect(entity.isValid()).to.be.equal(false);
                expect(entity.fieldError('name')).not.to.exist;
                expect(entity.fieldError('subEntity')).to.exist;
            });
        });

    });


});