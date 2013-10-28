'use strict';

var core = require('./core'),
    util = require('./util'),

    Nil = core.Nil,
    TraitsClassFactory = core.TraitsClassFactory,

    toArray = util.toArray,
    tail = util.tail;


var Class = {
    create: function () {
        return Nil.extend.apply(Nil, arguments);
    }
};

function subclassOf( Parent ) {
    return Nil.extend.apply(Parent, tail(arguments));
}

function include() {
    return new TraitsClassFactory(toArray(arguments));
}

function createClass() {
    return Class.create.apply(Class, arguments);
}


module.exports = {
    Class: Class,
    subclassOf: subclassOf,
    include: include,
    createClass: createClass
};

