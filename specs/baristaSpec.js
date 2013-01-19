var expect = require('chai').expect,
    barista = require('../src/barista');

describe('Barista', function () {

    'use strict';

    var extend = barista.extend,
        merge = barista.merge,
        mergeConflict = barista.mergeConflict,
        subclassResponsibility = barista.subclassResponsibility,
        Nil = barista.Nil,
        Class = barista.Class,
        AbstractClassFactory = barista.AbstractClassFactory,
        isClassFactory = barista.isClassFactory,
        withTraits = barista.withTraits;


    describe('merge', function () {

        it('merges given properties into a new object', function () {

            var one = { one: 'prop from one' },
                two = { two: 'prop from two' },
                result = merge(one, two);

            expect(result).to.not.equal(one);
            expect(result).to.not.equal(two);
            expect(result.one).to.equal(one.one);
            expect(result.two).to.equal(two.two);

        });

        it('marks conflicting properties', function () {

            var result = merge({ prop: 'prop from one' }, { prop: 'prop from two' });

            expect(result.prop).to.equal(mergeConflict);

        });

        it('accepts properties that has the same value', function () {

            var prop = 'value',
                result = merge({ prop: prop }, { prop: prop });

            expect(result.prop).to.equal(prop);

        });

    });


    describe('mergeConflict', function () {

        it('throws an error when executed', function () {

            expect(mergeConflict).to.throw(Error);

        });

    });

    describe('subclassResponsibility', function () {

        it('throws an error when executed', function () {

            expect(subclassResponsibility).to.throw(Error);

        });

    });

    describe('Nil', function () {

        it('has a __super__ property that returns itself', function () {

            expect(Nil.__super__).to.equal(Nil.prototype);

        });

        it('provides a _super function', function () {

            var SubNil = function () {};
            SubNil.prototype = new Nil();

            var anInstance = new SubNil();

            expect(anInstance._super()).to.equal(Nil.prototype);

        });

    });


    describe('Class', function () {

        describe('create', function () {

            it('returns a constructor function', function () {

                expect(Class.create()).to.be.a('function');

            });

            it('returns a function with prototype.constructor referencing to itself', function () {

                var NewClass = Class.create();

                expect(NewClass.prototype.constructor).to.equal(NewClass);

            });

            it('can describe object properties', function () {

                var Point = Class.create({ x: 10 }),
                    aPoint = new Point();

                expect(aPoint.x).to.equal(10);

            });

            it('can specify an object constructor', function () {

                var Point = Class.create({
                        constructor: function ( x ) {
                            this.x = x;
                        }}),
                    aPoint = new Point(12);

                expect(aPoint.x).to.equal(12);

            });

            it('returns classes that can be extended', function () {

                var Widget = Class.create({ render: 'Widget.render' }),
                    MyWidget = Widget.extend(),
                    aWidget = new MyWidget();

                expect(aWidget.render).to.equal('Widget.render');

            });

            it('uses Nil as the parent class', function () {

                expect(Class.create().__super__).to.equal(Nil.prototype);

            });

            it('accepts the specification of "static" properties as an argument', function () {

                var MyClass = Class.create({}, {staticProp: 'hello'});

                expect(MyClass.staticProp).to.equal('hello');

            });

            it('accepts a "class factory" as an argument', function () {

                var TestFactory = AbstractClassFactory.extend({

                        createClass: function ( Parent, instanceMethods, staticMethods ) {

                            return 'From ClassFactory';

                        }

                    }),

                    createdClass = Class.create(new TestFactory(), {hello: 'world'});

                expect(createdClass).to.equal('From ClassFactory');

            });

            it('gives the proper arguments to the "class factory"', function () {

                var TestFactory = AbstractClassFactory.extend({

                        createClass: function ( Parent, instanceMethods, staticMethods ) {

                            return {parent: Parent, instanceMethods: instanceMethods, staticMethods: staticMethods};

                        }

                    }),

                    createdClass = Class.create(new TestFactory(), {hello: 'world'}, {foo: 'bar'});

                expect(createdClass.staticMethods).to.deep.equal({foo: 'bar'});
                expect(createdClass.instanceMethods).to.deep.equal({hello: 'world'});
                expect(createdClass.parent).to.equal(Nil);

            });

        });


        describe('extend', function () {

            it('overrides super class properties with subclass properties', function () {

                var Widget = Class.create({ render: 'Super RENDER'  }),
                    CustomWidget = Widget.extend({ render: 'Custom RENDER'}),

                    aWidget = new CustomWidget();

                expect(aWidget.render).to.equal('Custom RENDER');

            });

            it('supports getPrototypeOf to do super delegation', function () {

                var Widget = Class.create({ render: 'SUPER' }),

                    CustomWidget = Widget.extend({
                        render: function () {

                            var parent = Object.getPrototypeOf(Object.getPrototypeOf(this));
                            return 'Custom ' + parent.render;

                        }
                    });

                expect((new CustomWidget()).render()).to.equal('Custom SUPER');

            });

            it('adds the _super method even if the parent does not have it', function () {

                var Parent = function () {};

                Parent.extend = Nil.extend;

                var SubClass = Parent.extend(),
                    anInstance = new SubClass();

                expect(Parent.prototype.extend).to.be.undefined;
                expect(anInstance._super()).to.equal(Parent.prototype);

            });

        });
    });

    describe('_super method', function () {

        var Widget = Class.create({
                value: 987,

                render: function () {
                    return 'SUPER ' + this.x;
                }
            }),

            CustomWidget = Widget.extend({x: 123}),

            aWidget = new CustomWidget();


        it('returns __super__ when no argument is given', function () {

            expect(aWidget._super()).to.equal(CustomWidget.__super__);

        });

        it('returns a function bound to this when the method name is given', function () {

            expect(aWidget._super('render')()).to.equal('SUPER 123');

        });

        it('throws ReferenceError when a invalid method name is given', function () {

            expect(function () {
                aWidget._super('bla');
            }).to.throw(ReferenceError);

        });

        it('works with non-function properties too', function () {

            expect(aWidget._super('value')).to.equal(987);

        });

    });

    describe('withTraits', function () {

        it('returns an instance of a class factory', function () {

            expect(isClassFactory(withTraits())).to.be.true;

        });

        it('gives precedence to class properties over trait properties', function () {

            var templateRendering = {
                    other: 'hello',
                    render: 'from trait'
                },

                View = Class.create(
                    withTraits(templateRendering), {
                        render: 'from subclass'
                    }),

                aView = new View();

            expect(aView.render).to.equal('from subclass');
            expect(aView.other).to.equal('hello');

        });

        it('gives precedence to trait properties over super class properties', function () {

            var BaseView = Class.create({
                    render: 'base'
                }),

                testTrait = {
                    render: 'trait'
                },

                View = BaseView.extend(withTraits(testTrait)),

                aView = new View();

            expect(aView.render).to.equal('trait');

        });

        it('preserves the prototype chain', function () {

            var BaseView = Class.create({
                    render: 'base'
                }),

                testTrait = {
                    render: 'trait'
                },

                View = BaseView.extend(withTraits(testTrait));

            expect(Object.getPrototypeOf(View.prototype)).to.equal(BaseView.prototype);

        });

        it('marks conflicting trait methods', function () {

            var templateTrait = {
                    render: function () {
                        return 'template';
                    }
                },
                compositeTrait = {
                    render: function () {
                        return 'composite';
                    }
                },

                MyView = Class.create(withTraits(templateTrait, compositeTrait)),

                aView = new MyView();

            expect(function () {
                aView.render();
            }).to.throw(Error, 'This property was defined by multiple merged objects, override it with the proper implementation');

        });

        it('allows a trait to include another trait', function () {

            var helloTrait = {
                    hello: function () { return 'hello world'; }
                },

                otherTrait = {
                    other: 'hi'
                },

                viewTrait = extend(
                    merge(helloTrait, otherTrait), {
                        render: function () {
                            return 'view';
                        }
                    }) ,

                MyView = Class.create(withTraits(viewTrait)),

                aView = new MyView();

            expect(aView.hello()).to.equal('hello world');
            expect(aView.other).to.equal('hi');
            expect(aView.render()).to.equal('view');

        });

        it('can specify aliases to trait methods', function () {

            var templateTrait = {
                    render: function () {
                        return 'template';
                    }
                },
                compositeTrait = {
                    render: function () { return 'composite'; }
                },

                MyView = Class.create(
                    withTraits(templateTrait, compositeTrait), {
                        render: templateTrait.render
                    }),

                aView = new MyView();

            expect(aView.render()).to.equal('template');

        });

    });
});
